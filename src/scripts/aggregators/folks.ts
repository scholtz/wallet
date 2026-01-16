import type { DexAggregator, SwapContext } from "./types";
import { FolksRouterClient, Network, SwapMode } from "@folks-router/js-sdk";
import algosdk from "algosdk";
import { Buffer } from "buffer";

const getFolksClient = (context: SwapContext): FolksRouterClient | null => {
  if (context.$store.state.config.env == "mainnet-v1.0") {
    return new FolksRouterClient(Network.MAINNET);
  }
  if (context.$store.state.config.env == "mainnet") {
    return new FolksRouterClient(Network.MAINNET);
  }
  if (context.$store.state.config.env == "testnet-v1.0") {
    return new FolksRouterClient(Network.TESTNET);
  }
  if (context.$store.state.config.env == "testnet") {
    return new FolksRouterClient(Network.TESTNET);
  }
  return null;
};

export const folksAggregator: DexAggregator = {
  name: "folks",
  displayName: "Folks Router",
  enabledKey: "useFolks",
  quotesKey: "folksQuote",
  txnsKey: "folksTxns",
  processingKey: "processingTradeFolks",

  getFolksClient,

  async getQuote(context: SwapContext) {
    try {
      context.aggregatorData.folksQuote.value = {};
      const amount = BigInt(
        Math.round(
          context.payamount.value *
            10 ** (context.fromAssetObj.value?.decimals ?? 6)
        )
      );
      const folksRouterClient = getFolksClient(context);
      if (!folksRouterClient)
        throw Error(
          "Unable to create folks router client for specified network"
        );
      const fromAsset =
        context.asset.value !== null && context.asset.value > 0n
          ? context.asset.value
          : 0n;
      const toAsset =
        context.toAsset.value !== null && context.toAsset.value > 0n
          ? context.toAsset.value
          : 0n;

      const quote = await folksRouterClient.fetchSwapQuote(
        {
          amount,
          fromAssetId: fromAsset as any,
          toAssetId: toAsset as any,
          swapMode: SwapMode.FIXED_INPUT,
        },
        15,
        10,
        0,
        "AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y"
      );
      context.aggregatorData.folksQuote.value = quote;
      const slippage = Math.round(context.slippage.value * 100);
      context.aggregatorData.folksTxns.value =
        await folksRouterClient.prepareSwapTransactions(
          {
            amount,
            fromAssetId: fromAsset as any,
            toAssetId: toAsset as any,
            swapMode: SwapMode.FIXED_INPUT,
          },
          context.$route.params.account,
          slippage,
          quote
        );
      const token = await context.getAsset({
        assetIndex: toAsset,
      });
      context.txsDetails.value += `\nFOLKS ROUTER: Quote Amount: ${
        Number(context.aggregatorData.folksQuote.value.quoteAmount) /
        10 ** (token?.decimals ?? 6)
      }, Price Impact: ${
        Math.round(
          Number(context.aggregatorData.folksQuote.value.priceImpact) * 10000
        ) / 100
      }%, Txs fees: ${
        Number(context.aggregatorData.folksQuote.value.microalgoTxnsFee) /
        10 ** 6
      } Algo`;
      context.txsDetails.value = context.txsDetails.value.trim();
    } catch (e) {
      context.openError(
        `Error fetching quote from folks: ${(e as Error).message}`
      );
    }
  },

  async execute(context: SwapContext) {
    context.prolong();
    context.aggregatorData.processingTradeFolks.value = true;
    context.note.value = "";
    context.error.value = "";
    const senderSK = await context.getSK({
      addr: context.account.value?.addr || "",
    });
    if (!senderSK) {
      context.aggregatorData.processingTradeFolks.value = false;
      return;
    }

    const unsignedTxns = context.aggregatorData.folksTxns.value.map(
      (txn: any) =>
        algosdk.decodeUnsignedTransaction(
          new Uint8Array(Buffer.from(txn, "base64"))
        )
    );
    const signedTxns = unsignedTxns.map((txn: any) => txn.signTxn(senderSK));
    if (!signedTxns) {
      context.aggregatorData.processingTradeFolks.value = false;
      return;
    }
    const tx = await context
      .sendRawTransaction({
        signedTxn: signedTxns,
      })
      .catch((e: any) => {
        context.error.value = e.message;
        context.aggregatorData.processingTradeFolks.value = false;
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
      context.aggregatorData.processingTradeFolks.value = false;
      await context.reloadAccount();
      return;
    }
    context.note.value = ret.trim().replace(/,$/, "");
    context.aggregatorData.processingTradeFolks.value = false;
    await context.reloadAccount();
  },

  get allowExecute() {
    return function (context: SwapContext) {
      if (
        context.aggregatorData.folksTxns.value &&
        context.aggregatorData.folksQuote.value &&
        context.aggregatorData.folksTxns.value.length > 0
      ) {
        return true;
      }
      return false;
    };
  },

  get isQuoteBetter() {
    return function (context: SwapContext) {
      if (!context.aggregatorData.folksQuote.value) {
        return false;
      }
      if (!context.aggregatorData.folksQuote.value.quoteAmount) {
        return false;
      }
      // Compare with other aggregators
      const others = context.dexAggregators.filter(
        (a: any) =>
          a.name !== "folks" && context.aggregatorData[a.enabledKey].value
      );
      for (const other of others) {
        const otherQuote =
          context.aggregatorData[other.quotesKey].value?.quoteAmount ||
          context.aggregatorData[other.quotesKey].value?.quote;
        if (otherQuote) {
          const folks = BigInt(
            context.aggregatorData.folksQuote.value.quoteAmount
          ).toString();
          const otherVal = BigInt(otherQuote).toString();
          if (otherVal.length > folks.length) return false;
          if (folks.length > otherVal.length) return true;
          if (otherVal > folks) return false;
        }
      }
      return true;
    };
  },
};
