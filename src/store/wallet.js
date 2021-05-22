import algosdk from "algosdk";
const state = () => ({
  isOpen: false,
  privateAccounts: [],
  publicAccounts: [],
});

const mutations = {
  addPrivateAccount(state, mn) {
    state.privateAccounts.push(mn);
  },
};
const actions = {
  async addPrivateAccount({ dispatch, commit }, { mn }) {
    const secret = algosdk.mnemonicToSecretKey(mn);
    await commit("addPrivateAccount", secret);
    await dispatch("saveWallet");
  },
  async saveWallet() {
    console.log("saved ", this.state);
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
