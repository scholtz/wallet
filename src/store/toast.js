const state = () => ({
  _vm: null,
  lastError: "",
});

const mutations = {
  setVM(state, vm) {
    state._vm = vm;
  },
  setLastError(state, lastError) {
    state.lastError = lastError;
  },
};
const actions = {
  setVM({ commit }, { _vm }) {
    commit("setVM", _vm);
  },
  async openSuccess({ commit }, m) {
    let message = m;
    if (m.summary) {
      message = m.summary;
    }
    if (!this.state.toast._vm) {
      alert(m);
      console.log("this", this, commit);
    } else {
      this.state.toast._vm.$toast.add({
        severity: "success",
        detail: message,
        life: 3000,
      });
    }
  },
  async openError({ commit }, m) {
    let message = m;
    if (m.summary) {
      message = m.summary;
    }
    console.error("Error:", m);
    if (!this.state.toast._vm) {
      alert(message);
      console.log("this", this, commit);
    } else {
      this.state.toast._vm.$toast.add({
        severity: "error",
        detail: message,
        life: 10000,
      });
    }
    commit("setLastError", m);
  },
  async resetError({ commit }, m) {
    commit("setLastError", "");
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
