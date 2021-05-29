import algosdk from "algosdk";

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
};
export default {
  namespaced: true,
  actions,
};
