const state = () => ({
  genesisList: [],
  algodList: {},
  participationList: {},
  indexerList: {},
  twoFactorAuthList: {},
});

const mutations = {
  setGenesisList(state, data) {
    if (data) {
      state.genesisList = data;
    }
  },
  setAlgodList(state, { chainId, data }) {
    if (data) {
      state.algodList[chainId] = data;
    }
  },
  setParticipationList(state, { chainId, data }) {
    if (data) {
      state.participationList[chainId] = data;
    }
  },
  setIndexerList(state, { chainId, data }) {
    if (data) {
      state.indexerList[chainId] = data;
    }
  },
  setTwoFactorAuthList(state, { chainId, data }) {
    if (data) {
      state.twoFactorAuthList[chainId] = data;
    }
  },
};
const actions = {
  async getCurrentChainId({ dispatch }) {
    await dispatch("getGenesisList");

    const network = this.state.publicData.genesisList.find(
      (n) => n.network == this.state.config.env
    );
    if (!network) return "SandBox"; // random algorand chain id
    return network.CAIP10;
  },
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
  async getAlgodList({ dispatch, commit }, { chainId }) {
    try {
      if (
        this.state.publicData.algodList[chainId] &&
        this.state.publicData.algodList[chainId].length > 0
      ) {
        return this.state.publicData.algodList[chainId];
      }
      const data = await dispatch(
        "axios/get",
        {
          url: `https://scholtz.github.io/AlgorandPublicData/algod/${chainId}/public-algod-providers.json`,
        },
        { root: true }
      );
      await commit("setAlgodList", { chainId, data });
      return this.state.publicData.algodList[chainId];
    } catch (error) {
      console.error("error", error, dispatch);
    }
  },
  async getParticipationList({ dispatch, commit }, { chainId }) {
    try {
      if (
        this.state.publicData.participationList[chainId] &&
        this.state.publicData.participationList[chainId].length > 0
      ) {
        return this.state.publicData.participationList[chainId];
      }
      const data = await dispatch(
        "axios/get",
        {
          url: `https://scholtz.github.io/AlgorandPublicData/participation/${chainId}/public-participation-providers.json`,
        },
        { root: true }
      );
      await commit("setParticipationList", { chainId, data });
      return this.state.publicData.participationList[chainId];
    } catch (error) {
      console.error("error", error, dispatch);
    }
  },
  async getIndexerList({ dispatch, commit }, { chainId }) {
    try {
      if (
        this.state.publicData.indexerList[chainId] &&
        this.state.publicData.indexerList[chainId].length > 0
      ) {
        return this.state.publicData.indexerList[chainId];
      }
      const data = await dispatch(
        "axios/get",
        {
          url: `https://scholtz.github.io/AlgorandPublicData/indexer/${chainId}/public-indexer-providers.json`,
        },
        { root: true }
      );
      await commit("setIndexerList", { chainId, data });
      return this.state.publicData.indexerList[chainId];
    } catch (error) {
      console.error("error", error, dispatch);
    }
  },
  async getTwoFactorAuthList({ dispatch, commit }, { chainId }) {
    try {
      if (
        this.state.publicData.twoFactorAuthList[chainId] &&
        this.state.publicData.twoFactorAuthList[chainId].length > 0
      ) {
        return this.state.publicData.twoFactorAuthList[chainId];
      }
      const data = await dispatch(
        "axios/get",
        {
          url: `https://scholtz.github.io/AlgorandPublicData/2fa/${chainId}/public-2fa-providers.json`,
        },
        { root: true }
      );
      await commit("setTwoFactorAuthList", { chainId, data });
      return this.state.publicData.twoFactorAuthList[chainId];
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
