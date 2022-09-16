import algosdk from "algosdk";

const actions = {
  async setAccountOnline({ dispatch, commit }, { account }) {
    try {
      if (!this.state.config || !this.state.config.kmd)
        throw new Error("Please setup KMD server in your settings.");
      if (!account) throw new Error("Address not found.");

      const url = new URL(this.state.config.algod);
      let algodclient = new algosdk.Algodv2(
        this.state.config.algodToken,
        this.state.config.algod,
        url.port
      );

      const suggestedParams = await algodclient.getTransactionParams().do();

      const authParams = suggestedParams;
      authParams.fee = 0;
      const note = Buffer.from("KMD", "ascii");
      const authObj = {
        from: account,
        to: account,
        amount: 0,
        note: new Uint8Array(note),
        suggestedParams: authParams,
      };
      const authTxn =
        algosdk.makePaymentTxnWithSuggestedParamsFromObject(authObj);
      const sk = await dispatch(
        "wallet/getSK",
        { addr: account },
        {
          root: true,
        }
      );
      if (!sk) {
        throw new Error(
          "You can make the account online only if you have the private key to it"
        );
      }
      let signedAuthTxn = authTxn.signTxn(sk);
      const b64 = Buffer.from(signedAuthTxn).toString("base64");
      const auth = "SigTx " + b64;

      const voteFirst = suggestedParams.firstRound + 2;
      const voteLast = voteFirst + 10000;
      const data = await dispatch(
        "axios/get",
        {
          url: `${this.state.config.kmd}/v1/KMD/addpartkey?roundFirstValid=${voteFirst}&roundLastValid=${voteLast}&address=${account}`,
          headers: {
            Authorization: auth,
          },
        },
        { root: true }
      );
      if (!data) throw new Error("Unable to create participation key");
      suggestedParams.fee = 1000;
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
      const txn =
        algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(toSignData);

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
      const msg = error.response ? error.response : error.message;
      dispatch("toast/openError", msg, {
        root: true,
      });
    }
  },
};
export default {
  namespaced: true,
  actions,
};
