import algosdk from "algosdk";

const actions = {
  async accountInformation({ dispatch }, { addr }) {
    try {
      const url = new URL(this.state.config.algod);

      console.log("this, this.state", this, this.state.config.algod, url.port);
      let algodclient = new algosdk.Algodv2(
        this.state.config.algodToken,
        this.state.config.algod,
        url.port
      );
      const ret = await algodclient.accountInformation(addr).do();
      console.log("ret", ret);
      return ret;
    } catch (error) {
      console.log("error", error, dispatch);
    }
  },
  async makePayment({ dispatch }, { payTo, payFrom, amount, note, fee }) {
    try {
      const url = new URL(this.state.config.algod);

      const enc = new TextEncoder();
      const noteEnc = enc.encode(note);

      const algodclient = new algosdk.Algodv2(
        this.state.config.algodToken,
        this.state.config.algod,
        url.port
      );
      const sk = await dispatch(
        "wallet/getSK",
        { addr: payFrom },
        {
          root: true,
        }
      );
      let params = await algodclient.getTransactionParams().do();
      params.fee = fee;
      params.flatFee = true;
      console.log("going to sign ", {
        payFrom,
        payTo,
        amount,
        undefined,
        noteEnc,
        params,
      });
      let txn = algosdk.makePaymentTxnWithSuggestedParams(
        payFrom,
        payTo,
        amount,
        undefined,
        noteEnc,
        params
      );
      console.log("txn", txn, sk);
      let signedTxn = txn.signTxn(sk);
      console.log("signedTxn", signedTxn);
      let txId = txn.txID().toString();
      console.log("txId", txId);
      const ret = await algodclient.sendRawTransaction(signedTxn).do();
      await dispatch(
        "wallet/lastPayTo",
        { addr: payTo },
        {
          root: true,
        }
      );
      return ret.txId;
    } catch (error) {
      console.log("error", error, dispatch);
    }
  },
  async waitForConfirmation({ dispatch }, { txId, timeout }) {
    try {
      console.log("txId, timeout", { txId, timeout });
      const url = new URL(this.state.config.algod);

      let algodclient = new algosdk.Algodv2(
        this.state.config.algodToken,
        this.state.config.algod,
        url.port
      );

      // Wait until the transaction is confirmed or rejected, or until 'timeout'
      // number of rounds have passed.
      //     Args:
      // txId(str): the transaction to wait for
      // timeout(int): maximum number of rounds to wait
      // Returns:
      // pending transaction information, or throws an error if the transaction
      // is not confirmed or rejected in the next timeout rounds
      if (algodclient == null || txId == null || timeout < 0) {
        throw "Bad arguments.";
      }
      let status = await algodclient.status().do();
      if (status == undefined) throw new Error("Unable to get node status");
      let startround = status["last-round"] + 1;
      let currentround = startround;

      while (currentround < startround + timeout) {
        let pendingInfo = await algodclient
          .pendingTransactionInformation(txId)
          .do();
        if (pendingInfo != undefined) {
          if (
            pendingInfo["confirmed-round"] !== null &&
            pendingInfo["confirmed-round"] > 0
          ) {
            //Got the completed Transaction
            return pendingInfo;
          } else {
            if (
              pendingInfo["pool-error"] != null &&
              pendingInfo["pool-error"].length > 0
            ) {
              // If there was a pool error, then the transaction has been rejected!
              throw new Error(
                "Transaction Rejected" +
                  " pool error" +
                  pendingInfo["pool-error"]
              );
            }
          }
        }
        await algodclient.statusAfterBlock(currentround).do();
        currentround++;
      }
      throw new Error(
        "Pending tx not found in timeout rounds, timeout value = " + timeout
      );
    } catch (error) {
      console.log("error", error, dispatch);
    }
  },
};
export default {
  namespaced: true,
  actions,
};
