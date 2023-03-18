const state = () => ({
  connectors: [],
  requests: [],
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
};

export default {
  namespaced: true,
  state,
  mutations,
};
