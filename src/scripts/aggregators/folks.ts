import type {
  AggregatorQuoteData,
  DexAggregator,
  FolksQuoteState,
  FolksTxnsData,
  SwapContext,
} from "./types";
import { FolksRouterClient, Network, SwapMode } from "@folks-router/js-sdk";
import algosdk from "algosdk";
import { Buffer } from "buffer";
import { getEffectiveQuoteAmount } from "./simulate";
import { assertSwapTransactionsSafe } from "./validate";

// Folks Router only has a mainnet deployment - there is no testnet router to
// call, so any other network (including testnet) must not be sent a request.
const getFolksClient = (context: SwapContext): FolksRouterClient | null => {
  if (
    context.$store.state.config.env == "mainnet-v1.0" ||
    context.$store.state.config.env == "mainnet"
  ) {
    return new FolksRouterClient(Network.MAINNET);
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
    context.aggregatorData.folksQuote.value = {};
    // Folks Router is Mainnet-only - on any other network (Testnet, or a
    // custom network not marked as behaving like Mainnet), skip the request
    // entirely instead of surfacing an error toast for an aggregator that was
    // never going to be usable here.
    if (!getFolksClient(context)) {
      context.txsDetails.value += "\nFOLKS ROUTER: Only available on Mainnet";
      context.txsDetails.value = context.txsDetails.value.trim();
      return;
    }
    try {
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
          fromAssetId: Number(fromAsset),
          toAssetId: Number(toAsset),
          swapMode: SwapMode.FIXED_INPUT,
        },
        15,
        10,
        0,
        "AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y"
      );
      context.aggregatorData.folksQuote.value = quote;
      // slippageBps is basis points out of 10000 (ONE_4_DP in the SDK); at
      // 10000 the computed minimum-received collapses to 0, which is the
      // SDK's only way to express "no slippage protection".
      const slippage = context.slippageProtectionEnabled.value
        ? Math.round(context.slippage.value * 100)
        : 10000;
      context.aggregatorData.folksTxns.value =
        await folksRouterClient.prepareSwapTransactions(
          {
            amount,
            fromAssetId: Number(fromAsset),
            toAssetId: Number(toAsset),
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
        Number(quote.quoteAmount) / 10 ** (token?.decimals ?? 6)
      }, Price Impact: ${
        Math.round(Number(quote.priceImpact) * 10000) / 100
      }%, Txs fees: ${
        Number(quote.microalgoTxnsFee) / 10 ** 6
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

    // folksTxns always holds this aggregator's own FolksTxnsData - written by
    // getQuote() above, the only writer of this key.
    const folksTxns = context.aggregatorData.folksTxns.value as FolksTxnsData;
    const unsignedTxns = folksTxns.map((txn) =>
      algosdk.decodeUnsignedTransaction(
        new Uint8Array(Buffer.from(txn, "base64"))
      )
    );
    try {
      assertSwapTransactionsSafe(
        unsignedTxns,
        context.account.value?.addr || ""
      );
    } catch (e) {
      context.error.value = (e as Error).message;
      context.aggregatorData.processingTradeFolks.value = false;
      context.openError((e as Error).message);
      return;
    }
    const signedTxns = unsignedTxns.map((txn) => txn.signTxn(senderSK));
    if (!signedTxns) {
      context.aggregatorData.processingTradeFolks.value = false;
      return;
    }
    const tx = await context
      .sendRawTransaction({
        signedTxn: signedTxns,
      })
      .catch((e: unknown) => {
        context.error.value = (e as Error).message;
        context.aggregatorData.processingTradeFolks.value = false;
        context.openError((e as Error).message);
        return undefined;
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
      const folksTxns = context.aggregatorData.folksTxns.value as FolksTxnsData;
      if (
        folksTxns &&
        context.aggregatorData.folksQuote.value &&
        folksTxns.length > 0
      ) {
        return true;
      }
      return false;
    };
  },

  get isQuoteBetter() {
    return function (context: SwapContext) {
      const own = getEffectiveQuoteAmount(
        context.aggregatorData.folksQuote.value as FolksQuoteState
      );
      if (own === undefined || own === null) return false;
      const ownValue = BigInt(own);
      // Compare against every other enabled aggregator - must check all of
      // them (not stop at the first one that's smaller) or a smaller quote
      // encountered earlier in the list can hide a larger one later in it.
      const others = context.dexAggregators.filter(
        (a: DexAggregator) =>
          a.name !== "folks" && context.aggregatorData[a.enabledKey].value
      );
      for (const other of others) {
        const otherQuote = getEffectiveQuoteAmount(
          context.aggregatorData[other.quotesKey].value as AggregatorQuoteData
        );
        if (
          otherQuote !== undefined &&
          otherQuote !== null &&
          BigInt(otherQuote) > ownValue
        ) {
          return false;
        }
      }
      return true;
    };
  },
};
