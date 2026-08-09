import type {
  AggregatorQuoteData,
  DeflexQuoteState,
  DeflexTxnEntry,
  DeflexTxsData,
  DexAggregator,
  SwapContext,
} from "./types";
import algosdk from "algosdk";
import { Buffer } from "buffer";
import { getEffectiveQuoteAmount } from "./simulate";
import { assertSwapTransactionSafe } from "./validate";

// Public/shared fallback key for users who have not set their own Deflex key in
// Settings. It is intentionally not secret (shipped in client source, visible on
// the wire) — treat it as an anonymous/shared identifier, not a credential.
// Swap activity under this key is not distinguishable between different users.
const DEFAULT_DEFLEX_API_KEY = "1b72df7e-1131-4449-8ce1-29b79dd3f51e";

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
          context.payamount.value * 10 ** context.fromAssetDecimals.value,
        ),
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
      // Deflex only has a mainnet deployment - there is no testnet router to
      // call, so don't send it a request for testnet (or a custom network the
      // user has marked as behaving like testnet).
      if (chain !== "mainnet") {
        context.txsDetails.value += "\nDEFLEX: Only available on Mainnet";
        context.txsDetails.value = context.txsDetails.value.trim();
        context.processingQuote.value = false;
        return;
      }
      const algodUri = encodeURIComponent("https://mainnet-api.algonode.cloud");
      const algodToken = "";
      const algodPort = 443;

      const apiKey =
        context.$store.state.config.deflex.trim() || DEFAULT_DEFLEX_API_KEY;
      const request = `https://deflex.txnlab.dev/api/fetchQuote?chain=${chain}&algodUri=${algodUri}&algodToken=${algodToken}&algodPort=${algodPort}&fromASAID=${fromAsset}&toASAID=${toAsset}&atomicOnly=true&amount=${amount}&type=fixed-input&disabledProtocols=&referrerAddress=AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y&apiKey=${apiKey}`;
      const quotes = await context
        .axiosGet({ url: request })
        .catch((e: unknown) => {
          context.error.value =
            "No deflex quotes available " + (e as Error).message;
          return undefined;
        });

      if (!quotes || !quotes.txnPayload) {
        context.error.value = "No deflex quotes available";
        return;
      }
      context.aggregatorData.deflexQuotes.value = quotes;
      // Deflex has no explicit "disable slippage protection" flag - passing
      // 100 (100% tolerance) collapses its minimum-received requirement to 0,
      // which is the same effect.
      const slippage = context.slippageProtectionEnabled.value
        ? context.slippage.value // 1 = 1%
        : 100;
      const params = JSON.stringify({
        address: context.account.value?.addr,
        slippage,
        txnPayloadJSON: quotes.txnPayload,
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
        .catch((e: unknown) => {
          context.error.value +=
            "No deflex quotes available " + (e as Error).message + "\n";
          return undefined;
        });
      if (!txs) {
        context.error.value = "No deflex quotes available\n";
        context.processingQuote.value = false;
        return;
      }
      context.aggregatorData.deflexTxs.value = txs;

      const ret2 = txs.groupMetadata
        .map((tx) => tx.labelText)
        .join(",\n");
      context.txsDetails.value += "\nDEFLEX: " + ret2;
      context.txsDetails.value = context.txsDetails.value.trim();
    } catch (e) {
      context.openError(
        "Error fetching quote from deflex: " + (e as Error).message,
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
    // deflexTxs always holds this aggregator's own DeflexTxsData - written by
    // getQuote() above, the only writer of this key.
    const deflexTxsData = context.aggregatorData.deflexTxs.value as DeflexTxsData;
    const byGroup = deflexTxsData.txns.reduce(
      (entryMap: Map<string, DeflexTxnEntry[]>, e: DeflexTxnEntry) =>
        entryMap.set(e.group, [...(entryMap.get(e.group) || []), e]),
      new Map<string, DeflexTxnEntry[]>(),
    );
    const byGroupMap = [...byGroup.values()];

    let ret = "Processed in txs: ";
    for (const group of byGroupMap) {
      let signedTxns: Uint8Array[] | undefined;
      try {
        signedTxns = group.map((txn) => {
          if (txn.logicSigBlob !== false) {
            return Uint8Array.from(Object.values(txn.logicSigBlob));
          } else {
            const bytes = new Uint8Array(Buffer.from(txn.data, "base64"));
            const decoded = algosdk.decodeUnsignedTransaction(bytes);
            assertSwapTransactionSafe(
              decoded,
              context.account.value?.addr || "",
            );
            return algosdk.signTransaction(decoded, senderSK).blob;
          }
        });
      } catch (e) {
        context.error.value = (e as Error).message;
        context.aggregatorData.processingTradeDeflex.value = false;
        context.openError((e as Error).message);
        return;
      }
      if (!signedTxns) {
        context.aggregatorData.processingTradeDeflex.value = false;
        return;
      }
      const tx = await context
        .sendRawTransaction({
          signedTxn: signedTxns,
        })
        .catch((e: unknown) => {
          context.error.value = (e as Error).message;
          context.aggregatorData.processingTradeDeflex.value = false;
          context.openError((e as Error).message);
          return undefined;
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
      const deflexTxsData = context.aggregatorData.deflexTxs
        .value as Partial<DeflexTxsData>;
      if (
        !deflexTxsData ||
        !deflexTxsData.txns ||
        Object.values(deflexTxsData.groupMetadata ?? {}).length <= 0
      ) {
        return false;
      }
      return !context.requiresOptIn.value;
    };
  },

  get isQuoteBetter() {
    return function (context: SwapContext) {
      const own = getEffectiveQuoteAmount(
        context.aggregatorData.deflexQuotes.value as DeflexQuoteState,
      );
      if (own === undefined || own === null) return false;
      const ownValue = BigInt(own);
      // Compare against every other enabled aggregator - must check all of
      // them (not stop at the first one that's smaller) or a smaller quote
      // encountered earlier in the list can hide a larger one later in it.
      const others = context.dexAggregators.filter(
        (a: DexAggregator) =>
          a.name !== "deflex" && context.aggregatorData[a.enabledKey].value,
      );
      for (const other of others) {
        const otherQuote = getEffectiveQuoteAmount(
          context.aggregatorData[other.quotesKey].value as AggregatorQuoteData,
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
