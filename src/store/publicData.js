const state = () => ({
  genesisList: [],
});

const mutations = {
  setGenesisList(state, genesisList) {
    state.genesisList = genesisList;
  },
};
const actions = {
  async getGenesisList({ dispatch, commit }) {
    try {
      if (this.state.publicData.genesisList.length == 0) {
        const data = await dispatch(
          "axios/get",
          {
            url: "https://scholtz.github.io/AlgorandPublicData/genesis/genesis-list.json",
          },
          { root: true }
        );
        await commit("setGenesisList", data);
      }
      return this.state.publicData.genesisList;
    } catch (error) {
      console.error("error", error, dispatch);
    }
  },
  async getAlgodList({ dispatch }, { chainId }) {
    try {
      return await dispatch(
        "axios/get",
        {
          url: `https://scholtz.github.io/AlgorandPublicData/algod/${chainId}/public-algod-providers.json`,
        },
        { root: true }
      );
    } catch (error) {
      console.error("error", error, dispatch);
    }
  },
  async getKMDList({ dispatch }, { chainId }) {
    try {
      return await dispatch(
        "axios/get",
        {
          url: `https://scholtz.github.io/AlgorandPublicData/kmd/${chainId}/public-kmd-providers.json`,
        },
        { root: true }
      );
    } catch (error) {
      console.error("error", error, dispatch);
    }
  },
  async getIndexerList({ dispatch }, { chainId }) {
    try {
      return await dispatch(
        "axios/get",
        {
          url: `https://scholtz.github.io/AlgorandPublicData/indexer/${chainId}/public-indexer-providers.json`,
        },
        { root: true }
      );
    } catch (error) {
      console.error("error", error, dispatch);
    }
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
