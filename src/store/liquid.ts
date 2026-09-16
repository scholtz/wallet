/**
 * Liquid Auth dApp connections (wallet side).
 *
 * A dApp shows a `liquid://<service>/?requestId=<uuid>` link. The user pastes/scans it here,
 * picks the account to expose and approves with a passkey: the wallet registers (or reuses) a
 * FIDO2 credential at the Liquid Auth service with the "liquid" extension — the service's
 * challenge signed by the account key — which links the wallet's session to the dApp's
 * requestId. Both peers then negotiate a WebRTC data channel through the service (see
 * src/shared/liquid.ts) and exchange ARC-0027 messages: ARC-0001 transaction signing and the
 * ARC-0060 data-signing extension (see src/scripts/liquid/protocol.ts and docs/LIQUID_AUTH.md).
 *
 * Requests are stored in the same shape as WalletConnect requests (`StoredRequest` /
 * `StoredSignDataRequest`, with `ver: "liquid"` and `topic` = requestId) so the Connect page
 * renders them with the same components.
 */
import algosdk from "algosdk";
import type { ActionTree, MutationTree } from "vuex";
import type { RootState } from "./index";
import type { StoredRequest, StoredSignDataRequest } from "./wc";
import liquidPeers, { type LiquidRuntimeStatus } from "../shared/liquid";
import {
  decodeArc60Items,
  decodeBase64Flexible,
  decodeSignTxnTransactions,
  type AlgoSignTxnParam,
} from "../shared/decodeSignRequests";
import {
  LiquidAuthServiceError,
  liquidAssertion,
  liquidAttestation,
  type LiquidAuthResult,
} from "../scripts/liquid/webauthn";
import {
  LiquidErrorCode,
  LiquidReference,
  buildErrorResponse,
  buildResponse,
  decodeLiquidMessage,
  encodeLiquidMessage,
  isLiquidResponse,
  generateLiquidDeepLink,
  parseLiquidDeepLink,
  toBase64Url,
  type HelloParams,
  type HelloResult,
  type LiquidPeerMetadata,
  type LiquidRequestMessage,
  type LiquidResponseMessage,
  type SignDataParams,
  type SignDataResult,
  type SignTransactionsParams,
  type SignTransactionsResult,
} from "../scripts/liquid/protocol";
import {
  LIQUID_SESSIONS_STORAGE_KEY,
  parseStoredLiquidSessions,
  toStoredLiquidSession,
} from "../scripts/liquid/sessions";
import type { Arc60StdSigData } from "../scripts/encoding/arc60";
import { bytesToBase64 } from "../scripts/encoding/arc60";
import { getWalletBrandName } from "@/scripts/branding";

/** Stable ARC-0027 provider id announced by this wallet. */
export const LIQUID_WALLET_PROVIDER_ID = "8f7a1c2e-5b3d-4e9f-a6c0-1d2e3f4a5b6c";
/** Methods advertised in the hello handshake. */
export const LIQUID_METHODS = ["arc0027:sign_transactions", "arc0060:sign_data"];

export interface LiquidSessionRecord {
  requestId: string;
  origin: string;
  address: string;
  device: string;
  status: LiquidRuntimeStatus;
  /** dApp metadata from its hello handshake — self-declared, shown to the user for context. */
  peer?: LiquidPeerMetadata;
  dappProviderId?: string;
  createdAt: number;
}

export interface LiquidState {
  sessions: LiquidSessionRecord[];
  requests: StoredRequest[];
  signDataRequests: StoredSignDataRequest[];
}

interface ConnectPayload {
  uri: string;
  address: string;
}

interface RequestPayload {
  data: StoredRequest;
}

interface SignDataRequestPayload {
  data: StoredSignDataRequest;
}

type SignedTxnMap = Record<string, Uint8Array | null | undefined>;

const state = (): LiquidState => ({
  sessions: [],
  requests: [],
  signDataRequests: [],
});

const credentialKey = (origin: string, address: string) =>
  `liquid:cred:${origin}:${address}`;

const isLiquidCapable = (account: RootState["wallet"]["privateAccounts"][number]) =>
  !account.params && (account.type === "hd" || Boolean(account.sk));

/**
 * Persist pairing metadata only (requestId/origin/address/peer). Runtime status
 * and sockets are never stored — after a refresh the Connect page hydrates these
 * as disconnected until the user clicks reconnect.
 */
const persistLiquidSessions = async (
  dispatch: (type: string, payload?: unknown, options?: { root: boolean }) => Promise<unknown>,
  sessions: LiquidSessionRecord[]
) => {
  await dispatch(
    "wallet/wcSetItem",
    {
      key: LIQUID_SESSIONS_STORAGE_KEY,
      value: sessions.map(toStoredLiquidSession),
    },
    { root: true }
  );
};

const mutations: MutationTree<LiquidState> = {
  upsertSession(currentState, record: LiquidSessionRecord) {
    const index = currentState.sessions.findIndex(
      (s) => s.requestId === record.requestId
    );
    if (index === -1) {
      currentState.sessions.push(record);
    } else {
      currentState.sessions.splice(index, 1, { ...currentState.sessions[index], ...record });
    }
  },
  setSessionStatus(
    currentState,
    { requestId, status }: { requestId: string; status: LiquidRuntimeStatus }
  ) {
    const session = currentState.sessions.find((s) => s.requestId === requestId);
    if (session) {
      session.status = status;
    }
  },
  setSessionPeer(
    currentState,
    {
      requestId,
      peer,
      dappProviderId,
    }: { requestId: string; peer: LiquidPeerMetadata; dappProviderId?: string }
  ) {
    const session = currentState.sessions.find((s) => s.requestId === requestId);
    if (session) {
      session.peer = peer;
      session.dappProviderId = dappProviderId;
    }
  },
  removeSession(currentState, requestId: string) {
    const index = currentState.sessions.findIndex((s) => s.requestId === requestId);
    if (index !== -1) {
      currentState.sessions.splice(index, 1);
    }
    currentState.requests = currentState.requests.filter((r) => r.topic !== requestId);
    currentState.signDataRequests = currentState.signDataRequests.filter(
      (r) => r.topic !== requestId
    );
  },
  addRequest(currentState, { request }: { request: StoredRequest }) {
    currentState.requests.push(request);
  },
  removeRequest(currentState, id: number | string) {
    const index = currentState.requests.findIndex((r) => String(r.id) === String(id));
    if (index !== -1) {
      currentState.requests.splice(index, 1);
    }
  },
  addSignDataRequest(currentState, { request }: { request: StoredSignDataRequest }) {
    currentState.signDataRequests.push(request);
  },
  removeSignDataRequest(currentState, id: number | string) {
    const index = currentState.signDataRequests.findIndex(
      (r) => String(r.id) === String(id)
    );
    if (index !== -1) {
      currentState.signDataRequests.splice(index, 1);
    }
  },
  setSignDataItemSignature(
    currentState,
    {
      requestId,
      index,
      signature,
    }: { requestId: number | string; index: number; signature: string }
  ) {
    const request = currentState.signDataRequests.find(
      (r) => String(r.id) === String(requestId)
    );
    const item = request?.items.find((i) => i.index === index);
    if (item) {
      item.signature = signature;
    }
  },
  reset(currentState) {
    Object.assign(currentState, state());
  },
};

async function respond(requestId: string, message: LiquidResponseMessage): Promise<void> {
  const payload = await encodeLiquidMessage(message);
  liquidPeers.send(requestId, payload);
}

const actions: ActionTree<LiquidState, RootState> = {
  /**
   * Pair with a dApp: authenticate at the service named in the deep link (passkey + account
   * signature), then open the signaling socket and negotiate the WebRTC channel.
   */
  async connect(
    { commit, dispatch, rootState },
    { uri, address }: ConnectPayload
  ): Promise<LiquidSessionRecord> {
    const { origin, requestId } = parseLiquidDeepLink(uri);
    const account = rootState.wallet.privateAccounts.find((a) => a.addr === address);
    if (!account) {
      throw new Error("The selected account was not found in this wallet.");
    }
    if (!isLiquidCapable(account)) {
      throw new Error(
        "Liquid Auth needs an account whose signing key is stored in this wallet (standard or HD account)."
      );
    }
    const device = `${getWalletBrandName()} (web)`;
    const key = credentialKey(origin, address);
    const storedCredId: string | undefined = await dispatch(
      "wallet/wcGetItem",
      { key },
      { root: true }
    );

    let auth: LiquidAuthResult | undefined;
    if (typeof storedCredId === "string" && storedCredId.length > 0) {
      try {
        auth = await liquidAssertion(origin, { credId: storedCredId, requestId });
      } catch (error) {
        // The service forgot the credential (404/401) — register a fresh passkey below.
        if (
          error instanceof LiquidAuthServiceError &&
          (error.status === 404 || error.status === 401)
        ) {
          auth = undefined;
        } else {
          throw error;
        }
      }
    }
    if (!auth) {
      auth = await liquidAttestation(origin, {
        address,
        requestId,
        device,
        signChallenge: (challenge) =>
          dispatch(
            "signer/signLiquidChallenge",
            { from: address, challenge },
            { root: true }
          ),
      });
      await dispatch("wallet/wcSetItem", { key, value: auth.credId }, { root: true });
    }
    if (auth.user?.wallet && auth.user.wallet !== address) {
      console.warn("Liquid Auth service bound the session to another wallet", auth.user.wallet);
    }

    const existing = rootState.liquid.sessions.find((s) => s.requestId === requestId);
    const record: LiquidSessionRecord = {
      requestId,
      origin,
      address,
      device,
      status: "connecting",
      createdAt: existing?.createdAt ?? Date.now(),
      peer: existing?.peer,
      dappProviderId: existing?.dappProviderId,
    };
    commit("upsertSession", record);
    await persistLiquidSessions(dispatch, rootState.liquid.sessions);

    await liquidPeers.open({
      requestId,
      origin,
      onMessage: (id, payload) => {
        void dispatch("handleMessage", { requestId: id, payload });
      },
      onStatus: (id, status) => {
        commit("setSessionStatus", { requestId: id, status });
      },
    });
    return record;
  },

  /** Decode one message from the data channel and turn it into a pending request. */
  async handleMessage(
    { commit, dispatch, state },
    { requestId, payload }: { requestId: string; payload: string }
  ) {
    const session = state.sessions.find((s) => s.requestId === requestId);
    if (!session) {
      return;
    }
    let message;
    try {
      message = await decodeLiquidMessage(payload);
    } catch (error) {
      console.error("Undecodable Liquid Auth message", error);
      return;
    }
    if (isLiquidResponse(message)) {
      // The wallet never sends requests, so responses are unexpected — ignore.
      return;
    }
    const request = message as LiquidRequestMessage;

    switch (request.reference) {
      case LiquidReference.helloRequest: {
        const params = request.params as Partial<HelloParams> | undefined;
        if (params?.metadata) {
          commit("setSessionPeer", {
            requestId,
            peer: params.metadata,
            dappProviderId: params.providerId,
          });
          await persistLiquidSessions(dispatch, state.sessions);
        }
        const result: HelloResult = {
          providerId: LIQUID_WALLET_PROVIDER_ID,
          wallet: session.address,
          name: getWalletBrandName(),
          version: import.meta.env.VITE_GIT_COMMIT || undefined,
          methods: LIQUID_METHODS,
        };
        await respond(
          requestId,
          buildResponse(request, LiquidReference.helloResponse, result)
        );
        return;
      }
      case LiquidReference.signTransactionsRequest: {
        const params = request.params as Partial<SignTransactionsParams> | undefined;
        const rawTransactions: AlgoSignTxnParam[] = Array.isArray(params?.txns)
          ? (params!.txns as AlgoSignTxnParam[])
          : [];
        const transactions = decodeSignTxnTransactions(rawTransactions, (signed) => {
          dispatch("signer/setSigned", { signed }, { root: true });
        });
        const totalFee = transactions.reduce((fee, tx) => fee + (tx.fee ?? 0), 0);
        const stored: StoredRequest = {
          id: request.id,
          method: request.reference,
          transactions,
          fee: totalFee,
          ver: "liquid",
          topic: requestId,
        };
        commit("addRequest", { request: stored });
        return;
      }
      case LiquidReference.signDataRequest: {
        const params = request.params as Partial<SignDataParams> | undefined;
        const rawItems = (Array.isArray(params?.items)
          ? params!.items
          : []) as unknown as Arc60StdSigData[];
        const items = await decodeArc60Items(rawItems);
        const stored: StoredSignDataRequest = {
          id: request.id,
          method: request.reference,
          items,
          topic: requestId,
        };
        commit("addSignDataRequest", { request: stored });
        return;
      }
      default: {
        await respond(
          requestId,
          buildErrorResponse(request, `${request.reference}`.replace(/:request$/, ":response"), {
            code: LiquidErrorCode.methodNotSupported,
            message: `Method not supported: ${request.reference}`,
            providerId: LIQUID_WALLET_PROVIDER_ID,
          })
        );
      }
    }
  },

  /** Send back the signed transactions (null for every position left unsigned). */
  async sendResult({ commit, rootState }, { data }: RequestPayload) {
    const signedMap: SignedTxnMap =
      (rootState.signer as { signed?: SignedTxnMap }).signed ?? {};
    const stxns = data.transactions.map((item) => {
      try {
        const txnBuffer = decodeBase64Flexible(item.txnB64);
        const decodedTx = algosdk.decodeUnsignedTransaction(txnBuffer);
        const signed = signedMap[decodedTx.txID()];
        if (!signed) {
          return null;
        }
        return toBase64Url(signed);
      } catch (error) {
        console.error("Failed to encode signed txn", error);
        return null;
      }
    });
    const result: SignTransactionsResult = {
      providerId: LIQUID_WALLET_PROVIDER_ID,
      stxns,
    };
    await respond(
      data.topic,
      buildResponse({ id: String(data.id) }, LiquidReference.signTransactionsResponse, result)
    );
    commit("removeRequest", data.id);
  },

  async cancelRequest({ commit }, { data }: RequestPayload) {
    try {
      await respond(
        data.topic,
        buildErrorResponse({ id: String(data.id) }, LiquidReference.signTransactionsResponse, {
          code: LiquidErrorCode.cancelled,
          message: "User rejected.",
          providerId: LIQUID_WALLET_PROVIDER_ID,
        })
      );
    } finally {
      commit("removeRequest", data.id);
    }
  },

  async signSignDataItem(
    { commit, dispatch, state },
    { requestId, index }: { requestId: number | string; index: number }
  ) {
    const request = state.signDataRequests.find((r) => String(r.id) === String(requestId));
    const item = request?.items.find((i) => i.index === index);
    if (!request || !item) {
      throw new Error("Sign data request item was not found");
    }
    if (!item.domainValid) {
      throw new Error(
        "authenticatorData does not match the requesting domain — refusing to sign."
      );
    }
    const session = state.sessions.find((s) => s.requestId === request.topic);
    if (!session) {
      throw new Error("Liquid Auth session for this request was not found");
    }
    // Liquid Auth does not authenticate the dApp's origin to the wallet (the service only
    // proves the wallet to the dApp). The best available reference is the origin the dApp
    // declared in its hello handshake; the user sees it next to the request's domain.
    const signature: Uint8Array = await dispatch(
      "signer/signArc60Data",
      {
        from: item.signer,
        data: new Uint8Array(Buffer.from(item.data, "base64")),
        authenticatorData: new Uint8Array(Buffer.from(item.authenticatorData, "base64")),
        domain: item.domain,
        sessionOrigin: session.peer?.url,
        approvedAccounts: [session.address],
      },
      { root: true }
    );
    commit("setSignDataItemSignature", {
      requestId,
      index,
      signature: bytesToBase64(signature),
    });
  },

  async sendSignDataResult({ commit }, { data }: SignDataRequestPayload) {
    const signatures = data.items.map((item) =>
      item.signature ? toBase64Url(new Uint8Array(Buffer.from(item.signature, "base64"))) : null
    );
    const result: SignDataResult = { providerId: LIQUID_WALLET_PROVIDER_ID, signatures };
    await respond(
      data.topic,
      buildResponse({ id: String(data.id) }, LiquidReference.signDataResponse, result)
    );
    commit("removeSignDataRequest", data.id);
  },

  async cancelSignDataRequest({ commit }, { data }: SignDataRequestPayload) {
    try {
      await respond(
        data.topic,
        buildErrorResponse({ id: String(data.id) }, LiquidReference.signDataResponse, {
          code: LiquidErrorCode.cancelled,
          message: "User rejected.",
          providerId: LIQUID_WALLET_PROVIDER_ID,
        })
      );
    } finally {
      commit("removeSignDataRequest", data.id);
    }
  },

  async disconnect({ commit, dispatch, rootState }, { requestId }: { requestId: string }) {
    liquidPeers.close(requestId);
    commit("removeSession", requestId);
    await persistLiquidSessions(dispatch, rootState.liquid.sessions);
  },

  /**
   * Hydrate saved pairings from the encrypted wallet blob as disconnected.
   * Does not open sockets or run WebAuthn — that only happens from `reconnect`
   * after an explicit user click.
   */
  async loadSavedSessions({ commit, dispatch, state }) {
    const stored = parseStoredLiquidSessions(
      await dispatch("wallet/wcGetItem", { key: LIQUID_SESSIONS_STORAGE_KEY }, { root: true })
    );
    for (const session of stored) {
      if (state.sessions.some((s) => s.requestId === session.requestId)) {
        continue;
      }
      commit("upsertSession", {
        ...session,
        status: "disconnected" as const,
      });
    }
  },

  /**
   * Re-authenticate and reopen signaling for every saved pairing that is not
   * already live. Must be called from a user gesture (WebAuthn assertion).
   * Never invoked from wallet open / page mount.
   */
  async reconnect({ dispatch, rootState, state }) {
    await dispatch("loadSavedSessions");
    const pending = state.sessions.filter(
      (session) => session.status !== "connected" && !liquidPeers.isChannelOpen(session.requestId)
    );
    const errors: string[] = [];
    for (const session of pending) {
      const account = rootState.wallet.privateAccounts.find((a) => a.addr === session.address);
      if (!account || !isLiquidCapable(account)) {
        continue;
      }
      try {
        await dispatch("connect", {
          uri: generateLiquidDeepLink(session.origin, session.requestId),
          address: session.address,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${session.origin}: ${message}`);
      }
    }
    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }
  },

  /** Close every peer connection and wipe in-memory state (logout / wallet switch). */
  async reset({ commit }) {
    commit("reset");
    try {
      liquidPeers.closeAll();
    } catch (error) {
      console.error("Failed to close Liquid Auth connections", error);
    }
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
