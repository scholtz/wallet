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
  async searchForTransactions({ dispatch }, { addr, note }) {
    try {
      const url = new URL(this.state.config.indexer);
      const indexerClient = new algosdk.Indexer(
        this.state.config.indexerToken,
        this.state.config.indexer,
        url.port
      );
      if (note) {
        console.log("searching for addr and note", addr, note);
        const enc = new TextEncoder();
        const noteenc = enc.encode(note);
        const searchForTransactions = await indexerClient
          .searchForTransactions()
          .address(addr)
          .notePrefix(noteenc)
          .do();
        return searchForTransactions;
      } else {
        const searchForTransactions = await indexerClient
          .searchForTransactions()
          .address(addr)
          .do();
        return searchForTransactions;
      }
    } catch (error) {
      console.log("error", error, dispatch);
    }
  },
  async searchForTransactionsWithNoteAndAmount({ dispatch }, { note, amount }) {
    try {
      const url = new URL(this.state.config.indexer);
      const indexerClient = new algosdk.Indexer(
        this.state.config.indexerToken,
        this.state.config.indexer,
        url.port
      );
      const enc = new TextEncoder();
      const noteenc = enc.encode(note);
      const searchForTransactions = await indexerClient
        .searchForTransactions()
        .currencyGreaterThan(amount - 1)
        .currencyLessThan(amount + 1)
        .notePrefix(noteenc)
        .do();
      return searchForTransactions;
    } catch (error) {
      console.log("error", error, dispatch);
    }
  },
  async searchForTransactionsWithNoteAndAmountAndAccount(
    { dispatch },
    { note, amount, account }
  ) {
    try {
      const url = new URL(this.state.config.indexer);
      const indexerClient = new algosdk.Indexer(
        this.state.config.indexerToken,
        this.state.config.indexer,
        url.port
      );
      const enc = new TextEncoder();
      const noteenc = enc.encode(note);
      const searchForTransactions = await indexerClient
        .searchForTransactions()
        .currencyGreaterThan(amount - 1)
        .currencyLessThan(amount + 1)
        .notePrefix(noteenc)
        .address(account)
        .do();
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
  async getAssetsByName({ commit }, { name }) {
    try {
      const url = new URL(this.state.config.indexer);
      const indexerClient = new algosdk.Indexer(
        this.state.config.indexerToken,
        this.state.config.indexer,
        url.port
      );
      const assetInfo = await indexerClient
        .searchForAssets()
        .name(name)
        .do();
      console.log("assetInfo", assetInfo);
      return assetInfo.assets;
    } catch (error) {
      console.log("error", error, commit);
    }
  },
};
export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
