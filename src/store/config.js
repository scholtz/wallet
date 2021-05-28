const state = () => ({
  LOGO: "",
  algod: "http://localhost:4001",
  kmd: "http://localhost:4002",
  indexer: "http://localhost:8980",
  algodToken:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  kmdToken: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  indexerToken:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
});

const mutations = {
  setConfig(state, value) {
    if (value.LOGO) {
      state.LOGO = value.LOGO;
    }
    if (value.algood) {
      state.algood = value.algood;
    }
    if (value.kmd) {
      state.kmd = value.kmd;
    }
    if (value.indexer) {
      state.indexer = value.indexer;
    }
    if (value.algoodToken) {
      state.algoodToken = value.algoodToken;
    }
    if (value.kmdToken) {
      state.kmdToken = value.kmdToken;
    }
    if (value.indexerToken) {
      state.indexerToken = value.indexerToken;
    }
  },
  setHosts(state, { algod, kmd, indexer, algodToken, kmdToken, indexerToken }) {
    if (algod) {
      state.algod = algod;
    }
    if (kmd) {
      state.kmd = kmd;
    }
    if (indexer) {
      state.indexer = indexer;
    }
    if (algodToken) {
      state.algodToken = algodToken;
    }
    if (kmdToken) {
      state.kmdToken = kmdToken;
    }
    if (indexerToken) {
      state.indexerToken = indexerToken;
    }
  },
};
const actions = {
  async setHosts({ commit }, { algod, kmd, indexer }) {
    await commit("setHosts", { algod, kmd, indexer });
  },
  async getConfig({ dispatch, commit }) {
    try {
      const data = await dispatch(
        "axios/get",
        {
          url: "./config.json",
        },
        { root: true }
      );
      if (data) {
        await commit("setConfig", data);
        await dispatch(
          "insurance/setCountry",
          { country: data.COUNTRY },
          {
            root: true,
          }
        );
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
