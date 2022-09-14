import algosdk from "algosdk";

const actions = {
  async setAccountOnline({ dispatch, commit }, { account }) {
    try {
      const url = new URL(this.state.config.algod);
      let algodclient = new algosdk.Algodv2(
        this.state.config.algodToken,
        this.state.config.algod,
        url.port
      );

      const suggestedParams = await algodclient.getTransactionParams().do();
      const voteFirst = suggestedParams.firstRound + 2;
      const voteLast = voteFirst + 10000;
      const data = await dispatch(
        "axios/get",
        {
          url: `${this.state.config.kmd}/v1/KMD/addpartkey?roundFirstValid=${voteFirst}&roundLastValid=${voteLast}&address=${account}`,
        },
        { root: true }
      );
      if (!data) throw new Error("Unable to create participation key");
      const toSignData = {
        from: account,
        suggestedParams: suggestedParams,
        selectionKey: data.selectionKey,
        stateProofKey: data.stateProofKey,
        voteFirst: voteFirst,
        voteLast: voteLast,
        voteKey: data.voteKey,
        voteKeyDilution: data.voteKeyDilution,
        nonParticipation: false,
      };
      console.error("toSign", toSignData);
      const txn =
        algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(toSignData);

      const sk = await dispatch(
        "wallet/getSK",
        { addr: account },
        {
          root: true,
        }
      );

      console.log("txn", txn, sk);
      let signedTxn = txn.signTxn(sk);
      console.log("signedTxn", signedTxn);
      let txId = txn.txID().toString();
      console.log("txId", txId);
      const ret = await algodclient
        .sendRawTransaction(signedTxn)
        .do()
        .catch((e) => {
          if (e && e.response && e.response.body && e.response.body.message) {
            dispatch("toast/openError", e.response.body.message, {
              root: true,
            });
          }
          console.log("e", e, e.message, e.data);

          for (var key in e) {
            console.log("e.key", key, e[key]);
          }
        });
      return ret.txId;
    } catch (error) {
      console.error("error", error, dispatch);
    }
  },
};
export default {
  namespaced: true,
  actions,
};
