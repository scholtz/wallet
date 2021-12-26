const state = () => ({
  debug: false,
  LOGO: "/img/logo.svg",
  env: "mainnet",
  algod: "https://algoexplorerapi.io",
  kmd: "",
  indexer: "https://algoexplorerapi.io/idx2",
  algodToken:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  kmdToken: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  indexerToken:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  languages: ["en", "hu", "it", "nl", "sk", "cs"],
  noredirect: false, // redirect to account page after successfull login
});

const mutations = {
  setConfig(state, value) {
    const removeConsoleLogs = !value.debug;

    console.info("Welcome to AWallet");
    if (removeConsoleLogs) {
      console.info("Logs has been removed in production environment");
      if (!window.console) window.console = {};
      const methods = ["log", "debug", "warn", "info"];
      for (var i = 0; i < methods.length; i++) {
        console[methods[i]] = function() {};
      }
    }

    if (value.LOGO) {
      state.LOGO = value.LOGO;
    }
    if (value.algod) {
      state.algod = value.algod;
    }
    if (value.kmd) {
      state.kmd = value.kmd;
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
    if (value.kmdToken) {
      state.kmdToken = value.kmdToken;
    }
    if (value.indexerToken) {
      state.indexerToken = value.indexerToken;
    }

    const algodHost = localStorage.getItem("algodHost");
    if (algodHost) {
      state.algod = algodHost;
    }
    const env = localStorage.getItem("env");
    if (env) {
      state.env = env;
    }
    const kmdHost = localStorage.getItem("kmddHost");
    if (kmdHost) {
      state.kmd = kmdHost;
    }
    const indexerHost = localStorage.getItem("indexerHost");
    if (indexerHost) {
      state.indexer = indexerHost;
    }

    const algodToken = localStorage.getItem("algodToken");
    if (algodToken) {
      state.algodToken = algodToken;
    }
    const kmdToken = localStorage.getItem("kmdToken");
    if (kmdToken) {
      state.kmdToken = kmdToken;
    }
    const indexerToken = localStorage.getItem("indexerToken");
    if (indexerToken) {
      state.indexerToken = indexerToken;
    }
    console.log("hosts", algodHost, kmdHost, indexerHost);
  },
  setHosts(
    state,
    { env, algod, kmd, indexer, algodToken, kmdToken, indexerToken }
  ) {
    if (env) {
      state.env = env;
      localStorage.setItem("env", env);
    }
    if (algod) {
      state.algod = algod;
      localStorage.setItem("algodHost", algod);
    }
    if (kmd) {
      state.kmd = kmd;
      localStorage.setItem("kmdHost", kmd);
    }
    if (indexer) {
      state.indexer = indexer;
      localStorage.setItem("indexerHost", indexer);
    }
    if (algodToken) {
      state.algodToken = algodToken;
      localStorage.setItem("algodToken", algodToken);
    }
    if (kmdToken) {
      state.kmdToken = kmdToken;
      localStorage.setItem("kmdToken", kmdToken);
    }
    if (indexerToken) {
      state.indexerToken = indexerToken;
      localStorage.setItem("indexerToken", indexerToken);
    }
  },
  setNoRedirect(state) {
    state.noredirect = true;
    console.log("state.noredirect", state.noredirect);
  },
};
const actions = {
  async setHosts(
    { commit },
    { env, algod, kmd, indexer, algodToken, kmdToken, indexerToken }
  ) {
    await commit("setHosts", {
      env,
      algod,
      kmd,
      indexer,
      algodToken,
      kmdToken,
      indexerToken,
    });
  },
  async setEnv({ dispatch }, { env }) {
    if (env == "mainnet") {
      dispatch("setHosts", {
        env: "mainnet",
        algod: "https://algoexplorerapi.io",
        kmd: "?",
        indexer: "https://algoindexer.algoexplorerapi.io",
      });
    }
    if (env == "testnet") {
      dispatch("setHosts", {
        env: "testnet",
        algod: "https://testnet.algoexplorerapi.io",
        kmd: "?",
        indexer: "https://testnet.algoexplorerapi.io/idx2",
      });
    }
    if (env == "devnet") {
      dispatch("setHosts", {
        env: "devnet",
        algod: "http://localhost:4180",
        kmd: "http://localhost:4002",
        indexer: "http://localhost:8980",
        algodToken:
          "c87f5580d7a866317b4bfe9e8b8d1dda955636ccebfa88c12b414db208dd9705",
        indexerToken: "reach-devnet",
      });
    }
    if (env == "sandbox") {
      dispatch("setHosts", {
        env: "sandbox",
        algod: "http://localhost:4001",
        kmd: "http://localhost:4002",
        indexer: "http://localhost:8980",
        algodToken:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        kmdToken:
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
  async getConfig({ dispatch, commit }) {
    try {
      const data = await dispatch(
        "axios/get",
        {
          url: "/config.json",
        },
        { root: true }
      );
      if (data) {
        await commit("setConfig", data);
        return data;
      }
    } catch (error) {
      dispatch("snackbar/openError", error.response, {
        root: true,
      });
    }
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
