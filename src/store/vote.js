const state = () => ({
  assetId: "",
  voteTokens: [
    { name: "Algo", assetId: "-1", env: "mainnet-v1.0" },
    { name: "Vote Coin", assetId: "452399768", env: "mainnet-v1.0" },
    { name: "ASA Stats", assetId: "393537671", env: "mainnet-v1.0" },
    { name: "Algo", assetId: "-1", env: "testnet-v1.0" },
    { name: "Vote Coin", assetId: "48806985", env: "testnet-v1.0" },
    { name: "ASA Stats", assetId: "51768942", env: "testnet-v1.0" },
    { name: "Algo", assetId: "-1", env: "sandnet-v1" },
    { name: "Vote Coin", assetId: "12", env: "sandnet-v1" },
  ],
});

const mutations = {
  setTokens(state, voteTokens) {
    state.voteTokens = voteTokens;
  },
  setToken(state, assetId) {
    if (assetId) {
      state.assetId = assetId;
      localStorage.setItem("voteToken", assetId);
    }
  },
};
const actions = {
  async setToken({ commit }, { assetId }) {
    commit("setToken", assetId);
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
