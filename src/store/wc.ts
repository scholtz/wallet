import { Core } from "@walletconnect/core";
import { Web3Wallet } from "@walletconnect/web3wallet";
import { parseUri } from "@walletconnect/utils";
import algosdk from "algosdk";
import type { ActionTree, MutationTree } from "vuex";
import wc from "../shared/wc";
import WCKeyValueStore from "../shared/WCKeyValueStore";
import type { RootState } from "./index";

type Web3WalletInstance = Awaited<ReturnType<typeof Web3Wallet.init>>;
type Web3WalletInitOptions = Parameters<typeof Web3Wallet.init>[0];
type DecodedAlgorandTransaction = ReturnType<
  typeof algosdk.decodeUnsignedTransaction
> &
  Record<string, any>;

interface ConnectorRecord {
  id?: number | string;
  [key: string]: unknown;
}

interface DecodedTransactionSummary {
  index: number;
  type: string;
  from?: string;
  fee?: number;
  asset: string | number;
  amount?: number | string;
  rekeyTo?: string;
  txn: DecodedAlgorandTransaction;
  txnB64: string;
}

interface StoredRequest {
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

type SignedTxnMap = Record<string, Uint8Array | null | undefined>;

const ensureNumericId = (value: number | string): number => {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid WalletConnect request id");
  }
  return parsed;
};

export interface WcState {
  connectors: ConnectorRecord[];
  requests: StoredRequest[];
  web3wallet: Web3WalletInstance | null;
  sessionProposals: unknown[];
  sessionRequests: unknown[];
  authRequests: unknown[];
  callRequests: unknown[];
  subscriptions: unknown[];
  algoSignTxns: unknown[];
}

const state = (): WcState => ({
  connectors: [],
  requests: [],
  web3wallet: null,
  sessionProposals: [],
  sessionRequests: [],
  authRequests: [],
  callRequests: [],
  subscriptions: [],
  algoSignTxns: [],
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
  setWeb3wallet(currentState, web3wallet: Web3WalletInstance | null) {
    currentState.web3wallet = web3wallet;
  },
  addSessionProposal(currentState, sessionProposal: unknown) {
    currentState.sessionProposals.push(sessionProposal);
  },
  removeSessionProposal(currentState, id: number | string) {
    const index = currentState.sessionProposals.findIndex(
      (proposal: any) => String(proposal?.id) === String(id)
    );
    if (index !== -1) {
      currentState.sessionProposals.splice(index, 1);
    }
  },
  addSessionRequest(currentState, sessionRequest: unknown) {
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

    const web3wallet = await Web3Wallet.init({
      core: core as unknown as Web3WalletInitOptions["core"],
      metadata: walletConnectMetadata,
    });

    commit("setWeb3wallet", web3wallet);

    web3wallet.on("session_proposal", async (sessionProposal) => {
      commit("addSessionProposal", sessionProposal);
    });

    web3wallet.on("session_request", async (sessionRequest: any) => {
      commit("addSessionRequest", sessionRequest);

      const request = sessionRequest?.params?.request;
      if (request?.method !== "algo_signTxn") {
        console.error("request.method not implemented", request?.method);
        return;
      }

      const firstParam = Array.isArray(request.params)
        ? request.params[0]
        : undefined;

      const rawTransactions = Array.isArray(firstParam) ? firstParam : [];

      const transactions: DecodedTransactionSummary[] = rawTransactions.map(
        (item: Record<string, any>, index: number) => {
          const txnB64 = String(item?.txn ?? "");
          const txnBuffer = Buffer.from(txnB64, "base64");
          const decodedObj = algosdk.decodeObj(txnBuffer) as Record<
            string,
            any
          >;
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
              asset = decoded.assetIndex ?? "";
              if (typeof decoded.assetIndex === "bigint") {
                asset = decoded.assetIndex.toString();
              }
              break;
            default:
              asset = decoded.type ?? "";
              break;
          }

          let amount: number | string | undefined = decoded.amount as
            | number
            | string
            | undefined;
          if (typeof decoded.amount === "bigint") {
            amount = decoded.amount.toString();
          }
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

          const feeValue = decoded.fee ?? 0;

          return {
            index,
            type: decoded.type ?? "",
            from,
            fee: typeof feeValue === "bigint" ? Number(feeValue) : feeValue,
            asset,
            amount,
            rekeyTo,
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

    const walletWithEvents: any = web3wallet;
    walletWithEvents.on("auth_request", async (authRequest: unknown) => {
      commit("addAuthRequest", authRequest);
    });
    walletWithEvents.on("call_request", async (callRequest: unknown) => {
      commit("addCallRequest", callRequest);
    });
    walletWithEvents.on(
      "subscription_created",
      async (subscription: unknown) => {
        commit("addSubscription", subscription);
      }
    );
    walletWithEvents.on("algo_signTxn", async (algoSignTxn: unknown) => {
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
      (network: any) => `algorand:${network.CAIP10}`
    );
    const accounts = genesisList.map(
      (network: any) => `algorand:${network.CAIP10}:${lastActive}`
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
          methods: ["algo_signTxn"],
          chains,
          events: ["chainChanged", "accountsChanged"],
        },
      },
    });

    commit("removeSessionProposal", payload.id);
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
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
