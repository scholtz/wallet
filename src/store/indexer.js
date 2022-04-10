import algosdk from "algosdk";
const state = () => ({
  assets: [],
  balance: {},
});

const mutations = {
  setAsset(state, assetInfo) {
    state.assets.push(assetInfo);
  },
  setBalance(state, { account, round, assetId, balance }) {
    if (state.balance[round] === undefined) {
      state.balance[round] = {};
    }
    if (state.balance[round][account] === undefined) {
      state.balance[round][account] = {};
    }
    state.balance[round][account][assetId] = balance;
  },
};
const actions = {
  async accountInformation({ dispatch }, { addr }) {
    try {
      console.log("accountInformation", addr);
      const url = new URL(this.state.config.indexer);

      console.log("this, this.state", this, this.state.config.algod, url.port);
      let indexerClient = new algosdk.Indexer(
        this.state.config.indexerToken,
        this.state.config.indexer,
        url.port
      );
      const ret = await indexerClient.lookupAccountByID(addr).do();
      console.log("ret", ret);
      return ret.account;
    } catch (error) {
      console.error("error", error, dispatch);
    }
  },
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
  async searchForTransactionsWithAddrAndAsset({ dispatch }, { addr, asset }) {
    try {
      const url = new URL(this.state.config.indexer);
      const indexerClient = new algosdk.Indexer(
        this.state.config.indexerToken,
        this.state.config.indexer,
        url.port
      );
      console.log("searching for addr and asset", addr, asset);
      const searchForTransactions = await indexerClient
        .searchForTransactions()
        .address(addr)
        .assetID(asset)
        .do();
      return searchForTransactions;
    } catch (error) {
      console.log("error", error, dispatch);
    }
  },
  async searchForTransactionsWithNoteAndAmount(
    { dispatch },
    { note, amount, min }
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
        .minRound(Math.max(min, 0))
        .notePrefix(noteenc)
        .do();
      return searchForTransactions;
    } catch (error) {
      console.log("error", error, dispatch, note);
    }
  },
  async searchForTokenTransactionsWithNoteAndAmount(
    { dispatch },
    { note, amount, assetId }
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
        .assetID(assetId)
        .currencyGreaterThan(amount - 1)
        .currencyLessThan(amount + 1)
        .notePrefix(noteenc)
        .do();
      return searchForTransactions;
    } catch (error) {
      console.log("error", error, dispatch, note);
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
  async searchForTokenTransactionsWithNoteAndAmountAndAccount(
    { dispatch },
    { note, amount, account, assetId }
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
        .assetID(assetId)
        .do();
      return searchForTransactions;
    } catch (error) {
      console.log("error", error, dispatch);
    }
  },
  async getAsset({ commit }, { assetIndex }) {
    try {
      let env = this.state.config.env;
      if (env == "mainnet") {
        env = "";
      } else {
        env += "-";
      }
      try {
        const cache = localStorage.getItem(`Asset-${env}${assetIndex}`);
        if (cache) {
          const cacheObj = JSON.parse(cache);
          if (cacheObj && cacheObj["asset-id"] == assetIndex) {
            commit("setAsset", cacheObj);
            return cacheObj;
          }
        }
      } catch (e) {
        console.log("error", e);
      }

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
        localStorage.setItem(
          `Asset-${env}${assetIndex}`,
          JSON.stringify(assetInfoData)
        );
        return assetInfoData;
      }
    } catch (error) {
      console.log("error", error);
    }
  },
  async getAccountBalanceAtRound({ commit }, { account, round, assetId }) {
    try {
      console.log(
        "this.state.indexer.balance is undefined",
        round,
        this.state.indexer.balance,
        this.state.indexer.balance[round] !== undefined
      );
      if (this.state.indexer.balance[round] !== undefined) {
        if (this.state.indexer.balance[round][account] !== undefined) {
          if (
            this.state.indexer.balance[round][account][assetId] !== undefined
          ) {
            return this.state.indexer.balance[round][account][assetId];
          }
        }
      }
      const url = new URL(this.state.config.indexer);
      const indexerClient = new algosdk.Indexer(
        this.state.config.indexerToken,
        this.state.config.indexer,
        url.port
      );
      const accountInfo = await indexerClient
        .lookupAccountByID(account)
        .round(round)
        .do();

      let balance = 0;
      if (!assetId || assetId <= 0) {
        balance = accountInfo.account.amount / 1000000;
      } else {
        const item = accountInfo.account.assets.find(
          (a) =>
            a["asset-id"] == assetId &&
            a["deleted"] == false &&
            a["is-frozen"] == false
        );
        if (item) {
          balance = item.amount;
        }
      }

      if (accountInfo && accountInfo.account && balance > 0) {
        await commit("setBalance", { account, round, assetId, balance });
        return balance;
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
      const assetInfo = await indexerClient.searchForAssets().name(name).do();
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
