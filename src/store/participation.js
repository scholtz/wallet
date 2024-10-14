import algosdk from "algosdk";

const actions = {
  async getARC14ParticipationRealm({ dispatch }) {
    if (!this.state.config || !this.state.config.participation)
      throw new Error("Please setup participation server in your settings.");
    const data = await dispatch(
      "axios/get",
      {
        url: `${this.state.config.participation}/v1/participation/realm`,
      },
      { root: true }
    );
    return data;
  },
  async getParticipationData(
    { dispatch },
    { account, rounds, participationAuth }
  ) {
    try {
      if (!this.state.config || !this.state.config.participation)
        throw new Error("Please setup participation server in your settings.");
      if (!account) throw new Error("Address not found.");

      const url = new URL(this.state.config.algod);
      let algodclient = new algosdk.Algodv2(
        this.state.config.algodToken,
        this.state.config.algod,
        url.port
      );

      const suggestedParams = await algodclient.getTransactionParams().do();

      const auth = participationAuth;
      const voteFirst = suggestedParams.firstRound + 2;
      const voteLast = voteFirst + rounds;
      const data = await dispatch(
        "axios/get",
        {
          url: `${this.state.config.participation}/v1/KMD/addpartkey?roundFirstValid=${voteFirst}&roundLastValid=${voteLast}&address=${account}`,
          headers: {
            Authorization: auth,
          },
        },
        { root: true }
      );
      if (!data) throw new Error("Unable to create participation key");
      suggestedParams.fee = 1000;
      suggestedParams.flatFee = true;
      const toSignData = {
        from: account,
        suggestedParams: suggestedParams,
        selectionKey: data.selectionKey,
        stateProofKey: data.stateProofKey,
        voteFirst: voteFirst,
        voteLast: voteLast,
        voteKey: data.voteKey,
        voteKeyDilution: data.voteKeyDilution,
        //nonParticipation: false,
      };
      return toSignData;
    } catch (error) {
      console.error("error", error, dispatch);
      const msg = error.response ? error.response : error.message;
      dispatch("toast/openError", msg, {
        root: true,
      });
    }
  },
  async setAccountOnline({ dispatch }, { account, rounds, participationAuth }) {
    try {
      if (!this.state.config || !this.state.config.participation)
        throw new Error("Please setup participation server in your settings.");
      if (!account) throw new Error("Address not found.");

      const url = new URL(this.state.config.algod);
      let algodclient = new algosdk.Algodv2(
        this.state.config.algodToken,
        this.state.config.algod,
        url.port
      );

      const suggestedParams = await algodclient.getTransactionParams().do();

      // const authParams = suggestedParams;
      // authParams.fee = 0;
      // const note = Buffer.from("KMD", "ascii");
      // const authObj = {
      //   from: account,
      //   to: account,
      //   amount: 0,
      //   note: new Uint8Array(note),
      //   suggestedParams: authParams,
      // };
      // const authTxn =
      //   algosdk.makePaymentTxnWithSuggestedParamsFromObject(authObj);
      // let signedAuthTxn = await dispatch(
      //   "signer/signTransaction",
      //   { from: account, tx: authTxn },
      //   {
      //     root: true,
      //   }
      // );
      // if (!signedAuthTxn) {
      //   throw new Error("Unable to to sign the transaction for authentication");
      // }

      // const b64 = Buffer.from(signedAuthTxn).toString("base64");
      // const auth = "SigTx " + b64;
      const auth = participationAuth;
      const voteFirst = suggestedParams.firstRound + 2;
      const voteLast = voteFirst + rounds;
      const data = await dispatch(
        "axios/get",
        {
          url: `${this.state.config.participation}/v1/KMD/addpartkey?roundFirstValid=${voteFirst}&roundLastValid=${voteLast}&address=${account}`,
          headers: {
            Authorization: auth,
          },
        },
        { root: true }
      );
      if (!data) throw new Error("Unable to create participation key");
      suggestedParams.fee = 1000;
      suggestedParams.flatFee = true;
      const toSignData = {
        from: account,
        suggestedParams: suggestedParams,
        selectionKey: data.selectionKey,
        stateProofKey: data.stateProofKey,
        voteFirst: voteFirst,
        voteLast: voteLast,
        voteKey: data.voteKey,
        voteKeyDilution: data.voteKeyDilution,
        //nonParticipation: false,
      };
      const txn =
        algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(toSignData);

      let signedTxn = await dispatch(
        "signer/signTransaction",
        { from: account, tx: txn },
        {
          root: true,
        }
      );
      const ret = await algodclient
        .sendRawTransaction(signedTxn)
        .do()
        .catch((e) => {
          if (e && e.response && e.response.body && e.response.body.message) {
            dispatch("toast/openError", e.response.body.message, {
              root: true,
            });
          }
          console.error("e", e, e.message, e.data);
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
  async setAccountOffline({ dispatch, commit }, { account }) {
    try {
      if (!this.state.config || !this.state.config.participation)
        throw new Error("Please setup participation server in your settings.");
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
      suggestedParams.fee = 1000;
      suggestedParams.flatFee = true;
      const toSignData = {
        from: account,
        suggestedParams: suggestedParams,
        //nonParticipation: true, // TRAP
      };
      const txn =
        algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(toSignData);

      let signedTxn = await dispatch(
        "signer/signTransaction",
        { from: account, tx: txn },
        {
          root: true,
        }
      );
      const ret = await algodclient
        .sendRawTransaction(signedTxn)
        .do()
        .catch((e) => {
          if (e && e.response && e.response.body && e.response.body.message) {
            dispatch("toast/openError", e.response.body.message, {
              root: true,
            });
          }
          console.error("e", e, e.message, e.data);
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
  async getAccountOfflineTx({ dispatch }, { account }) {
    try {
      if (!this.state.config || !this.state.config.participation)
        throw new Error("Please setup participation server in your settings.");
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
      suggestedParams.fee = 1000;
      suggestedParams.flatFee = true;
      const toSignData = {
        from: account,
        suggestedParams: suggestedParams,
        //nonParticipation: true, // TRAP
      };
      const txn =
        algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(toSignData);
      return txn;
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
