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
  LIQUID_MAX_PAYLOAD_CHARS,
  LIQUID_MAX_PENDING_REQUESTS,
  LIQUID_MAX_SIGN_DATA_ITEMS,
  LIQUID_MAX_TXNS_PER_REQUEST,
  assertLiquidServiceOrigin,
  findUnauthorizedSenders,
  sanitizePeerMetadata,
} from "../scripts/liquid/guards";
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
export const LIQUID_METHODS = [
  "arc0027:sign_transactions",
  "arc0060:sign_data",
];

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
  enabled: boolean;
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
  enabled: false,
  sessions: [],
  requests: [],
  signDataRequests: [],
});

const credentialKey = (origin: string, address: string) =>
  `liquid:cred:${origin}:${address}`;

const isLiquidCapable = (
  account: RootState["wallet"]["privateAccounts"][number],
) => !account.params && (account.type === "hd" || Boolean(account.sk));

/**
 * Persist pairing metadata only (requestId/origin/address/peer). Runtime status
 * and sockets are never stored — after a refresh the Connect page hydrates these
 * as disconnected until the user clicks reconnect.
 */
const persistLiquidSessions = async (
  dispatch: (
    type: string,
    payload?: unknown,
    options?: { root: boolean },
  ) => Promise<unknown>,
  sessions: LiquidSessionRecord[],
) => {
  await dispatch(
    "wallet/wcSetItem",
    {
      key: LIQUID_SESSIONS_STORAGE_KEY,
      value: sessions.map(toStoredLiquidSession),
    },
    { root: true },
  );
};

const mutations: MutationTree<LiquidState> = {
  setEnabled(currentState, enabled: boolean) {
    currentState.enabled = enabled;
  },
  upsertSession(currentState, record: LiquidSessionRecord) {
    const index = currentState.sessions.findIndex(
      (s) => s.requestId === record.requestId,
    );
    if (index === -1) {
      currentState.sessions.push(record);
    } else {
      currentState.sessions.splice(index, 1, {
        ...currentState.sessions[index],
        ...record,
      });
    }
  },
  setSessionStatus(
    currentState,
    { requestId, status }: { requestId: string; status: LiquidRuntimeStatus },
  ) {
    const session = currentState.sessions.find(
      (s) => s.requestId === requestId,
    );
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
    }: { requestId: string; peer: LiquidPeerMetadata; dappProviderId?: string },
  ) {
    const session = currentState.sessions.find(
      (s) => s.requestId === requestId,
    );
    if (session) {
      session.peer = peer;
      session.dappProviderId = dappProviderId;
    }
  },
  removeSession(currentState, requestId: string) {
    const index = currentState.sessions.findIndex(
      (s) => s.requestId === requestId,
    );
    if (index !== -1) {
      currentState.sessions.splice(index, 1);
    }
    currentState.requests = currentState.requests.filter(
      (r) => r.topic !== requestId,
    );
    currentState.signDataRequests = currentState.signDataRequests.filter(
      (r) => r.topic !== requestId,
    );
  },
  addRequest(currentState, { request }: { request: StoredRequest }) {
    currentState.requests.push(request);
  },
  removeRequest(currentState, id: number | string) {
    const index = currentState.requests.findIndex(
      (r) => String(r.id) === String(id),
    );
    if (index !== -1) {
      currentState.requests.splice(index, 1);
    }
  },
  addSignDataRequest(
    currentState,
    { request }: { request: StoredSignDataRequest },
  ) {
    currentState.signDataRequests.push(request);
  },
  removeSignDataRequest(currentState, id: number | string) {
    const index = currentState.signDataRequests.findIndex(
      (r) => String(r.id) === String(id),
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
    }: { requestId: number | string; index: number; signature: string },
  ) {
    const request = currentState.signDataRequests.find(
      (r) => String(r.id) === String(requestId),
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

function isRequestBacklogFull(currentState: LiquidState): boolean {
  return (
    currentState.requests.length + currentState.signDataRequests.length >=
    LIQUID_MAX_PENDING_REQUESTS
  );
}

/** Peer-chosen ids are the store keys, so one that is already pending must not be reused. */
function isRequestIdInUse(currentState: LiquidState, id: string): boolean {
  return (
    currentState.requests.some((r) => String(r.id) === String(id)) ||
    currentState.signDataRequests.some((r) => String(r.id) === String(id))
  );
}

async function respond(
  requestId: string,
  message: LiquidResponseMessage,
): Promise<void> {
  const payload = await encodeLiquidMessage(message);
  liquidPeers.send(requestId, payload);
}

const actions: ActionTree<LiquidState, RootState> = {
  async init({ commit, dispatch, state }) {
    if (state.enabled) return;
    commit("setEnabled", true);
    await dispatch("reconnect");
  },
  /**
   * Pair with a dApp: authenticate at the service named in the deep link (passkey + account
   * signature), then open the signaling socket and negotiate the WebRTC channel.
   */
  async connect(
    { commit, dispatch, rootState, state },
    { uri, address }: ConnectPayload,
  ): Promise<LiquidSessionRecord> {
    if (!state.enabled) {
      throw new Error("Initialize Liquid Auth before connecting.");
    }
    const { origin, requestId } = parseLiquidDeepLink(uri);
    // AW-2026-049: the service receives a passkey and an account-key signature, so a pasted
    // link must not be able to point the wallet at an arbitrary host.
    assertLiquidServiceOrigin(
      origin,
      window.location.hostname,
      (import.meta.env.VITE_LIQUID_SERVICE_HOSTS ?? "").split(","),
    );
    const account = rootState.wallet.privateAccounts.find(
      (a) => a.addr === address,
    );
    if (!account) {
      throw new Error("The selected account was not found in this wallet.");
    }
    if (!isLiquidCapable(account)) {
      throw new Error(
        "Liquid Auth needs an account whose signing key is stored in this wallet (standard or HD account).",
      );
    }
    const device = `${getWalletBrandName()} (web)`;
    const key = credentialKey(origin, address);
    const storedCredId: string | undefined = await dispatch(
      "wallet/wcGetItem",
      { key },
      { root: true },
    );

    let auth: LiquidAuthResult | undefined;
    if (typeof storedCredId === "string" && storedCredId.length > 0) {
      try {
        auth = await liquidAssertion(origin, {
          credId: storedCredId,
          requestId,
        });
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
            { root: true },
          ),
      });
      await dispatch(
        "wallet/wcSetItem",
        { key, value: auth.credId },
        { root: true },
      );
    }
    if (auth.user?.wallet && auth.user.wallet !== address) {
      console.warn(
        "Liquid Auth service bound the session to another wallet",
        auth.user.wallet,
      );
    }

    const existing = rootState.liquid.sessions.find(
      (s) => s.requestId === requestId,
    );
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
    { commit, dispatch, state, rootState },
    { requestId, payload }: { requestId: string; payload: string },
  ) {
    const session = state.sessions.find((s) => s.requestId === requestId);
    if (!session) {
      return;
    }
    // AW-2026-052: the peer is unauthenticated; bound its input before decoding.
    if (payload.length > LIQUID_MAX_PAYLOAD_CHARS) {
      console.error("Oversized Liquid Auth message dropped");
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
    const rejectRequest = (reference: string, code: number, text: string) =>
      respond(
        requestId,
        buildErrorResponse(request, reference, {
          code,
          message: text,
          providerId: LIQUID_WALLET_PROVIDER_ID,
        }),
      );

    switch (request.reference) {
      case LiquidReference.helloRequest: {
        const params = request.params as Partial<HelloParams> | undefined;
        if (params?.metadata) {
          commit("setSessionPeer", {
            requestId,
            peer: sanitizePeerMetadata(params.metadata),
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
          buildResponse(request, LiquidReference.helloResponse, result),
        );
        return;
      }
      case LiquidReference.signTransactionsRequest: {
        const params = request.params as
          Partial<SignTransactionsParams> | undefined;
        const rawTransactions: AlgoSignTxnParam[] = Array.isArray(params?.txns)
          ? (params!.txns as AlgoSignTxnParam[])
          : [];
        const reject = (code: number, text: string) =>
          rejectRequest(LiquidReference.signTransactionsResponse, code, text);
        if (isRequestIdInUse(state, request.id)) {
          // No reply: an error response would carry the id of the still-pending request.
          console.error("Duplicate Liquid Auth request id ignored");
          return;
        }
        if (
          rawTransactions.length === 0 ||
          rawTransactions.length > LIQUID_MAX_TXNS_PER_REQUEST
        ) {
          await reject(LiquidErrorCode.invalidInput, "Invalid transaction count.");
          return;
        }
        if (isRequestBacklogFull(state)) {
          await reject(LiquidErrorCode.unknown, "Too many pending requests.");
          return;
        }
        const preSignedBlobs: Uint8Array[] = [];
        let transactions: ReturnType<typeof decodeSignTxnTransactions>;
        try {
          // Pre-signed blobs are only registered once the request is accepted.
          transactions = decodeSignTxnTransactions(rawTransactions, (signed) => {
            preSignedBlobs.push(signed);
          });
        } catch (error) {
          console.error("Undecodable Liquid Auth transactions", error);
          await reject(LiquidErrorCode.invalidInput, "Invalid transaction.");
          return;
        }
        // AW-2026-051: a session paired for one account may only ask it to sign.
        const unauthorized = findUnauthorizedSenders(
          transactions.map((tx, i) => ({
            sender: tx.txn?.sender?.toString(),
            preSigned: tx.preSigned,
            signers: rawTransactions[i]?.signers,
          })),
          [session.address],
          rootState.wallet.privateAccounts.map((a) => a.addr),
        );
        if (unauthorized.length > 0) {
          await reject(
            LiquidErrorCode.unauthorizedSigner,
            "Transaction sender is not the account linked to this session.",
          );
          return;
        }
        for (const signed of preSignedBlobs) {
          await dispatch("signer/setSigned", { signed }, { root: true });
        }
        const totalFee = transactions.reduce(
          (fee, tx) => fee + (tx.fee ?? 0),
          0,
        );
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
        if (isRequestIdInUse(state, request.id)) {
          console.error("Duplicate Liquid Auth request id ignored");
          return;
        }
        if (
          rawItems.length === 0 ||
          rawItems.length > LIQUID_MAX_SIGN_DATA_ITEMS ||
          isRequestBacklogFull(state)
        ) {
          await rejectRequest(
            LiquidReference.signDataResponse,
            LiquidErrorCode.invalidInput,
            "Invalid or excessive sign data request.",
          );
          return;
        }
        const items = await decodeArc60Items(rawItems);
        // The decode above is async: re-check that no same-id request was queued meanwhile.
        if (isRequestIdInUse(state, request.id)) {
          console.error("Duplicate Liquid Auth request id ignored");
          return;
        }
        // AW-2026-051: a session linked to one account may only ask it for signatures.
        if (
          items.length === 0 ||
          items.length < rawItems.length ||
          items.some((item) => item.signer !== session.address)
        ) {
          await rejectRequest(
            LiquidReference.signDataResponse,
            LiquidErrorCode.unauthorizedSigner,
            "The signer is not the account linked to this session.",
          );
          return;
        }
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
          buildErrorResponse(
            request,
            `${request.reference}`.replace(/:request$/, ":response"),
            {
              code: LiquidErrorCode.methodNotSupported,
              message: `Method not supported: ${request.reference}`,
              providerId: LIQUID_WALLET_PROVIDER_ID,
            },
          ),
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
      buildResponse(
        { id: String(data.id) },
        LiquidReference.signTransactionsResponse,
        result,
      ),
    );
    commit("removeRequest", data.id);
  },

  async cancelRequest({ commit }, { data }: RequestPayload) {
    try {
      await respond(
        data.topic,
        buildErrorResponse(
          { id: String(data.id) },
          LiquidReference.signTransactionsResponse,
          {
            code: LiquidErrorCode.cancelled,
            message: "User rejected.",
            providerId: LIQUID_WALLET_PROVIDER_ID,
          },
        ),
      );
    } finally {
      commit("removeRequest", data.id);
    }
  },

  async signSignDataItem(
    { commit, dispatch, state },
    { requestId, index }: { requestId: number | string; index: number },
  ) {
    const request = state.signDataRequests.find(
      (r) => String(r.id) === String(requestId),
    );
    const item = request?.items.find((i) => i.index === index);
    if (!request || !item) {
      throw new Error("Sign data request item was not found");
    }
    if (!item.domainValid) {
      throw new Error(
        "authenticatorData does not match the requesting domain — refusing to sign.",
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
        authenticatorData: new Uint8Array(
          Buffer.from(item.authenticatorData, "base64"),
        ),
        domain: item.domain,
        sessionOrigin: session.peer?.url,
        approvedAccounts: [session.address],
      },
      { root: true },
    );
    commit("setSignDataItemSignature", {
      requestId,
      index,
      signature: bytesToBase64(signature),
    });
  },

  async sendSignDataResult({ commit }, { data }: SignDataRequestPayload) {
    const signatures = data.items.map((item) =>
      item.signature
        ? toBase64Url(new Uint8Array(Buffer.from(item.signature, "base64")))
        : null,
    );
    const result: SignDataResult = {
      providerId: LIQUID_WALLET_PROVIDER_ID,
      signatures,
    };
    await respond(
      data.topic,
      buildResponse(
        { id: String(data.id) },
        LiquidReference.signDataResponse,
        result,
      ),
    );
    commit("removeSignDataRequest", data.id);
  },

  async cancelSignDataRequest({ commit }, { data }: SignDataRequestPayload) {
    try {
      await respond(
        data.topic,
        buildErrorResponse(
          { id: String(data.id) },
          LiquidReference.signDataResponse,
          {
            code: LiquidErrorCode.cancelled,
            message: "User rejected.",
            providerId: LIQUID_WALLET_PROVIDER_ID,
          },
        ),
      );
    } finally {
      commit("removeSignDataRequest", data.id);
    }
  },

  async disconnect(
    { commit, dispatch, rootState },
    { requestId }: { requestId: string },
  ) {
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
      await dispatch(
        "wallet/wcGetItem",
        { key: LIQUID_SESSIONS_STORAGE_KEY },
        { root: true },
      ),
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
    if (!state.enabled) {
      throw new Error("Initialize Liquid Auth before reconnecting.");
    }
    await dispatch("loadSavedSessions");
    const pending = state.sessions.filter(
      (session) =>
        session.status !== "connected" &&
        !liquidPeers.isChannelOpen(session.requestId),
    );
    const errors: string[] = [];
    for (const session of pending) {
      const account = rootState.wallet.privateAccounts.find(
        (a) => a.addr === session.address,
      );
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
