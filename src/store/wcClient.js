import { parseUri } from "@walletconnect/utils";
import wc from "../shared/wc";
import WCKeyValueStore from "../shared/WCKeyValueStore";
import UniversalProvider from "universal-provider-with-algorand"; // wc ver 2
import SignClient from "@walletconnect/sign-client"; // wc ver 2
import { Core } from "@walletconnect/core"; // wc ver 2

const state = () => ({
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

const mutations = {
  clear(state) {
    state.connectors.length = 0;
    state.requests.length = 0;
  },
  addConnector(state, connector) {
    state.connectors.push(connector);
  },
  removeConnector(state, id) {
    const index = state.connectors.findIndex((r) => r.id == id);
    state.connectors.splice(index, 1);
  },
  updateConnector(state, { id, update }) {
    const connector = state.connectors.find((r) => r.id == id);
    Object.assign(connector, update);
  },
  addRequest(state, { request }) {
    state.requests.push(request);
  },
  removeRequest(state, id) {
    const index = state.requests.findIndex((r) => r.id == id);
    state.requests.splice(index, 1);
  },
  setWeb3wallet(state, web3wallet) {
    state.web3wallet = web3wallet;
  },
  addSessionProposal(state, sessionProposal) {
    state.sessionProposals.push(sessionProposal);
  },
  addSessionRequest(state, sessionRequest) {
    state.sessionRequests.push(sessionRequest);
  },
  addAuthRequest(state, authRequest) {
    state.authRequests.push(authRequest);
  },
  addCallRequest(state, callRequest) {
    state.callRequests.push(callRequest);
  },
  addSubscription(state, subscription) {
    state.subscriptions.push(subscription);
  },
  addAlgoSignTxn(state, algoSignTxn) {
    state.algoSignTxns.push(algoSignTxn);
  },
};
const actions = {
  async init({ commit, dispatch }) {
    const walletConnectProjectId = this.state.config.walletConnectProjectId;
    const walletConnectMetadata = this.state.config.walletConnectMetadata;
    if (!walletConnectProjectId || !walletConnectMetadata)
      throw Error("WalletConnect ProjectId Not initialized");

    const store = new WCKeyValueStore(dispatch);
    console.log("store", store);

    const core = await new Core({
      projectId: walletConnectProjectId,
      storage: store,
    });
    var client = await SignClient.init({
      logger: "debug",
      projectId: walletConnectProjectId,
      metadata: walletConnectMetadata,
      storage: store,
      core: core,
    });
    console.log("client", client);
    const provider = await UniversalProvider.init({
      logger: "debug",
      projectId: walletConnectProjectId,
      metadata: walletConnectMetadata,
      client: client,
    });

    provider.on("session_proposal", async (sessionProposal) => {
      console.log("wcclient.on session_proposal", sessionProposal);
      await commit("addSessionProposal", sessionProposal);
    });
    provider.on("session_request", async (sessionRequest) => {
      console.log("wcclient.on session_request", sessionRequest);
      await commit("addSessionRequest", sessionRequest);
    });
    provider.on("auth_request", async (authRequest) => {
      console.log("wcclient.on auth_request", authRequest);
      await commit("addAuthRequest", authRequest);
    });
    provider.on("call_request", async (callRequest) => {
      console.log("wcclient.on call_request", callRequest);
      await commit("addCallRequest", callRequest);
    });
    provider.on("subscription_created", async (subscription) => {
      console.log("wcclient.on subscription_created", subscription);
      await commit("addSubscription", subscription);
    });
    provider.on("algo_signTxn", async (algoSignTxn) => {
      console.log("wcclient.on algo_signTxn", algoSignTxn);
      await commit("addAlgoSignTxn", algoSignTxn);
    });

    return provider;
  },
  async approveSession({ commit, dispatch }, { id }) {
    console.log("wc.approveSession", id);
    const currentChain = await dispatch("publicData/getCurrentChainId", null, {
      root: true,
    });
    console.log("currentChain", currentChain);
    const lastActive = this.state.wallet.lastActiveAccount;
    const session = await this.state.wc.web3wallet.approveSession({
      id,
      namespaces: {
        algorand: {
          accounts: [`algorand:${currentChain}:${lastActive}`],
          methods: ["algo_signTxn"],
          chains: [`algorand:${currentChain}`],
          events: ["chainChanged", "accountsChanged"],
        },
        //skipPairing: true, // optional to skip pairing ( later it can be resumed by invoking .pair())
      },
    });
    console.log("approveSession", session);
  },
  async connectUri({ commit }, { uri }) {
    console.log("connectUri", uri);
    const { version } = parseUri(uri);
    const last = localStorage.getItem("lastUsedWallet");
    if (version === 1) {
      console.log("wc connect v1 ", uri, last);
      wc.createConnector(uri, last);
    } else {
      console.log("wc connect v2 ", uri);
      try {
        await this.state.wc.web3wallet.pair({ uri, activatePairing: true });
      } catch (err) {
        console.error("unable to pair", err);
      }
      console.log("after pair", this.state.wc.web3wallet);
    }
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
