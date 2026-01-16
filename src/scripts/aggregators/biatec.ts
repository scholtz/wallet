import type { DexAggregator, SwapContext } from "./types";
import { biatecRouter } from "biatec-router";
import algosdk from "algosdk";
import { Buffer } from "buffer";

export const biatecAggregator: DexAggregator = {
  name: "biatec",
  displayName: "Biatec Router",
  enabledKey: "useBiatec",
  quotesKey: "biatecQuotes",
  txnsKey: "biatecTxns",
  processingKey: "processingTradeBiatec",

  async getQuote(context: SwapContext) {
    try {
      context.aggregatorData.biatecQuotes.value = {};

      const authHeader = await context.signAuthTx({
        account: context.account.value?.addr || "",
        realm: "BiatecRouter#ARC14",
      });
      biatecRouter.OpenAPI.HEADERS = { Authorization: authHeader };
      biatecRouter.OpenAPI.BASE = "https://router.api.biatec.io";

      const requestBody = {
        sender: context.account.value?.addr || "",
        fromAsset:
          context.asset.value !== null && context.asset.value > 0n
            ? Number(context.asset.value)
            : 0,
        toAsset:
          context.toAsset.value !== null && context.toAsset.value > 0n
            ? Number(context.toAsset.value)
            : 0,
        swapAmount: Math.round(
          context.payamount.value * 10 ** context.fromAssetDecimals.value
        ),
        receiveMinimum: 0,
        routesCount: 1,
        maxHops: 3,
      };

      const response = await biatecRouter.RouterService.postApiV1RouterRouteTxs(
        requestBody
      );

      if (!response.routes || response.routes.length === 0) {
        context.error.value = "No Biatec Router routes available";
        return;
      }

      const route = response.routes[0];
      context.aggregatorData.biatecQuotes.value = {
        route: route,
        quoteAmount: route.route?.outputAmount || 0,
        fees: route.route?.totalNetworkFeeMicroAlgos || 0,
      };

      context.txsDetails.value +=
        "\nBIATEC: " + (route.route?.outputAmount || 0) + " expected receive";
      context.txsDetails.value = context.txsDetails.value.trim();
    } catch (e) {
      console.error("Error fetching Biatec Router quote:", e);
      context.error.value =
        "Error fetching quote from Biatec Router: " + (e as Error).message;
      context.openError(
        "Error fetching quote from Biatec Router: " + (e as Error).message
      );
    }
  },

  async execute(context: SwapContext) {
    context.prolong();
    context.aggregatorData.processingTradeBiatec.value = true;
    context.note.value = "";
    context.error.value = "";

    try {
      const senderSK = await context.getSK({
        addr: context.account.value?.addr || "",
      });
      if (!senderSK) {
        context.aggregatorData.processingTradeBiatec.value = false;
        return;
      }
      console.log(
        "component.biatecQuotes",
        context.aggregatorData.biatecQuotes.value
      );
      if (
        !context.aggregatorData.biatecQuotes.value?.route?.route?.outputAmount
      ) {
        throw new Error("Cannot calculate the minimum amount to receive.");
      }
      const authHeader = await context.signAuthTx({
        account: context.account.value?.addr || "",
        realm: "BiatecRouter#ARC14",
      });
      biatecRouter.OpenAPI.HEADERS = { Authorization: authHeader };
      biatecRouter.OpenAPI.BASE = "https://router.api.biatec.io";

      const minimumReceiveAmount = Math.floor(
        (context.aggregatorData.biatecQuotes.value.route.route.outputAmount *
          (10000 - context.slippage.value * 100)) / // component.slippage is in percentage (e.g., 1 = 1%)
          10000
      );

      const requestBody = {
        sender: context.account.value?.addr || "",
        fromAsset:
          context.asset.value !== null && context.asset.value > 0n
            ? Number(context.asset.value)
            : 0,
        toAsset:
          context.toAsset.value !== null && context.toAsset.value > 0n
            ? Number(context.toAsset.value)
            : 0,
        swapAmount: Math.round(
          context.payamount.value * 10 ** context.fromAssetDecimals.value
        ),
        receiveMinimum: minimumReceiveAmount, // ensure the minimum receive amount is set appropriately
        routesCount: 1,
        maxHops: 3,
      };

      const response = await biatecRouter.RouterService.postApiV1RouterRouteTxs(
        requestBody
      );
      if (!response.routes || response.routes.length === 0) {
        context.error.value = "No Biatec Router routes available";
        return;
      }

      const route = response.routes[0];
      context.aggregatorData.biatecQuotes.value = {
        route: route,
        quoteAmount: route.route?.outputAmount || 0,
        fees: route.route?.totalNetworkFeeMicroAlgos || 0,
      };

      if (
        !context.aggregatorData.biatecQuotes.value?.route?.txsToSign ||
        context.aggregatorData.biatecQuotes.value.route.txsToSign.length === 0
      ) {
        throw new Error("No transactions to sign in the Biatec route.");
      }

      // Decode and group transactions
      const transactions = [];
      console.log(
        "component.biatecQuotes.route",
        context.aggregatorData.biatecQuotes.value.route
      );
      for (const txBase64 of context.aggregatorData.biatecQuotes.value.route
        .txsToSign) {
        console.log("txBase64", txBase64);
        const txBytes = new Uint8Array(Buffer.from(txBase64, "base64"));
        // Check for "TX" prefix (0x54, 0x58)
        const tx = algosdk.decodeUnsignedTransaction(
          txBytes
        ) as algosdk.Transaction;
        console.log("tx", tx);
        transactions.push(tx);
      }
      console.log("transactions", transactions);
      // Clear group and compute new group ID
      transactions.forEach((tx) => {
        tx.group = undefined;
      });
      const groupId = algosdk.computeGroupID(transactions);
      transactions.forEach((tx) => (tx.group = groupId));
      console.log(
        "grouped transactions",
        transactions.map((tx) => {
          return tx.txID();
        })
      );

      // Sign transactions
      const signedTxs = [];
      for (const tx of transactions) {
        const signedTx = tx.signTxn(senderSK);
        signedTxs.push(signedTx);
      }
      console.log("signedTxs", signedTxs);
      const tx = await context
        .sendRawTransaction({
          signedTxn: signedTxs,
        })
        .catch((e: any) => {
          context.error.value = e.message;
          context.aggregatorData.processingTradeBiatec.value = false;
          context.openError(e.message);
          return;
        });
      let ret = "Processed in txs: ";

      if (!tx || !tx.txid) return;
      const confirmation = await context.waitForConfirmation({
        txId: tx.txid,
        timeout: 4,
      });
      if (confirmation) {
        ret += tx.txid + ", ";
      } else {
        context.aggregatorData.processingTradeBiatec.value = false;
        await context.reloadAccount();
        return;
      }
      context.note.value = ret.trim().replace(/,$/, "");
      context.aggregatorData.processingTradeBiatec.value = false;
      await context.reloadAccount();
    } catch (e) {
      context.error.value = (e as Error).message;
      context.aggregatorData.processingTradeBiatec.value = false;
      context.openError((e as Error).message);
    }
  },

  get allowExecute() {
    return function (context: SwapContext) {
      return (
        context.aggregatorData.biatecQuotes.value?.route?.txsToSign?.length >
          0 && !context.requiresOptIn.value
      );
    };
  },

  get isQuoteBetter() {
    return function (context: SwapContext) {
      if (!context.aggregatorData.biatecQuotes.value?.quoteAmount) {
        return false;
      }
      // Compare with other aggregators
      const others = context.dexAggregators.filter(
        (a: any) =>
          a.name !== "biatec" && context.aggregatorData[a.enabledKey].value
      );
      for (const other of others) {
        const otherQuote =
          context.aggregatorData[other.quotesKey].value?.quoteAmount ||
          context.aggregatorData[other.quotesKey].value?.quote;
        if (otherQuote) {
          const biatec = BigInt(
            context.aggregatorData.biatecQuotes.value.quoteAmount
          ).toString();
          const otherVal = BigInt(otherQuote).toString();
          if (otherVal.length > biatec.length) return false;
          if (biatec.length > otherVal.length) return true;
          if (otherVal > biatec) return false;
        }
      }
      return true;
    };
  },
};
