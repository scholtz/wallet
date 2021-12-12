const state = () => ({
  assetId: "",
  voteTokens: 
  [
    {"name":"Algo","assetId":"-1","env":"mainnet"},
    {"name":"Algo","assetId":"-1","env":"testnet"},
    {"name":"Algo","assetId":"-1","env":"sandbox"},
    {"name":"Vote Coin","assetId":"452399768","env":"mainnet"},
    {"name":"Vote Coin","assetId":"48806985","env":"testnet"},
    {"name":"Vote Coin","assetId":"12","env":"sandbox"},
  ],
});

const mutations = {
  setTokens(state, voteTokens) {
    state.voteTokens = voteTokens;
  },
  setToken(state, assetId) {
    if(assetId){
      state.assetId = assetId;
      localStorage.setItem("voteToken",assetId)
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
