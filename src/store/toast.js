const state = () => ({
  _vm: null,
});

const mutations = {
  setVM(state, vm) {
    state._vm = vm;
    console.log("state._vm", state._vm);
  },
};
const actions = {
  setVM({ commit }, { _vm }) {
    commit("setVM", _vm);
    console.log("this.state._vm", this.state._vm);
  },
  async openSuccess({ commit }, m) {
    if (!this.state.toast._vm) {
      alert(m);
      console.log("this", this, commit);
    } else {
      this.state.toast._vm.$toast.add({
        severity: "success",
        detail: m,
        life: 3000,
      });
    }
  },
  async openError({ commit }, m) {
    if (!this.state.toast._vm) {
      alert(m);
      console.log("this", this, commit);
    } else {
      this.state.toast._vm.$toast.add({
        severity: "error",
        detail: m,
        life: 10000,
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
