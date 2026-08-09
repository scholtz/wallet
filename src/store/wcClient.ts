import { parseUri } from "@walletconnect/utils";
import UniversalProvider from "universal-provider-with-algorand";
import SignClient from "@walletconnect/sign-client";
import { Core } from "@walletconnect/core";
import type { ActionTree, MutationTree } from "vuex";
import wc from "../shared/wc";
import WCKeyValueStore from "../shared/WCKeyValueStore";
import type { RootState } from "./index";
import type { GenesisNetwork } from "./publicData";

type UniversalProviderInstance = Awaited<
  ReturnType<typeof UniversalProvider.init>
>;

/** WalletConnect v1 session/connector metadata, keyed by client id. */
type ConnectorRecord = {
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
};

/** Minimal shape read back out of a stored `wc/addRequest` request. */
interface StoredWcRequest {
  id: number | string;
}

const ensureNumericId = (value: number | string): number => {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid WalletConnect request id");
  }
  return parsed;
};

export interface WcClientState {
  connectors: ConnectorRecord[];
  requests: StoredWcRequest[];
  web3wallet: UniversalProviderInstance | null;
  // UniversalProvider's `.on()` is untyped (`any` event/listener - see the
  // comment in the `init` action below), so these event payloads have no
  // real type to reference; `unknown` is the honest representation.
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
  reset(currentState) {
    Object.assign(currentState, state());
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
  addRequest(currentState, { request }: { request: StoredWcRequest }) {
    currentState.requests.push(request);
  },
  removeRequest(currentState, id: number | string) {
    const index = currentState.requests.findIndex(
      (request) => request?.id === id
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
      // `universal-provider-with-algorand` depends on its own transitive
      // copy of @walletconnect/sign-client (2.14.0) while this app's own
      // dependency graph resolves a newer one (2.23.10, via pnpm's strict,
      // non-hoisted node_modules - see two separate `.pnpm/@walletconnect+
      // sign-client@*` trees). Both are structurally the real `SignClient`
      // class, just with an internal (pino logger) type nominally
      // incompatible between the two copies, so a same-shape cast (not
      // `any`) is the accurate way to bridge them.
      client: client as unknown as Parameters<
        typeof UniversalProvider.init
      >[0]["client"],
    });

    // UniversalProvider's own `.on(event, listener)` is typed
    // `(event: any, listener: any) => void` by the library itself (see
    // node_modules/universal-provider-with-algorand/dist/types/
    // UniversalProvider.d.ts) - it defines no per-event payload types at
    // all, unlike WalletKit/SignClient's `EventArguments` map, so listener
    // params below are annotated `unknown` (the honest "could be anything"
    // type) rather than trusting an unverifiable shape.
    provider.on("session_proposal", async (sessionProposal: unknown) => {
      commit("addSessionProposal", sessionProposal);
    });
    provider.on("session_request", async (sessionRequest: unknown) => {
      commit("addSessionRequest", sessionRequest);
    });
    provider.on("auth_request", async (authRequest: unknown) => {
      commit("addAuthRequest", authRequest);
    });
    provider.on("call_request", async (callRequest: unknown) => {
      commit("addCallRequest", callRequest);
    });
    provider.on("subscription_created", async (subscription: unknown) => {
      commit("addSubscription", subscription);
    });
    provider.on("algo_signTxn", async (algoSignTxn: unknown) => {
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
      (network: GenesisNetwork) => `algorand:${network.CAIP10}`
    );
    const accounts = genesisList.map(
      (network: GenesisNetwork) => `algorand:${network.CAIP10}:${lastActive}`
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
  /** See wc.ts's `reset` action — same reasoning applies to this module's UniversalProvider instance. */
  async reset({ commit, state }) {
    const { web3wallet } = state;
    commit("reset");
    if (web3wallet) {
      try {
        web3wallet.client.core.relayer.transportClose().catch((err: unknown) => {
          console.error("Failed to close WalletConnect relay transport", err);
        });
      } catch (err) {
        console.error("Failed to close WalletConnect relay transport", err);
      }
    }
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
