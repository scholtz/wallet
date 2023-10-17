const state = () => ({
  debug: false,
  LOGO: "/img/logo.svg",
  env: "mainnet-v1.0",
  envName: "Mainnet",
  tokenSymbol: "Algo",
  algod: "https://mainnet-api.algonode.cloud",
  participation: "",
  indexer: "https://mainnet-idx.algonode.cloud",
  algodToken:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  participationToken:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  indexerToken:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  twoFactorServer: "",
  walletConnectProjectId: "372941d972266817e1a8d1e403769ac0",
  walletConnectMetadata: {
    name: 'AWallet',
    description: 'Open source community algorand wallet',
    url: 'www.a-wallet.net',
    icons: []
  },
  languages: ["en", "hu", "it", "nl", "sk", "cs"],
  noredirect: false, // redirect to account page after successfull login
  dev: false,
  language: "en-US"
});

const mutations = {
  setDev(state, value) {
    localStorage.setItem("dev", value);
    state.dev = value;
  },
  setConfig(state, value) {
    const removeConsoleLogs = !value.debug;

    console.info("Welcome to AWallet");
    if (removeConsoleLogs) {
      console.info("Logs has been removed in production environment");
      if (!window.console) window.console = {};
      const methods = ["log", "debug", "warn", "info"];
      for (var i = 0; i < methods.length; i++) {
        console[methods[i]] = function () {};
      }
    }

    if (value.walletConnectProjectId) {
      state.walletConnectProjectId = value.walletConnectProjectId;
    }
    if (value.walletConnectMetadata) {
      state.walletConnectMetadata = value.walletConnectMetadata;
    }
    if (value.LOGO) {
      state.LOGO = value.LOGO;
    }
    if (value.algod) {
      state.algod = value.algod;
    }
    if (value.participation) {
      state.participation = value.participation;
    }
    if (value.languages) {
      state.languages = value.languages;
    }
    if (value.indexer) {
      state.indexer = value.indexer;
    }
    if (value.algodToken) {
      state.algodToken = value.algodToken;
    }
    if (value.participationToken) {
      state.participationToken = value.participationToken;
    }
    if (value.indexerToken) {
      state.indexerToken = value.indexerToken;
    }

    const dev = localStorage.getItem("dev");
    if (dev && dev != "false") {
      state.dev = true;
    }
    const algodHost = localStorage.getItem("algodHost");
    if (algodHost) {
      state.algod = algodHost;
    }
    const env = localStorage.getItem("env");
    if (env) {
      state.env = env;
    }
    const envName = localStorage.getItem("envName");
    if (envName) {
      state.envName = envName;
    }

    const tokenSymbol = localStorage.getItem("tokenSymbol");
    if (tokenSymbol) {
      state.tokenSymbol = tokenSymbol;
    }

    const participationHost = localStorage.getItem("participationHost");
    if (participationHost) {
      state.participation = participationHost;
    }
    const indexerHost = localStorage.getItem("indexerHost");
    if (indexerHost) {
      state.indexer = indexerHost;
    }

    const algodToken = localStorage.getItem("algodToken");
    if (algodToken) {
      state.algodToken = algodToken;
    }
    const participationToken = localStorage.getItem("participationToken");
    if (participationToken) {
      state.participationToken = participationToken;
    }
    const indexerToken = localStorage.getItem("indexerToken");
    if (indexerToken) {
      state.indexerToken = indexerToken;
    }
    console.log("hosts", algodHost, participationHost, indexerHost);
  },
  setHosts(
    state,
    {
      env,
      envName,
      tokenSymbol,
      algod,
      participation,
      indexer,
      algodToken,
      participationToken,
      indexerToken,
    }
  ) {
    if (env) {
      state.env = env;
      localStorage.setItem("env", env);
    }
    if (envName) {
      state.envName = envName;
      localStorage.setItem("envName", envName);
    }
    if (tokenSymbol) {
      state.tokenSymbol = tokenSymbol;
      localStorage.setItem("tokenSymbol", tokenSymbol);
    }
    if (algod) {
      state.algod = algod;
      localStorage.setItem("algodHost", algod);
    }
    if (participation) {
      state.participation = participation;
      localStorage.setItem("participationHost", participation);
    }
    if (indexer) {
      state.indexer = indexer;
      localStorage.setItem("indexerHost", indexer);
    }
    if (algodToken) {
      state.algodToken = algodToken;
      localStorage.setItem("algodToken", algodToken);
    }
    if (participationToken) {
      state.participationToken = participationToken;
      localStorage.setItem("participationToken", participationToken);
    }
    if (indexerToken) {
      state.indexerToken = indexerToken;
      localStorage.setItem("indexerToken", indexerToken);
    }
  },
  setLanguage(state, value){
    state.language = value;
    localStorage.setItem("lang", value);
  },
  setNoRedirect(state) {
    state.noredirect = true;
    console.log("state.noredirect", state.noredirect);
  },
};
const actions = {
  async setHosts(
    { commit },
    {
      env,
      envName,
      algod,
      participation,
      indexer,
      algodToken,
      participationToken,
      indexerToken,
    }
  ) {

    let tokenSymbol = this.tokenSymbol;
    if (env == "mainnet" || env == "mainnet-v1.0") {
      tokenSymbol = "Algo";
    }
    else if (env == "aramidmain" || env == "aramidmain-v1.0") {
      tokenSymbol = "aAlgo";
    }
    else if (env == "voitestnet" || env == "voitest-v1") {
      tokenSymbol = "Voi";
    }
    else if (this.env == "voi" || env == "voi-v1.0") {//TODO - Support Voi Mainnet
      tokenSymbol = "Voi";
    }
    else if (env == "testnet" || env == "testnet-v1.0") {
      tokenSymbol = "Algo";
    }
    else if (env == "devnet") {
      tokenSymbol = "Algo";
    }
    else if (env == "sandbox" || env == "sandnet-v1") {
      tokenSymbol = "Algo";
    }
    
    await commit("setHosts", {
      env,
      envName,
      tokenSymbol,
      algod,
      participation,
      indexer,
      algodToken,
      participationToken,
      indexerToken,
    });
  },
  async setLanguage({ commit }, value){
    await commit("setLanguage", value)
  },
  async setEnv({ dispatch }, { env }) {
    if (env == "mainnet" || env == "mainnet-v1.0") {
      dispatch("setHosts", {
        env: "mainnet",
        envName: "Mainnet",
        algod: "https://mainnet-api.algonode.cloud",
        participation: "https://kmd.h2.a-wallet.net",
        indexer: "https://mainnet-idx.algonode.cloud",
      });
    }

    if (this.env == "aramidmain" || env == "aramidmain-v1.0") {
      dispatch("setHosts", {
        env: "aramidmain",
        envName: "Aramid Mainnet",
        algod: "https://algod.aramidmain.a-wallet.net",
        participation: "",
        indexer: "https://indexer.aramidmain.a-wallet.net",
        algodToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        participationToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        indexerToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });
    }
    
    if (this.env == "voitestnet" || env == "voitest-v1") {
      dispatch("setHosts", {
        env: "voitestnet",
        envName: "Voi Testnet",
        algod: "https://testnet-api.voi.nodly.io/",
        participation: "",
        indexer: "https://testnet-idx.voi.nodly.io/",
      });
    }

    //TODO: Add Voi Mainnet when live
    // if (this.env == "voi" || env == "") {
    //   dispatch("setHosts", {
    //     env: "voi",
    //     envName: "Voi Mainnet",
    //     algod: "",
    //     participation: "",
    //     indexer: "",
    //     algodToken:
    //       "",
    //     participationToken:
    //       "",
    //     indexerToken:
    //       "",
    //   });
    // }

    if (env == "testnet" || env == "testnet-v1.0") {
      dispatch("setHosts", {
        env: "testnet",
        envName: "Testnet",
        algod: "https://testnet-api.algonode.cloud",
        participation: "",
        indexer: "https://testnet-idx.algonode.cloud",
      });
    }
    if (env == "devnet") {
      dispatch("setHosts", {
        env: "devnet",
        envName: "Devnet",
        algod: "http://localhost:4180",
        participation: "",
        indexer: "http://localhost:8980",
        algodToken:
          "c87f5580d7a866317b4bfe9e8b8d1dda955636ccebfa88c12b414db208dd9705",
        indexerToken: "reach-devnet",
      });
    }
    if (env == "sandbox" || env == "sandnet-v1") {
      dispatch("setHosts", {
        env: "sandbox",
        envName: "Sandbox",
        algod: "http://localhost:4001",
        participation: "",
        indexer: "http://localhost:8980",
        algodToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        participationToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        indexerToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });
    }
    localStorage.setItem("env", env);
  },
  async setNoRedirect({ commit }) {
    await commit("setNoRedirect");
  },
  async setDev({ commit }, { dev }) {
    await commit("setDev", dev);
  },
  async getConfig({ dispatch, commit }) {
    try {
      const data = await dispatch(
        "axios/get",
        {
          url: "/config.json",
          silent: true,
        },
        { root: true }
      );
      if (data) {
        await commit("setConfig", data);
        return data;
      }
    } catch (error) {
      console.error(error);
    }
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
