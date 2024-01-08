import algosdk from "algosdk";

const actions = {
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
      console.error("error", error);
    }
  },
  async preparePayment(
    { dispatch },
    { payTo, payFrom, amount, noteEnc, fee, asset, reKeyTo }
  ) {
    try {
      const url = new URL(this.state.config.algod);

      const algodclient = new algosdk.Algodv2(
        this.state.config.algodToken,
        this.state.config.algod,
        url.port
      );
      let fromAcct = "";
      if (payFrom.sk) {
        fromAcct = payFrom.addr;
      } else {
        fromAcct = payFrom;
      }
      let assetId = undefined;
      if (asset) {
        assetId = parseInt(asset);
      }
      let params = await algodclient.getTransactionParams().do();
      params.fee = fee;
      params.flatFee = true;
      console.log("going to sign ", {
        fromAcct,
        payTo,
        amount,
        assetId,
        note: noteEnc,
        params,
        reKeyTo,
      });
      let txn = null;
      if (assetId) {
        const transactionOptionsAsa = {
          from: fromAcct,
          to: payTo,
          assetIndex: assetId,
          amount,
          note: noteEnc,
          suggestedParams: params,
          rekeyTo: reKeyTo,
        };
        console.log("transactionOptionsAsa", transactionOptionsAsa);
        txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
          transactionOptionsAsa
        );
      } else {
        const transactionOptionsAlg = {
          from: fromAcct,
          to: payTo,
          amount,
          note: noteEnc,
          suggestedParams: params,
          rekeyTo: reKeyTo,
        };
        console.log("transactionOptionsAlg", transactionOptionsAlg);
        txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(
          transactionOptionsAlg
        );
      }
      return txn;
    } catch (error) {
      console.error("error", error, dispatch);
    }
  },
  async makePayment(
    { dispatch },
    { payTo, payFrom, amount, noteEnc, fee, asset, reKeyTo }
  ) {
    try {
      const txn = await dispatch("preparePayment", {
        payTo,
        payFrom,
        amount,
        noteEnc,
        fee,
        asset,
        reKeyTo,
      });

      let signedTxn = await dispatch(
        "signer/signTransaction",
        { from: payFrom, tx: txn },
        {
          root: true,
        }
      );

      console.log("signedTxn", signedTxn);
      let txId = txn.txID().toString();
      console.log("txId", txId);

      const url = new URL(this.state.config.algod);

      const algodclient = new algosdk.Algodv2(
        this.state.config.algodToken,
        this.state.config.algod,
        url.port
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
          console.log("e", e, e.message, e.data);

          for (var key in e) {
            console.log("e.key", key, e[key]);
          }
        });
      await dispatch(
        "wallet/lastPayTo",
        { addr: payTo },
        {
          root: true,
        }
      );
      return ret.txId;
    } catch (error) {
      console.error("error", error);
    }
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
  async makeAssetCreateTxnWithSuggestedParamsTx({ dispatch }, { asset }) {
    const url = new URL(this.state.config.algod);

    let algodclient = new algosdk.Algodv2(
      this.state.config.algodToken,
      this.state.config.algod,
      url.port
    );
    let params = await algodclient.getTransactionParams().do();
    if (!asset.manager) asset.manager = asset.addr;

    const enc = new TextEncoder();
    const noteEnc = enc.encode(asset.note);
    const issueBase = BigInt(asset.totalIssuance);
    const issuePower = BigInt(Math.pow(10, asset.decimals));
    const issueBigInt = issueBase * issuePower;
    console.log("sending", [
      asset.addr,
      noteEnc,
      issueBigInt,
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
      issueBigInt,
      parseInt(asset.decimals),
      asset.defaultFrozen,
      asset.manager ? asset.manager : undefined,
      asset.reserve ? asset.reserve : undefined,
      asset.freeze ? asset.freeze : undefined,
      asset.clawback ? asset.clawback : undefined,
      asset.unitName,
      asset.assetName,
      asset.assetURL,
      new Uint8Array(Buffer.from(asset.assetMetadataHash, "base64")),
      params
    );
    return txn;
  },
  async makeAssetCreateTxnWithSuggestedParams({ dispatch }, { asset }) {
    const url = new URL(this.state.config.algod);

    let algodclient = new algosdk.Algodv2(
      this.state.config.algodToken,
      this.state.config.algod,
      url.port
    );
    let params = await algodclient.getTransactionParams().do();
    if (!asset.manager) asset.manager = asset.addr;

    const enc = new TextEncoder();
    const noteEnc = enc.encode(asset.note);
    const issueBase = BigInt(asset.totalIssuance);
    const issuePower = BigInt(Math.pow(10, asset.decimals));
    const issueBigInt = issueBase * issuePower;
    console.log("sending", [
      asset.addr,
      noteEnc,
      issueBigInt,
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
      issueBigInt,
      parseInt(asset.decimals),
      asset.defaultFrozen,
      asset.manager ? asset.manager : undefined,
      asset.reserve ? asset.reserve : undefined,
      asset.freeze ? asset.freeze : undefined,
      asset.clawback ? asset.clawback : undefined,
      asset.unitName,
      asset.assetName,
      asset.assetURL,
      new Uint8Array(Buffer.from(asset.assetMetadataHash, "base64")),
      params
    );

    let signedTxn = await dispatch(
      "signer/signTransaction",
      { from: asset.addr, tx: txn },
      {
        root: true,
      }
    );
    const ret = await algodclient.sendRawTransaction(signedTxn).do();
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
      console.error("error", error, dispatch);
    }
  },
};
export default {
  namespaced: true,
  actions,
};
