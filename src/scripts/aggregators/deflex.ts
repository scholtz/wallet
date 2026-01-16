import type { DexAggregator, SwapContext } from "./types";
import algosdk from "algosdk";
import { Buffer } from "buffer";

export const deflexAggregator: DexAggregator = {
  name: "deflex",
  displayName: "Deflex",
  enabledKey: "useDeflex",
  quotesKey: "deflexQuotes",
  txnsKey: "deflexTxs",
  processingKey: "processingTradeDeflex",

  async getQuote(context: SwapContext) {
    try {
      context.aggregatorData.deflexQuotes.value = {};
      const amount = BigInt(
        Math.round(
          context.payamount.value * 10 ** context.fromAssetDecimals.value
        )
      );
      const fromAsset =
        context.asset.value !== null && context.asset.value > 0n
          ? context.asset.value
          : 0n;
      const toAsset =
        context.toAsset.value !== null && context.toAsset.value > 0n
          ? context.toAsset.value
          : 0n;
      const chain = context.checkNetwork();
      if (!chain) {
        context.txsDetails.value += "\nDEFLEX: Wrong network selected";
        context.txsDetails.value = context.txsDetails.value.trim();
        context.processingQuote.value = false;
        return;
      }
      let algodUri = encodeURIComponent("https://mainnet-api.algonode.cloud");
      let algodToken = "";
      let algodPort = 443;
      if (chain == "testnet") {
        algodUri = encodeURIComponent("https://testnet-api.algonode.cloud");
        algodToken = "";
        algodPort = 443;
      }

      const apiKey = context.$store.state.config.deflex;
      const request = `https://deflex.txnlab.dev/api/fetchQuote?chain=${chain}&algodUri=${algodUri}&algodToken=${algodToken}&algodPort=${algodPort}&fromASAID=${fromAsset}&toASAID=${toAsset}&atomicOnly=true&amount=${amount}&type=fixed-input&disabledProtocols=&referrerAddress=AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y&apiKey=${apiKey}`;
      const quotes = await context
        .axiosGet({ url: request })
        .catch((e: any) => {
          context.error.value = "No deflex quotes available " + e.message;
          return;
        });

      if (!quotes || !quotes.txnPayload) {
        context.error.value = "No deflex quotes available";
        return;
      }
      console.log("Deflex quotes:", quotes);
      context.aggregatorData.deflexQuotes.value = quotes;
      const params = JSON.stringify({
        address: context.account.value?.addr,
        slippage: context.slippage.value, // 1 = 1%
        txnPayloadJSON: context.aggregatorData.deflexQuotes.value.txnPayload,
        apiKey,
      });
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };

      const txs = await context
        .axiosPost({
          url: "https://deflex.txnlab.dev/api/fetchExecuteSwapTxns",
          body: params,
          config,
        })
        .catch((e: any) => {
          context.error.value +=
            "No deflex quotes available " + e.message + "\n";
          return;
        });
      if (!txs) {
        context.error.value = "No deflex quotes available\n";
        context.processingQuote.value = false;
        return;
      }
      context.aggregatorData.deflexTxs.value = txs;

      const ret2 = context.aggregatorData.deflexTxs.value.groupMetadata
        .map((tx: any) => tx.labelText)
        .join(",\n");
      context.txsDetails.value += "\nDEFLEX: " + ret2;
      context.txsDetails.value = context.txsDetails.value.trim();
    } catch (e) {
      context.openError(
        "Error fetching quote from deflex: " + (e as Error).message
      );
    }
  },

  async execute(context: SwapContext) {
    context.prolong();
    context.aggregatorData.processingTradeDeflex.value = true;
    context.note.value = "";
    context.error.value = "";
    const senderSK = await context.getSK({
      addr: context.account.value?.addr || "",
    });
    if (!senderSK) {
      context.aggregatorData.processingTradeDeflex.value = false;
      return;
    }
    const byGroup = context.aggregatorData.deflexTxs.value.txns.reduce(
      (entryMap: any, e: any) =>
        entryMap.set(e.group, [...(entryMap.get(e.group) || []), e]),
      new Map()
    );
    const byGroupMap = [...byGroup].map((m) => m[1]);

    let ret = "Processed in txs: ";
    for (const group of byGroupMap) {
      const signedTxns = group.map((txn: any) => {
        if (txn.logicSigBlob !== false) {
          return Uint8Array.from(Object.values(txn.logicSigBlob));
        } else {
          const bytes = new Uint8Array(Buffer.from(txn.data, "base64"));
          const decoded = algosdk.decodeUnsignedTransaction(bytes);
          return algosdk.signTransaction(decoded, senderSK).blob;
        }
      });
      if (!signedTxns) {
        context.aggregatorData.processingTradeDeflex.value = false;
        return;
      }
      const tx = await context
        .sendRawTransaction({
          signedTxn: signedTxns,
        })
        .catch((e: any) => {
          context.error.value = e.message;
          context.aggregatorData.processingTradeDeflex.value = false;
          context.openError(e.message);
          return;
        });
      if (!tx || !tx.txid) return;
      const confirmation = await context.waitForConfirmation({
        txId: tx.txid,
        timeout: 4,
      });
      if (confirmation) {
        ret += tx.txid + ", ";
      } else {
        context.aggregatorData.processingTradeDeflex.value = false;
        await context.reloadAccount();
        return;
      }
    }
    context.note.value = ret.trim().replace(/,$/, "");
    context.aggregatorData.processingTradeDeflex.value = false;
    await context.reloadAccount();
  },

  get allowExecute() {
    return function (context: SwapContext) {
      if (
        !context.aggregatorData.deflexTxs.value ||
        !context.aggregatorData.deflexTxs.value.txns ||
        Object.values(context.aggregatorData.deflexTxs.value.groupMetadata)
          .length <= 0
      ) {
        return false;
      }
      return !context.requiresOptIn.value;
    };
  },

  get isQuoteBetter() {
    return function (context: SwapContext) {
      if (!context.aggregatorData.deflexQuotes.value) {
        return false;
      }
      if (!context.aggregatorData.deflexQuotes.value.quote) {
        return false;
      }
      // Compare with other aggregators
      const others = context.dexAggregators.filter(
        (a: any) =>
          a.name !== "deflex" && context.aggregatorData[a.enabledKey].value
      );
      for (const other of others) {
        const otherQuote =
          context.aggregatorData[other.quotesKey].value?.quoteAmount ||
          context.aggregatorData[other.quotesKey].value?.quote;
        if (otherQuote) {
          const deflex = BigInt(
            context.aggregatorData.deflexQuotes.value.quote
          ).toString();
          const otherVal = BigInt(otherQuote).toString();
          if (otherVal.length > deflex.length) return false;
          if (deflex.length > otherVal.length) return true;
          if (otherVal > deflex) return false;
        }
      }
      return true;
    };
  },
};
