import algosdk from "algosdk";
const state = () => ({
  assets: [],
});

const mutations = {
  setAsset(state, assetInfo) {
    state.assets.push(assetInfo);
  },
};
const actions = {
  async searchForTransactions({ dispatch }, { addr }) {
    try {
      const url = new URL(this.state.config.indexer);
      const indexerClient = new algosdk.Indexer(
        this.state.config.indexerToken,
        this.state.config.indexer,
        url.port
      );
      console.log(
        "indexer",
        this.state.config.indexerToken,
        this.state.config.indexer,
        url.port
      );
      const searchForTransactions = await indexerClient
        .searchForTransactions()
        .address(addr)
        .do();
      console.log("indexer.searchForTransactions", searchForTransactions);
      return searchForTransactions;
    } catch (error) {
      console.log("error", error, dispatch);
    }
  },
  async getAsset({ commit }, { assetIndex }) {
    try {
      const url = new URL(this.state.config.indexer);
      const indexerClient = new algosdk.Indexer(
        this.state.config.indexerToken,
        this.state.config.indexer,
        url.port
      );
      const find = this.state.indexer.assets.find(
        (a) => a["asset-id"] == assetIndex
      );
      if (find) {
        return find;
      }
      const assetInfo = await indexerClient
        .searchForAssets()
        .index(assetIndex)
        .do();
      console.log("assetInfo", assetInfo);
      if (
        assetInfo &&
        assetInfo.assets &&
        assetInfo.assets.length > 0 &&
        assetInfo.assets[0].params
      ) {
        const assetInfoData = assetInfo.assets[0].params;
        assetInfoData["asset-id"] = assetIndex;
        commit("setAsset", assetInfoData);
        return assetInfoData;
      }
    } catch (error) {
      console.log("error", error);
    }
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
