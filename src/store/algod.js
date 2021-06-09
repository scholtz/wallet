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
  async getTransactionParams() {
    try {
      const url = new URL(this.state.config.algod);
      let algodclient = new algosdk.Algodv2(
        this.state.config.algodToken,
        this.state.config.algod,
        url.port
      );
      return await algodclient.getTransactionParams().do();
    } catch (error) {
      console.log("error", error);
    }
  },
  async makePayment(
    { dispatch },
    { payTo, payFrom, amount, noteEnc, fee, asset }
  ) {
    try {
      const url = new URL(this.state.config.algod);

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
      let assetId = undefined;
      if (asset) {
        assetId = asset;
      }
      let params = await algodclient.getTransactionParams().do();
      params.fee = fee;
      params.flatFee = true;
      console.log("going to sign ", {
        payFrom,
        payTo,
        amount,
        assetId,
        noteEnc,
        params,
      });
      let txn = algosdk.makePaymentTxnWithSuggestedParams(
        payFrom,
        payTo,
        amount,
        assetId,
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

  _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  },
  async sendRawTransaction({ dispatch }, { signedTxn }) {
    const url = new URL(this.state.config.algod);

    const algodclient = new algosdk.Algodv2(
      this.state.config.algodToken,
      this.state.config.algod,
      url.port
    );

    const ret = await algodclient.sendRawTransaction(signedTxn).do();
    console.log("sent to network", dispatch);
    return ret;
  },
  async makeAssetCreateTxnWithSuggestedParams({ dispatch }, { asset }) {
    const url = new URL(this.state.config.algod);

    let algodclient = new algosdk.Algodv2(
      this.state.config.algodToken,
      this.state.config.algod,
      url.port
    );
    const sk = await dispatch(
      "wallet/getSK",
      { addr: asset.addr },
      {
        root: true,
      }
    );
    let params = await algodclient.getTransactionParams().do();
    if (!asset.manager) asset.manager = asset.addr;

    const enc = new TextEncoder();
    const noteEnc = enc.encode(asset.note);
    console.log("sending", [
      asset.addr,
      noteEnc,
      parseInt(asset.totalIssuance),
      parseInt(asset.decimals),
      asset.defaultFrozen,
      asset.manager ? asset.manager : undefined,
      asset.reserve ? asset.reserve : undefined,
      asset.freeze ? asset.freeze : undefined,
      asset.clawback ? asset.clawback : undefined,
      asset.unitName,
      asset.assetName,
      asset.assetURL,
      asset.assetMetadataHash,
      params,
    ]);
    const txn = algosdk.makeAssetCreateTxnWithSuggestedParams(
      asset.addr,
      noteEnc,
      parseInt(asset.totalIssuance),
      parseInt(asset.decimals),
      asset.defaultFrozen,
      asset.manager ? asset.manager : undefined,
      asset.reserve ? asset.reserve : undefined,
      asset.freeze ? asset.freeze : undefined,
      asset.clawback ? asset.clawback : undefined,
      asset.unitName,
      asset.assetName,
      asset.assetURL,
      asset.assetMetadataHash,
      params
    );

    let rawSignedTxn = txn.signTxn(sk);
    const ret = await algodclient.sendRawTransaction(rawSignedTxn).do();
    console.log("sent to network", ret);
    return ret;
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
