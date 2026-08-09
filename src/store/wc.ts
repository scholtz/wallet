import { Core } from "@walletconnect/core";
import { WalletKit, type WalletKitTypes } from "@reown/walletkit";
import { parseUri } from "@walletconnect/utils";
import type { SessionTypes } from "@walletconnect/types";
import algosdk from "algosdk";
import type { ActionTree, MutationTree } from "vuex";
import wc from "../shared/wc";
import WCKeyValueStore from "../shared/WCKeyValueStore";
import type { RootState } from "./index";
import type { GenesisNetwork } from "./publicData";
import {
  bytesToBase64,
  decodeArc60Request,
  validateAuthenticatorDataDomain,
  type Arc60StdSigData,
} from "../scripts/encoding/arc60";

type Web3WalletInstance = Awaited<ReturnType<typeof WalletKit.init>>;
// algosdk.decodeUnsignedTransaction()'s declared return type doesn't expose
// the type-specific fields (payment.*, assetTransfer.*, etc.) even though
// they exist on the actual decoded object at runtime (see CLAUDE.md's
// "algosdk.decodeUnsignedTransaction()" gotcha) - algosdk's own
// `Transaction` class carries these as optional properties, so intersecting
// with it (rather than `Record<string, any>`) gives real field types.
type DecodedAlgorandTransaction = ReturnType<
  typeof algosdk.decodeUnsignedTransaction
> &
  algosdk.Transaction & {
    // algosdk.Transaction only exposes the sender as `.sender: Address`, not
    // `.from` - this optional field preserves the pre-existing (and, at
    // runtime, always-undefined) `.from` read below rather than changing
    // behavior; a real fix would switch that read to `.sender`.
    from?: { publicKey: Uint8Array };
  };

/** WalletConnect v1 session/connector metadata, keyed by client id. */
export interface ConnectorRecord {
  id?: number | string;
  address?: string;
  connected?: boolean;
  requests?: string[];
  peer?: {
    icons: string[];
    url: string;
    description: string;
    name: string;
  };
}

export interface DecodedTransactionSummary {
  index: number;
  type: string;
  from?: string;
  fee?: number;
  asset: string | number;
  amount?: number | string;
  rekeyTo?: string;
  /** closeRemainderTo (pay) / assetCloseTo (axfer) — drains the entire remaining balance/holding. */
  closeTo?: string;
  txn: DecodedAlgorandTransaction;
  txnB64: string;
}

export interface StoredRequest {
  id: number | string;
  method: string;
  transactions: DecodedTransactionSummary[];
  fee: number;
  ver: string;
  topic: string;
}

interface ApproveSessionPayload {
  id: number | string;
  allAccounts?: boolean;
}

interface RejectSessionPayload {
  id: number | string;
}

interface ConnectUriPayload {
  uri: string;
}

interface RequestPayload {
  data: StoredRequest;
}

/** One decoded item from an ARC-60 `algo_signData` WalletConnect request. */
export interface StoredSignDataItem {
  index: number;
  data: string; // base64
  dataText?: string;
  signer: string; // resolved Algorand address
  domain: string;
  requestId?: string;
  authenticatorData: string; // base64
  hdPath?: string;
  scope: number;
  encoding: string;
  domainValid: boolean;
  signature?: string; // base64, set once signed
}

export interface StoredSignDataRequest {
  id: number | string;
  method: string;
  items: StoredSignDataItem[];
  topic: string;
}

interface SignDataRequestPayload {
  data: StoredSignDataRequest;
}

interface SignDataItemPayload {
  requestId: number | string;
  index: number;
}

/** One entry of the `algo_signTxn` WalletConnect request's params array. */
interface AlgoSignTxnParam {
  txn: string;
}

/**
 * Shape of the raw msgpack-decoded object returned by `algosdk.decodeObj()`
 * for a transaction that may or may not already be signature-wrapped
 * (`{ txn: {...}, sig: ... }`) - `algosdk.decodeObj()` itself is typed to
 * return `unknown` since it can decode arbitrary msgpack, so this describes
 * only the envelope fields this code actually reads before re-encoding and
 * passing the inner txn through `algosdk.decodeUnsignedTransaction()`.
 */
type RawDecodedTxnEnvelope = Record<string, unknown> & {
  type?: string;
  txn?: RawDecodedTxnEnvelope;
  sig?: Uint8Array;
};

type SignedTxnMap = Record<string, Uint8Array | null | undefined>;

const ensureNumericId = (value: number | string): number => {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid WalletConnect request id");
  }
  return parsed;
};

export interface ActiveSessionRecord {
  topic: string;
  peer?: {
    icons: string[];
    url: string;
    description: string;
    name: string;
  };
  accounts: string[];
}

export interface WcState {
  connectors: ConnectorRecord[];
  requests: StoredRequest[];
  signDataRequests: StoredSignDataRequest[];
  web3wallet: Web3WalletInstance | null;
  sessionProposals: WalletKitTypes.EventArguments["session_proposal"][];
  sessionRequests: WalletKitTypes.EventArguments["session_request"][];
  // "auth_request" / "call_request" / "subscription_created" / "algo_signTxn"
  // are not part of WalletKitTypes.Event - WalletKit (@reown/walletkit) only
  // declares session_proposal/session_request/session_delete/proposal_expire/
  // session_request_expire/session_authenticate (see
  // node_modules/@reown/walletkit/dist/types/types/client.d.ts). These
  // listeners are speculative/legacy hooks for events the library never
  // actually emits (nothing in this codebase reads these four state arrays
  // back out), so there is no real event payload type to reference.
  authRequests: unknown[];
  callRequests: unknown[];
  subscriptions: unknown[];
  algoSignTxns: unknown[];
  activeSessions: ActiveSessionRecord[];
  wc1Enabled: boolean;
}

const state = (): WcState => ({
  connectors: [],
  requests: [],
  signDataRequests: [],
  web3wallet: null,
  sessionProposals: [],
  sessionRequests: [],
  authRequests: [],
  callRequests: [],
  subscriptions: [],
  algoSignTxns: [],
  activeSessions: [],
  wc1Enabled: false,
});

const mutations: MutationTree<WcState> = {
  clear(currentState) {
    currentState.connectors.length = 0;
    currentState.requests.length = 0;
  },
  addConnector(currentState, connector: ConnectorRecord) {
    currentState.connectors.push(connector);
  },
  removeConnector(currentState, id: number | string) {
    const index = currentState.connectors.findIndex((r) => r.id === id);
    if (index !== -1) {
      currentState.connectors.splice(index, 1);
    }
  },
  updateConnector(
    currentState,
    payload: { id: number | string; update: ConnectorRecord }
  ) {
    const connector = currentState.connectors.find((r) => r.id === payload.id);
    if (connector) {
      Object.assign(connector, payload.update);
    }
  },
  addRequest(currentState, { request }: { request: StoredRequest }) {
    currentState.requests.push(request);
  },
  removeRequest(currentState, id: number | string) {
    const index = currentState.requests.findIndex(
      (r) => String(r.id) === String(id)
    );
    if (index !== -1) {
      currentState.requests.splice(index, 1);
    }
  },
  addSignDataRequest(
    currentState,
    { request }: { request: StoredSignDataRequest }
  ) {
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
  setWeb3wallet(currentState, web3wallet: Web3WalletInstance | null) {
    currentState.web3wallet = web3wallet;
  },
  addSessionProposal(
    currentState,
    sessionProposal: WalletKitTypes.EventArguments["session_proposal"]
  ) {
    currentState.sessionProposals.push(sessionProposal);
  },
  removeSessionProposal(currentState, id: number | string) {
    const index = currentState.sessionProposals.findIndex(
      (proposal) => String(proposal?.id) === String(id)
    );
    if (index !== -1) {
      currentState.sessionProposals.splice(index, 1);
    }
  },
  addSessionRequest(
    currentState,
    sessionRequest: WalletKitTypes.EventArguments["session_request"]
  ) {
    currentState.sessionRequests.push(sessionRequest);
  },
  addAuthRequest(currentState, authRequest: unknown) {
    currentState.authRequests.push(authRequest);
  },
  addCallRequest(currentState, callRequest: unknown) {
    currentState.callRequests.push(callRequest);
  },
  addSubscription(currentState, subscription: unknown) {
    currentState.subscriptions.push(subscription);
  },
  addAlgoSignTxn(currentState, algoSignTxn: unknown) {
    currentState.algoSignTxns.push(algoSignTxn);
  },
  setActiveSessions(currentState, sessions: ActiveSessionRecord[]) {
    currentState.activeSessions = sessions;
  },
  setWc1Enabled(currentState, enabled: boolean) {
    currentState.wc1Enabled = enabled;
  },
  reset(currentState) {
    Object.assign(currentState, state());
  },
};

const actions: ActionTree<WcState, RootState> = {
  async init({ commit, dispatch, rootState }) {
    const { walletConnectProjectId, walletConnectMetadata } = rootState.config;

    if (!walletConnectProjectId || !walletConnectMetadata) {
      throw new Error("WalletConnect ProjectId Not initialized");
    }

    const store = new WCKeyValueStore(dispatch);

    const core = new Core({
      projectId: walletConnectProjectId,
      storage: store,
    });

    const web3wallet = await WalletKit.init({
      core,
      metadata: walletConnectMetadata,
    });

    commit("setWeb3wallet", web3wallet);

    await dispatch("refreshActiveSessions");

    web3wallet.on("session_proposal", async (sessionProposal) => {
      commit("addSessionProposal", sessionProposal);
    });

    web3wallet.on("session_delete", async () => {
      await dispatch("refreshActiveSessions");
    });

    web3wallet.on("session_request", async (sessionRequest) => {
      commit("addSessionRequest", sessionRequest);

      const request = sessionRequest?.params?.request;

      // @walletconnect/types declares session_request's `request.params` as
      // `any` (see node_modules/@walletconnect/types/dist/types/sign-client/
      // client.d.ts, EventArguments.session_request) - it's opaque JSON-RPC
      // params whose shape depends entirely on the DApp-chosen `method`, so
      // it's narrowed manually per method below rather than at the source.
      if (request?.method === "algo_signData") {
        const rawItems: Arc60StdSigData[] = Array.isArray(request.params?.[0])
          ? request.params[0]
          : [];

        const items: StoredSignDataItem[] = [];
        for (let index = 0; index < rawItems.length; index += 1) {
          const rawItem = rawItems[index];
          try {
            const decoded = decodeArc60Request(rawItem);
            const domainValid = await validateAuthenticatorDataDomain(
              decoded.authenticatorData,
              decoded.domain
            );
            let dataText: string | undefined;
            try {
              const text = Buffer.from(decoded.data).toString("utf-8");
              if (/^[\x20-\x7E\s]*$/.test(text)) {
                dataText = text;
              }
            } catch {
              dataText = undefined;
            }
            let signer = rawItem.signer;
            try {
              signer = algosdk.encodeAddress(
                Buffer.from(rawItem.signer, "base64")
              );
            } catch {
              signer = rawItem.signer;
            }
            items.push({
              index,
              data: rawItem.data,
              dataText,
              signer,
              domain: decoded.domain,
              requestId: decoded.requestId,
              authenticatorData: rawItem.authenticatorData,
              hdPath: decoded.hdPath,
              scope: decoded.scope,
              encoding: decoded.encoding,
              domainValid,
            });
          } catch (error) {
            console.error("Failed to decode algo_signData item", error);
          }
        }

        const signDataRequest: StoredSignDataRequest = {
          id: ensureNumericId(sessionRequest.id),
          method: request.method,
          items,
          topic: sessionRequest.topic,
        };

        commit("addSignDataRequest", { request: signDataRequest });
        return;
      }

      if (request?.method !== "algo_signTxn") {
        console.error("request.method not implemented", request?.method);
        return;
      }

      const firstParam: unknown = Array.isArray(request.params)
        ? request.params[0]
        : undefined;

      const rawTransactions: AlgoSignTxnParam[] = Array.isArray(firstParam)
        ? firstParam
        : [];

      const transactions: DecodedTransactionSummary[] = rawTransactions.map(
        (item, index) => {
          const txnB64 = String(item?.txn ?? "");
          const txnBuffer = Buffer.from(txnB64, "base64");
          const decodedObj = algosdk.decodeObj(
            txnBuffer
          ) as RawDecodedTxnEnvelope;
          let decodedTx = decodedObj;
          if (!decodedTx.type && decodedTx.txn?.type) {
            if (decodedTx.sig) {
              dispatch(
                "signer/setSigned",
                { signed: new Uint8Array(txnBuffer) },
                { root: true }
              );
            }
            decodedTx = decodedTx.txn;
          }
          const decoded = algosdk.decodeUnsignedTransaction(
            algosdk.encodeObj(decodedTx)
          ) as DecodedAlgorandTransaction;

          let asset: string | number = "";
          switch (decoded.type) {
            case "pay":
              asset = "ALGO";
              break;
            case "axfer":
              asset = decoded.assetTransfer?.assetIndex?.toString() ?? "";
              break;
            default:
              asset = decoded.type ?? "";
              break;
          }

          const rawAmount =
            decoded.payment?.amount ?? decoded.assetTransfer?.amount;
          let amount: number | string | undefined =
            typeof rawAmount === "bigint" ? rawAmount.toString() : rawAmount;
          if (decoded.type === "pay" || decoded.type === "axfer") {
            if (!amount) {
              amount = "0";
            }
          }

          let from: string | undefined;
          if (decoded.from?.publicKey) {
            from = algosdk.encodeAddress(decoded.from.publicKey);
          }

          let rekeyTo: string | undefined;
          if (decoded.rekeyTo?.publicKey) {
            rekeyTo = algosdk.encodeAddress(decoded.rekeyTo.publicKey);
          }

          let closeTo: string | undefined;
          const closeAddr =
            decoded.payment?.closeRemainderTo ??
            decoded.assetTransfer?.closeRemainderTo;
          if (closeAddr?.publicKey) {
            closeTo = algosdk.encodeAddress(closeAddr.publicKey);
          }

          const feeValue = decoded.fee ?? 0;

          return {
            index,
            type: decoded.type ?? "",
            from,
            fee: typeof feeValue === "bigint" ? Number(feeValue) : feeValue,
            asset,
            amount,
            rekeyTo,
            closeTo,
            txn: decoded,
            txnB64,
          };
        }
      );

      const totalFee = transactions.reduce((fee, tx) => fee + (tx.fee ?? 0), 0);

      const requestToStore: StoredRequest = {
        id: ensureNumericId(sessionRequest.id),
        method: request.method,
        transactions,
        fee: totalFee,
        ver: "2",
        topic: sessionRequest.topic,
      };

      commit("addRequest", { request: requestToStore });
    });

    // "auth_request" / "call_request" / "subscription_created" /
    // "algo_signTxn" aren't part of WalletKitTypes.Event (WalletKit only
    // emits session_proposal/session_request/session_delete/proposal_expire/
    // session_request_expire/session_authenticate - see
    // node_modules/@reown/walletkit/dist/types/types/client.d.ts), so the
    // strictly-typed `on()` overload rejects these event names at compile
    // time. Cast to bypass that check for these speculative/legacy listeners
    // (nothing in this codebase reads the resulting state back out).
    const walletWithEvents = web3wallet as unknown as {
      on(event: string, listener: (payload: unknown) => void): void;
    };
    walletWithEvents.on("auth_request", (authRequest) => {
      commit("addAuthRequest", authRequest);
    });
    walletWithEvents.on("call_request", (callRequest) => {
      commit("addCallRequest", callRequest);
    });
    walletWithEvents.on("subscription_created", (subscription) => {
      commit("addSubscription", subscription);
    });
    walletWithEvents.on("algo_signTxn", (algoSignTxn) => {
      commit("addAlgoSignTxn", algoSignTxn);
    });
  },
  async approveSession(
    { commit, dispatch, state, rootState },
    payload: ApproveSessionPayload
  ) {
    await dispatch("publicData/getCurrentChainId", null, { root: true });

    const genesisList = rootState.publicData.genesisList ?? [];
    const lastActive = rootState.wallet.lastActiveAccount;
    const chains = genesisList.map(
      (network: GenesisNetwork) => `algorand:${network.CAIP10}`
    );
    const accounts = genesisList.map(
      (network: GenesisNetwork) => `algorand:${network.CAIP10}:${lastActive}`
    );

    if (payload.allAccounts) {
      for (const address of rootState.wallet.privateAccounts) {
        for (const network of genesisList) {
          if (address?.data?.[network.network]) {
            const entry = `algorand:${network.CAIP10}:${address.addr}`;
            if (!accounts.includes(entry)) {
              accounts.push(entry);
            }
          }
        }
      }
    }

    const { web3wallet } = state;
    if (!web3wallet) {
      throw new Error("WalletConnect session is not initialized");
    }

    const requestId = ensureNumericId(payload.id);

    await web3wallet.approveSession({
      id: requestId,
      namespaces: {
        algorand: {
          accounts,
          methods: ["algo_signTxn", "algo_signData"],
          chains,
          events: ["chainChanged", "accountsChanged"],
        },
      },
    });

    commit("removeSessionProposal", payload.id);
    await dispatch("refreshActiveSessions");
  },
  async refreshActiveSessions({ commit, state }) {
    const { web3wallet } = state;
    if (!web3wallet) {
      commit("setActiveSessions", []);
      return;
    }
    const sessions = web3wallet.getActiveSessions();
    const records: ActiveSessionRecord[] = Object.values(sessions).map(
      (session: SessionTypes.Struct) => ({
        topic: session.topic,
        peer: session.peer?.metadata
          ? {
              icons: session.peer.metadata.icons ?? [],
              url: session.peer.metadata.url ?? "",
              description: session.peer.metadata.description ?? "",
              name: session.peer.metadata.name ?? "",
            }
          : undefined,
        accounts: session.namespaces?.algorand?.accounts ?? [],
      })
    );
    commit("setActiveSessions", records);
  },
  async disconnectSession({ dispatch, state }, { topic }: { topic: string }) {
    const { web3wallet } = state;
    if (!web3wallet) {
      throw new Error("WalletConnect session is not initialized");
    }
    await web3wallet.disconnectSession({
      topic,
      reason: {
        code: 6000,
        message: "User disconnected.",
      },
    });
    await dispatch("refreshActiveSessions");
  },
  async enableWc1({ commit }) {
    await wc.restore();
    commit("setWc1Enabled", true);
  },
  async rejectSession({ commit, state }, payload: RejectSessionPayload) {
    const { web3wallet } = state;
    if (!web3wallet) {
      throw new Error("WalletConnect session is not initialized");
    }
    const requestId = ensureNumericId(payload.id);
    try {
      await web3wallet.rejectSession({
        id: requestId,
        reason: {
          message: "User rejected methods.",
          code: 5002,
        },
      });
    } finally {
      commit("removeSessionProposal", payload.id);
    }
  },
  async connectUri({ state, rootState }, { uri }: ConnectUriPayload) {
    const { version } = parseUri(uri);
    const last = rootState.wallet.lastActiveAccount;
    if (version === 1) {
      wc.createConnector(uri, last);
      return;
    }

    const { web3wallet } = state;
    if (!web3wallet) {
      throw new Error("WalletConnect session is not initialized");
    }

    try {
      await web3wallet.pair({ uri, activatePairing: true });
    } catch (err) {
      console.error("unable to pair", err);
    }
  },
  async sendResult({ commit, state, rootState }, { data }: RequestPayload) {
    if (String(data.ver) !== "2") {
      await wc.acceptRequest(data.id);
      return;
    }

    const { web3wallet } = state;
    if (!web3wallet) {
      throw new Error("WalletConnect session is not initialized");
    }

    const signedMap: SignedTxnMap =
      (
        rootState.signer as {
          signed?: SignedTxnMap;
        }
      ).signed ?? {};

    const signedTxns = data.transactions.map((item) => {
      try {
        const txnBuffer = Buffer.from(item.txnB64, "base64");
        const decodedTx = algosdk.decodeUnsignedTransaction(txnBuffer);
        const txId = decodedTx.txID();
        const signedUint8 = signedMap[txId];
        if (!signedUint8) {
          console.error(`Tx with id ${txId} has not been signed yet, skipped`);
          return null;
        }
        return Buffer.from(signedUint8).toString("base64");
      } catch (error) {
        console.error("Failed to encode signed txn", error);
        return null;
      }
    });

    const response = {
      id: ensureNumericId(data.id),
      result: signedTxns,
      jsonrpc: "2.0",
    };

    await web3wallet.respondSessionRequest({
      topic: data.topic,
      response,
    });

    commit("removeRequest", data.id);
  },
  async cancelRequest({ commit, state }, { data }: RequestPayload) {
    if (String(data.ver) !== "2") {
      await wc.rejectRequest(data.id);
      commit("removeRequest", data.id);
      return;
    }

    const { web3wallet } = state;
    if (!web3wallet) {
      throw new Error("WalletConnect session is not initialized");
    }

    const response = {
      id: ensureNumericId(data.id),
      jsonrpc: "2.0",
      error: {
        code: 5000,
        message: "User rejected.",
      },
    };

    try {
      await web3wallet.respondSessionRequest({
        topic: data.topic,
        response,
      });
    } finally {
      commit("removeRequest", data.id);
    }
  },
  async signSignDataItem(
    { commit, dispatch, state },
    { requestId, index }: SignDataItemPayload
  ) {
    const request = state.signDataRequests.find(
      (r) => String(r.id) === String(requestId)
    );
    const item = request?.items.find((i) => i.index === index);
    if (!item) {
      throw new Error("Sign data request item was not found");
    }
    if (!item.domainValid) {
      throw new Error(
        "authenticatorData does not match the requesting domain — refusing to sign."
      );
    }
    // AW-2026-044 / AW-2026-046: resolve the request's actual session so the
    // signer action can check the claimed domain and signer account against
    // it, rather than trusting values the DApp put in the request itself.
    const { web3wallet } = state;
    const session = web3wallet
      ? web3wallet.getActiveSessions()[request!.topic]
      : undefined;
    const sessionOrigin = session?.peer?.metadata?.url;
    const approvedAccounts = (
      session?.namespaces?.algorand?.accounts ?? []
    ).map((entry: string) => entry.split(":").pop());
    const signature: Uint8Array = await dispatch(
      "signer/signArc60Data",
      {
        from: item.signer,
        data: new Uint8Array(Buffer.from(item.data, "base64")),
        authenticatorData: new Uint8Array(
          Buffer.from(item.authenticatorData, "base64")
        ),
        domain: item.domain,
        sessionOrigin,
        approvedAccounts,
      },
      { root: true }
    );
    commit("setSignDataItemSignature", {
      requestId,
      index,
      signature: bytesToBase64(signature),
    });
  },
  async sendSignDataResult(
    { commit, state },
    { data }: SignDataRequestPayload
  ) {
    const { web3wallet } = state;
    if (!web3wallet) {
      throw new Error("WalletConnect session is not initialized");
    }

    const result = data.items.map((item) => {
      if (!item.signature) {
        console.error(`Sign data item ${item.index} has not been signed yet, skipped`);
        return null;
      }
      return { signature: item.signature };
    });

    const response = {
      id: ensureNumericId(data.id),
      result,
      jsonrpc: "2.0",
    };

    await web3wallet.respondSessionRequest({
      topic: data.topic,
      response,
    });

    commit("removeSignDataRequest", data.id);
  },
  /**
   * Tears down the live WalletKit/Core instance and wipes every piece of
   * in-memory WalletConnect state. Must run on logout (and before a
   * different wallet is opened) — otherwise the already-initialized
   * WalletKit instance keeps the previous wallet's sessions/pairings/keys
   * cached in memory even after `state.wallet.wc` (its on-disk storage) is
   * swapped for the newly opened wallet's own blob, since WalletKit only
   * reads storage once at `init()` time. That desync is what made
   * WalletConnect "unavailable" after logout+login: the Connect page only
   * gates its Enable button on `state.wc.web3wallet` being null, so a
   * stale, never-cleared instance skipped re-init entirely.
   */
  async reset({ commit, state }) {
    // Commit the reset unconditionally and first: state must be wiped even
    // if best-effort teardown below throws or (worse) hangs on a network
    // call, since a stuck relay-close must never block logout / leave the
    // stale instance sitting in state.
    const { web3wallet } = state;
    commit("reset");
    if (web3wallet) {
      try {
        web3wallet.core.relayer.transportClose().catch((err: unknown) => {
          console.error("Failed to close WalletConnect relay transport", err);
        });
      } catch (err) {
        console.error("Failed to close WalletConnect relay transport", err);
      }
    }
  },
  async cancelSignDataRequest(
    { commit, state },
    { data }: SignDataRequestPayload
  ) {
    const { web3wallet } = state;
    if (!web3wallet) {
      throw new Error("WalletConnect session is not initialized");
    }

    const response = {
      id: ensureNumericId(data.id),
      jsonrpc: "2.0",
      error: {
        code: 5000,
        message: "User rejected.",
      },
    };

    try {
      await web3wallet.respondSessionRequest({
        topic: data.topic,
        response,
      });
    } finally {
      commit("removeSignDataRequest", data.id);
    }
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
