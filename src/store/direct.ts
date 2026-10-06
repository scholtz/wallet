/**
 * Biatec Direct dApp connections (wallet side): the relay-free popup + postMessage transport.
 *
 * The dApp opens `/direct?origin=<its origin>` as a popup and posts ARC-0027 messages to it
 * (see docs/DIRECT.md). The popup is its own browsing context with its own store, so the
 * requests held here belong to this popup only; the sites the user granted access to are
 * persisted (encrypted, in the wallet blob) and listed on the Connect page.
 *
 * Requests reuse the WalletConnect shapes (`StoredRequest` / `StoredSignDataRequest`,
 * `ver: "direct"`, `topic` = the browser-verified dApp origin) so the shared tables render them.
 * Unlike Liquid Auth, the dApp origin is verified by the browser (`event.origin`), so ARC-0060
 * domain binding rests on a trustworthy origin.
 */
import algosdk from "algosdk";
import type { ActionTree, MutationTree } from "vuex";
import type { RootState } from "./index";
import type { StoredRequest, StoredSignDataRequest } from "./wc";
import directChannel from "../shared/direct";
import {
  decodeArc60Items,
  decodeBase64Flexible,
  decodeSignTxnTransactions,
  type AlgoSignTxnParam,
} from "../shared/decodeSignRequests";
import {
  DirectErrorCode,
  DirectReference,
  MAX_DIRECT_ENABLE_ACCOUNTS,
  buildDirectError,
  buildDirectResponse,
  checkRequestNetwork,
  responseReference,
  txnGenesisMatches,
  type DirectRequestMessage,
} from "../scripts/direct/protocol";
import {
  DIRECT_SESSIONS_STORAGE_KEY,
  parseStoredDirectSessions,
  pruneDirectSessions,
  toPeerMetadata,
  upsertDirectSession,
  type DirectPeerMetadata,
  type StoredDirectSession,
} from "../scripts/direct/sessions";
import {
  MAX_DAPP_SIGN_DATA_ITEMS,
  MAX_DAPP_TXNS_PER_REQUEST,
  REQUEST_ERROR,
  admitEnvelope,
  admitSignData,
  admitTransactions,
  countPending,
  sanitizePeerMetadata,
  type Admission,
} from "../scripts/liquid/guards";
import type { Arc60StdSigData } from "../scripts/encoding/arc60";
import { bytesToBase64 } from "../scripts/encoding/arc60";
import { toBase64Url } from "../scripts/liquid/protocol";
import { getWalletBrandName } from "@/scripts/branding";

/** Stable ARC-0027 provider id announced by this wallet (shared with the Liquid transport). */
export const DIRECT_WALLET_PROVIDER_ID = "8f7a1c2e-5b3d-4e9f-a6c0-1d2e3f4a5b6c";

export type DirectPopupStatus =
  | "idle"
  | "framed"
  | "no_opener"
  | "bad_origin"
  | "waiting"
  | "expired"
  | "enable"
  | "signing"
  | "refused"
  | "done";

export interface PendingEnable {
  id: string;
  reference: string;
  /** Normalized genesis hash the dApp asked for. */
  genesisHash: string;
  peer: DirectPeerMetadata;
}

export interface DirectState {
  sessions: StoredDirectSession[];
  requests: StoredRequest[];
  signDataRequests: StoredSignDataRequest[];
  popup: { status: DirectPopupStatus; dappOrigin: string | null };
  pendingEnable: PendingEnable | null;
}

interface RequestPayload {
  data: StoredRequest;
}

interface SignDataRequestPayload {
  data: StoredSignDataRequest;
}

type SignedTxnMap = Record<string, Uint8Array | null | undefined>;

const state = (): DirectState => ({
  sessions: [],
  requests: [],
  signDataRequests: [],
  popup: { status: "idle", dappOrigin: null },
  pendingEnable: null,
});

/** Accounts a dApp may be granted: anything the wallet signs for itself except proxied (wc) ones. */
export const isDirectEligibleAccount = (
  account: RootState["wallet"]["privateAccounts"][number],
) => account.type !== "wc" && !account.isHidden;


const mutations: MutationTree<DirectState> = {
  setSessions(currentState, sessions: StoredDirectSession[]) {
    currentState.sessions = sessions;
  },
  setPopup(
    currentState,
    popup: { status: DirectPopupStatus; dappOrigin?: string | null },
  ) {
    currentState.popup.status = popup.status;
    if (popup.dappOrigin !== undefined) {
      currentState.popup.dappOrigin = popup.dappOrigin;
    }
  },
  setPendingEnable(currentState, pending: PendingEnable | null) {
    currentState.pendingEnable = pending;
  },
  addRequest(currentState, { request }: { request: StoredRequest }) {
    currentState.requests.push(request);
  },
  removeRequest(currentState, id: number | string) {
    const index = currentState.requests.findIndex(
      (r) => String(r.id) === String(id),
    );
    if (index !== -1) currentState.requests.splice(index, 1);
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
    if (index !== -1) currentState.signDataRequests.splice(index, 1);
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
    if (item) item.signature = signature;
  },
  reset(currentState) {
    Object.assign(currentState, state());
  },
};

const errorReply = (
  request: Pick<DirectRequestMessage, "id" | "reference">,
  code: number,
  message: string,
) => {
  directChannel.send(
    buildDirectError(request.id, responseReference(request.reference), {
      code,
      message,
      providerId: DIRECT_WALLET_PROVIDER_ID,
    }),
  );
};

const actions: ActionTree<DirectState, RootState> = {
  /**
   * Called by the /direct page once the (unlocked) wallet is showing. Starts the channel and
   * announces `ready` to the opener; nothing is listened for anywhere else in the app.
   */
  async startPopup({ commit, dispatch }) {
    try {
      await dispatch("loadSavedSessions");
    } catch (error) {
      // Unreadable wallet record: never start a channel we cannot serve; tell the user.
      console.error("Failed to load Direct sessions", error);
      commit("setPopup", { status: "expired" });
      return;
    }
    const started = directChannel.start({
      onRequest: (request, dappOrigin) => {
        void dispatch("handleRequest", { request, dappOrigin });
      },
      onExpired: () => {
        commit("setPopup", { status: "expired" });
      },
    });
    if (!started.ok) {
      commit("setPopup", {
        status: started.error === "consumed" ? "expired" : started.error,
        dappOrigin: null,
      });
      return;
    }
    commit("setPopup", { status: "waiting", dappOrigin: started.dappOrigin });
  },

  /**
   * One accepted request. Any unexpected failure still answers the dApp (4000) and ends the
   * popup single request instead of leaving both sides waiting for a timeout.
   */
  async handleRequest(
    { commit, dispatch },
    payload: { request: DirectRequestMessage; dappOrigin: string },
  ) {
    try {
      await dispatch("processRequest", payload);
    } catch (error) {
      console.error("Direct request failed", error);
      errorReply(
        payload.request,
        DirectErrorCode.unknown,
        "The wallet could not process the request.",
      );
      commit("setPopup", { status: "refused" });
      directChannel.closeAfterFlush();
    }
  },

  /** Validate a request completely, then queue it for the user. */
  async processRequest(
    { commit, dispatch, state, rootState },
    {
      request,
      dappOrigin,
    }: { request: DirectRequestMessage; dappOrigin: string },
  ) {
    // Refuse = answer with an error and end this popup's single request.
    const refuse = (admission: { code: number; reason: string }) => {
      console.error("Direct request refused:", admission.reason);
      errorReply(request, admission.code, admission.reason);
      commit("setPopup", { status: "refused" });
      directChannel.closeAfterFlush();
    };
    // unknown: untrusted request data; validated by checkRequestNetwork / normalizeGenesisHash.
    const network = async (genesisHash: unknown) => {
      const genesisList: { network: string; CAIP10: string }[] = (await dispatch(
        "publicData/getGenesisList",
        undefined,
        { root: true },
      )) ?? [];
      return checkRequestNetwork({
        requestGenesisHash: genesisHash,
        env: rootState.config.env,
        genesisList,
      });
    };
    const session = state.sessions.find((s) => s.origin === dappOrigin);

    switch (request.reference) {
      case DirectReference.enableRequest: {
        const params = request.params;
        const check = await network(params.genesisHash);
        if (!check.ok || !check.normalized) {
          refuse(
            check.ok
              ? { code: DirectErrorCode.invalidInput, reason: "Invalid genesisHash." }
              : check,
          );
          return;
        }
        // unknown: dApp-supplied metadata is untrusted; sanitizePeerMetadata type-checks it.
        const rawMetadata = params.metadata;
        const peer: DirectPeerMetadata =
          rawMetadata && typeof rawMetadata === "object"
            ? toPeerMetadata(sanitizePeerMetadata(rawMetadata as DirectPeerMetadata))
            : { name: "", description: "", url: "", icons: [] };
        commit("setPendingEnable", {
          id: request.id,
          reference: request.reference,
          genesisHash: check.normalized,
          peer,
        } satisfies PendingEnable);
        commit("setPopup", { status: "enable" });
        return;
      }
      case DirectReference.disableRequest: {
        if (session) {
          await dispatch("updateSessions", (sessions: StoredDirectSession[]) =>
            sessions.filter((s) => s.origin !== dappOrigin),
          );
        }
        directChannel.send(
          buildDirectResponse(request.id, DirectReference.disableResponse, {
            providerId: DIRECT_WALLET_PROVIDER_ID,
          }),
        );
        directChannel.closeAfterFlush();
        return;
      }
      case DirectReference.signTransactionsRequest: {
        if (!session) {
          refuse({
            code: REQUEST_ERROR.unauthorized,
            reason: "This site is not connected. Connect it first.",
          });
          return;
        }
        const check = await network(request.params.genesisHash);
        if (!check.ok || !check.normalized) {
          refuse(
            check.ok
              ? { code: DirectErrorCode.invalidInput, reason: "Invalid genesisHash." }
              : check,
          );
          return;
        }
        // The grant was made on one network; a site cannot carry it over to another.
        if (session.genesisHash !== check.normalized) {
          refuse({
            code: DirectErrorCode.networkNotSupported,
            reason:
              "This site was connected on a different network. Connect it again.",
          });
          return;
        }
        const rawTransactions: AlgoSignTxnParam[] = Array.isArray(
          request.params.txns,
        )
          ? (request.params.txns as AlgoSignTxnParam[])
          : [];
        const envelope = admitEnvelope({
          count: rawTransactions.length,
          maxCount: MAX_DAPP_TXNS_PER_REQUEST,
          ...countPending(
            state.requests,
            state.signDataRequests,
            dappOrigin,
            request.id,
          ),
        });
        if (!envelope.ok) {
          refuse(envelope);
          return;
        }
        const preSignedBlobs: Uint8Array[] = [];
        let transactions: ReturnType<typeof decodeSignTxnTransactions>;
        try {
          transactions = decodeSignTxnTransactions(rawTransactions, (signed) => {
            preSignedBlobs.push(signed);
          });
          preSignedBlobs.forEach((signed) => algosdk.decodeSignedTransaction(signed));
        } catch (error) {
          console.error("Undecodable Direct transactions", error);
          refuse({ code: REQUEST_ERROR.invalid, reason: "Invalid transaction." });
          return;
        }
        // Every transaction must be bound to the network the request (and the wallet) is on.
        if (
          transactions.some(
            (tx) => !txnGenesisMatches(tx.txn?.genesisHash, check.normalized!),
          )
        ) {
          refuse({
            code: DirectErrorCode.networkNotSupported,
            reason: "A transaction targets a different network than the request.",
          });
          return;
        }
        const admission: Admission = admitTransactions({
          transactions: transactions.map((tx, i) => ({
            sender: tx.txn?.sender?.toString(),
            preSigned: tx.preSigned,
            signers: rawTransactions[i]?.signers,
          })),
          approved: session.addresses,
          own: rootState.wallet.privateAccounts.map((a) => a.addr),
        });
        if (!admission.ok) {
          refuse(admission);
          return;
        }
        preSignedBlobs.forEach((signed) =>
          commit("signer/setSigned", signed, { root: true }),
        );
        commit("addRequest", {
          request: {
            id: request.id,
            method: request.reference,
            transactions,
            fee: transactions.reduce((fee, tx) => fee + (tx.fee ?? 0), 0),
            ver: "direct",
            topic: dappOrigin,
          } satisfies StoredRequest,
        });
        commit("setPopup", { status: "signing" });
        return;
      }
      case DirectReference.signDataRequest: {
        if (!session) {
          refuse({
            code: REQUEST_ERROR.unauthorized,
            reason: "This site is not connected. Connect it first.",
          });
          return;
        }
        // `genesisHash` is optional for sign_data; when given it must be the granted network.
        if (request.params.genesisHash !== undefined) {
          const check = await network(request.params.genesisHash);
          if (!check.ok || !check.normalized) {
            refuse(
              check.ok
                ? {
                    code: DirectErrorCode.invalidInput,
                    reason: "Invalid genesisHash.",
                  }
                : check,
            );
            return;
          }
          if (session.genesisHash !== check.normalized) {
            refuse({
              code: DirectErrorCode.networkNotSupported,
              reason:
                "This site was connected on a different network. Connect it again.",
            });
            return;
          }
        }
        // unknown cast: the dApp sends untrusted data; decodeArc60Items validates each item.
        const rawItems = (Array.isArray(request.params.items)
          ? request.params.items
          : []) as unknown as Arc60StdSigData[];
        const envelope = admitEnvelope({
          count: rawItems.length,
          maxCount: MAX_DAPP_SIGN_DATA_ITEMS,
          ...countPending(
            state.requests,
            state.signDataRequests,
            dappOrigin,
            request.id,
          ),
        });
        if (!envelope.ok) {
          refuse(envelope);
          return;
        }
        let items: Awaited<ReturnType<typeof decodeArc60Items>>;
        try {
          items = await decodeArc60Items(rawItems);
        } catch (error) {
          console.error("Undecodable Direct sign data items", error);
          refuse({
            code: REQUEST_ERROR.invalid,
            reason: "Invalid sign data request.",
          });
          return;
        }
        const admission = admitSignData({
          rawCount: rawItems.length,
          signers: items.map((item) => item.signer),
          approved: session.addresses,
        });
        if (!admission.ok) {
          refuse(admission);
          return;
        }
        commit("addSignDataRequest", {
          request: {
            id: request.id,
            method: request.reference,
            items,
            topic: dappOrigin,
          } satisfies StoredSignDataRequest,
        });
        commit("setPopup", { status: "signing" });
        return;
      }
      default:
        refuse({
          code: REQUEST_ERROR.methodNotSupported,
          reason: `Method not supported: ${request.reference}`,
        });
    }
  },

  /** The user picked the accounts to expose to the requesting site. */
  async approveEnable(
    { commit, dispatch, state, rootState },
    { addresses }: { addresses: string[] },
  ) {
    const pending = state.pendingEnable;
    const dappOrigin = state.popup.dappOrigin;
    if (!pending || !dappOrigin) {
      throw new Error("There is no connection request to approve.");
    }
    const eligible = new Map(
      rootState.wallet.privateAccounts
        .filter(isDirectEligibleAccount)
        .map((a) => [a.addr, a]),
    );
    const unique = [...new Set(addresses)];
    if (
      unique.length === 0 ||
      unique.length > MAX_DIRECT_ENABLE_ACCOUNTS ||
      unique.some((a) => !eligible.has(a))
    ) {
      throw new Error("Select at least one account of this wallet.");
    }
    // Single-use: clear the pending request before anything is awaited, so two concurrent
    // approvals cannot both answer it.
    commit("setPendingEnable", null);
    const now = Date.now();
    const existing = state.sessions.find((s) => s.origin === dappOrigin);
    const session: StoredDirectSession = {
      origin: dappOrigin,
      addresses: unique,
      genesisHash: pending.genesisHash,
      createdAt: existing?.createdAt ?? now,
      lastUsedAt: now,
    };
    if (pending.peer.name || pending.peer.url) {
      session.peer = pending.peer;
    }
    try {
      await dispatch("updateSessions", (sessions: StoredDirectSession[]) =>
        upsertDirectSession(sessions, session),
      );
    } catch (error) {
      // Persisting the grant failed (e.g. unreadable wallet record): the dApp has not been
      // answered yet, so restore the request and let the user retry or reject.
      commit("setPendingEnable", pending);
      throw error;
    }
    directChannel.send(
      buildDirectResponse(pending.id, DirectReference.enableResponse, {
        providerId: DIRECT_WALLET_PROVIDER_ID,
        genesisHash: pending.genesisHash,
        accounts: unique.map((address) => ({
          address,
          name: eligible.get(address)?.name || undefined,
        })),
        wallet: getWalletBrandName(),
      }),
    );
    commit("setPopup", { status: "done" });
    directChannel.closeAfterFlush();
  },

  rejectEnable({ commit, state }) {
    const pending = state.pendingEnable;
    commit("setPendingEnable", null);
    if (pending) {
      errorReply(pending, DirectErrorCode.cancelled, "User rejected.");
    }
    commit("setPopup", { status: "done" });
    directChannel.closeAfterFlush();
  },

  /** Send back the signed transactions (null for every position left unsigned). */
  async sendResult({ commit, rootState, state }, { data }: RequestPayload) {
    // Idempotent: a request is answered once (a double click must not send two responses).
    if (!state.requests.some((r) => String(r.id) === String(data.id))) return;
    commit("removeRequest", data.id);
    const signedMap: SignedTxnMap =
      (rootState.signer as { signed?: SignedTxnMap }).signed ?? {};
    const stxns = data.transactions.map((item) => {
      try {
        const decodedTx = algosdk.decodeUnsignedTransaction(
          decodeBase64Flexible(item.txnB64),
        );
        const signed = signedMap[decodedTx.txID()];
        return signed ? toBase64Url(signed) : null;
      } catch (error) {
        console.error("Failed to encode signed txn", error);
        return null;
      }
    });
    directChannel.send(
      buildDirectResponse(
        String(data.id),
        DirectReference.signTransactionsResponse,
        { providerId: DIRECT_WALLET_PROVIDER_ID, stxns },
      ),
    );
    commit("setPopup", { status: "done" });
    directChannel.closeAfterFlush();
  },

  cancelRequest({ commit, state }, { data }: RequestPayload) {
    if (!state.requests.some((r) => String(r.id) === String(data.id))) return;
    commit("removeRequest", data.id);
    errorReply(
      { id: String(data.id), reference: DirectReference.signTransactionsRequest },
      DirectErrorCode.cancelled,
      "User rejected.",
    );
    commit("setPopup", { status: "done" });
    directChannel.closeAfterFlush();
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
    const session = state.sessions.find((s) => s.origin === request.topic);
    if (!session) {
      throw new Error("The site for this request is no longer connected");
    }
    // `request.topic` is the browser-verified origin of the dApp (event.origin): the ARC-0060
    // domain must be that origin's host.
    const signature: Uint8Array = await dispatch(
      "signer/signArc60Data",
      {
        from: item.signer,
        data: new Uint8Array(Buffer.from(item.data, "base64")),
        authenticatorData: new Uint8Array(
          Buffer.from(item.authenticatorData, "base64"),
        ),
        domain: item.domain,
        sessionOrigin: session.origin,
        approvedAccounts: session.addresses,
      },
      { root: true },
    );
    commit("setSignDataItemSignature", {
      requestId,
      index,
      signature: bytesToBase64(signature),
    });
  },

  sendSignDataResult({ commit, state }, { data }: SignDataRequestPayload) {
    if (!state.signDataRequests.some((r) => String(r.id) === String(data.id)))
      return;
    commit("removeSignDataRequest", data.id);
    const signatures = data.items.map((item) =>
      item.signature
        ? toBase64Url(new Uint8Array(Buffer.from(item.signature, "base64")))
        : null,
    );
    directChannel.send(
      buildDirectResponse(String(data.id), DirectReference.signDataResponse, {
        providerId: DIRECT_WALLET_PROVIDER_ID,
        signatures,
      }),
    );
    commit("setPopup", { status: "done" });
    directChannel.closeAfterFlush();
  },

  cancelSignDataRequest({ commit, state }, { data }: SignDataRequestPayload) {
    if (!state.signDataRequests.some((r) => String(r.id) === String(data.id)))
      return;
    commit("removeSignDataRequest", data.id);
    errorReply(
      { id: String(data.id), reference: DirectReference.signDataRequest },
      DirectErrorCode.cancelled,
      "User rejected.",
    );
    commit("setPopup", { status: "done" });
    directChannel.closeAfterFlush();
  },

  /** Revoke the grant of one site (Connect page). */
  async disconnect({ dispatch }, { origin }: { origin: string }) {
    await dispatch("updateSessions", (sessions: StoredDirectSession[]) =>
      sessions.filter((s) => s.origin !== origin),
    );
  },

  async disconnectAll({ dispatch }) {
    await dispatch("updateSessions", () => []);
  },

  /**
   * Read-modify-write of the site grants against the PERSISTED list: the popup and the main
   * wallet tab are separate stores, so each must start from what the other last wrote.
   */
  async updateSessions(
    { commit, dispatch },
    update: (sessions: StoredDirectSession[]) => StoredDirectSession[],
  ) {
    // One critical section (read, update, write) under the cross-tab wallet write lock.
    const next = (await dispatch(
      "wallet/wcUpdateItemFresh",
      {
        key: DIRECT_SESSIONS_STORAGE_KEY,
        update: (current: unknown) =>
          update(parseStoredDirectSessions(current)),
      },
      { root: true },
    )) as StoredDirectSession[];
    commit("setSessions", next);
  },

  /** Hydrate site grants from the encrypted wallet blob (no network, no popups). */
  async loadSavedSessions({ commit, dispatch, rootState }) {
    const stored = parseStoredDirectSessions(
      await dispatch(
        "wallet/wcGetItemFresh",
        { key: DIRECT_SESSIONS_STORAGE_KEY },
        { root: true },
      ),
    );
    commit(
      "setSessions",
      pruneDirectSessions(
        stored,
        rootState.wallet.privateAccounts
          .filter(isDirectEligibleAccount)
          .map((a) => a.addr),
      ),
    );
  },

  /** Logout / wallet switch: answer a pending request, stop listening, wipe memory. */
  reset({ commit }) {
    try {
      directChannel.rejectPending("Wallet was locked.");
      directChannel.stop();
    } catch (error) {
      console.error("Failed to stop the Direct channel", error);
    }
    commit("reset");
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
