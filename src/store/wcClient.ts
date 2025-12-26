import { parseUri } from "@walletconnect/utils";
import UniversalProvider from "universal-provider-with-algorand";
import SignClient from "@walletconnect/sign-client";
import { Core } from "@walletconnect/core";
import type { ActionTree, MutationTree } from "vuex";
import wc from "../shared/wc";
import WCKeyValueStore from "../shared/WCKeyValueStore";
import type { RootState } from "./index";

type UniversalProviderInstance = Awaited<
  ReturnType<typeof UniversalProvider.init>
>;

type ConnectorRecord = {
  id?: number | string;
  [key: string]: unknown;
};

const ensureNumericId = (value: number | string): number => {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid WalletConnect request id");
  }
  return parsed;
};

export interface WcClientState {
  connectors: ConnectorRecord[];
  requests: unknown[];
  web3wallet: UniversalProviderInstance | null;
  sessionProposals: unknown[];
  sessionRequests: unknown[];
  authRequests: unknown[];
  callRequests: unknown[];
  subscriptions: unknown[];
  algoSignTxns: unknown[];
}

const state = (): WcClientState => ({
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

const mutations: MutationTree<WcClientState> = {
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
  addRequest(currentState, { request }: { request: unknown }) {
    currentState.requests.push(request);
  },
  removeRequest(currentState, id: number | string) {
    const index = currentState.requests.findIndex(
      (request: any) => request?.id === id
    );
    if (index !== -1) {
      currentState.requests.splice(index, 1);
    }
  },
  setWeb3wallet(currentState, web3wallet: UniversalProviderInstance | null) {
    currentState.web3wallet = web3wallet;
  },
  addSessionProposal(currentState, sessionProposal: unknown) {
    currentState.sessionProposals.push(sessionProposal);
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

const actions: ActionTree<WcClientState, RootState> = {
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

    const client = await SignClient.init({
      logger: "debug",
      projectId: walletConnectProjectId,
      metadata: walletConnectMetadata,
      storage: store,
      core,
    });

    const provider = await UniversalProvider.init({
      logger: "debug",
      projectId: walletConnectProjectId,
      metadata: walletConnectMetadata,
      client: client as any,
    });

    const providerWithEvents: any = provider;
    providerWithEvents.on(
      "session_proposal",
      async (sessionProposal: unknown) => {
        commit("addSessionProposal", sessionProposal);
      }
    );
    providerWithEvents.on(
      "session_request",
      async (sessionRequest: unknown) => {
        commit("addSessionRequest", sessionRequest);
      }
    );
    providerWithEvents.on("auth_request", async (authRequest: unknown) => {
      commit("addAuthRequest", authRequest);
    });
    providerWithEvents.on("call_request", async (callRequest: unknown) => {
      commit("addCallRequest", callRequest);
    });
    providerWithEvents.on(
      "subscription_created",
      async (subscription: unknown) => {
        commit("addSubscription", subscription);
      }
    );
    providerWithEvents.on("algo_signTxn", async (algoSignTxn: unknown) => {
      commit("addAlgoSignTxn", algoSignTxn);
    });

    commit("setWeb3wallet", provider);
    return provider;
  },
  async approveSession(
    { rootState, dispatch },
    { id, allAccounts }: { id: number | string; allAccounts?: boolean }
  ) {
    const web3wallet = rootState.wc.web3wallet;
    if (!web3wallet) {
      throw new Error("WalletConnect session is not initialized");
    }

    await dispatch("publicData/getCurrentChainId", null, { root: true });

    const genesisList = rootState.publicData.genesisList ?? [];
    const lastActive = rootState.wallet.lastActiveAccount;
    const chains = genesisList.map(
      (network: any) => `algorand:${network.CAIP10}`
    );
    const accounts = genesisList.map(
      (network: any) => `algorand:${network.CAIP10}:${lastActive}`
    );

    if (allAccounts) {
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

    const requestId = ensureNumericId(id);

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
  },
  async connectUri({ rootState }, { uri }: { uri: string }) {
    const { version } = parseUri(uri);
    const lastUsed =
      localStorage.getItem("lastUsedWallet") ??
      rootState.wallet.lastActiveAccount;
    if (version === 1) {
      wc.createConnector(uri, lastUsed);
      return;
    }

    const web3wallet = rootState.wc.web3wallet;
    if (!web3wallet) {
      throw new Error("WalletConnect session is not initialized");
    }

    try {
      await web3wallet.pair({ uri, activatePairing: true });
    } catch (err) {
      console.error("unable to pair", err);
    }
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
