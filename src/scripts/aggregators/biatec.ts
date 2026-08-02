import type { DexAggregator, SwapContext } from "./types";
import { biatecRouter } from "biatec-router";
import algosdk from "algosdk";
import { Buffer } from "buffer";
import { getEffectiveQuoteAmount } from "./simulate";

export interface BiatecAggregatorOptions {
  name: string;
  displayName: string;
  baseUrl: string;
  enabledKey: string;
  quotesKey: string;
  txnsKey: string;
  processingKey: string;
}

// With routesCount <= 1 (the default, and what this file now requests - see the getQuote/execute
// request bodies below), Biatec Router's response.routes holds the LEGS of one combined swap: the
// router may split the requested amount across up to 3 structurally distinct paths to beat any
// single path's price (e.g. part of the trade direct, part via an intermediate asset), and all
// legs share ONE Algorand atomic transaction group server-side. That means the total output is
// the SUM across legs (not just routes[0]'s own output) and the transactions to sign are the
// CONCATENATION of every leg's txsToSign, in order (signing just one leg's slice would submit an
// incomplete/invalid group, since the group hash covers every transaction across every leg).
// requesting routesCount: 3 previously disabled this splitting entirely (BiatecRouter's legacy
// "N independent full-amount alternatives" mode) - always leaving real output on the table
// whenever the router had a genuinely better split available, sometimes by 10%+.
// Wrapped into the same { route: { route, txsToSign } } shape the rest of this file (and
// buildBiatecRouteInfo's hop/pool display) already expects, so downstream code is unchanged.
// Known limitation: the hop/pool breakdown shown to the user still only reflects the FIRST leg
// when the router actually splits - a display gap, not a correctness one (the total quoted
// amount and the transactions actually submitted are both correct across all legs).
function combineRouteResponse(response: {
  routes?: Array<{
    route?: {
      outputAmount?: number;
      totalNetworkFeeMicroAlgos?: number;
      [key: string]: unknown;
    };
    txsToSign?: string[] | null;
  }> | null;
}) {
  const routes = response.routes ?? [];
  const totalOutputAmount = routes.reduce(
    (sum, r) => sum + (r.route?.outputAmount || 0),
    0,
  );
  const totalFees = routes.reduce(
    (sum, r) => sum + (r.route?.totalNetworkFeeMicroAlgos || 0),
    0,
  );
  const combinedTxsToSign = routes.flatMap((r) => r.txsToSign || []);
  return {
    route: {
      ...routes[0]?.route,
      outputAmount: totalOutputAmount,
      totalNetworkFeeMicroAlgos: totalFees,
    },
    txsToSign: combinedTxsToSign,
  };
}

// Shared implementation for the Biatec Router aggregator - used to build both
// the production (router.api.biatec.io) and stage (stage.router.api.biatec.io)
// variants from the same code, since the stage router is API-compatible with
// production and only exists to test routing improvements before they ship.
export function createBiatecAggregator(
  options: BiatecAggregatorOptions,
): DexAggregator {
  const {
    name,
    displayName,
    baseUrl,
    enabledKey,
    quotesKey,
    txnsKey,
    processingKey,
  } = options;

  return {
    name,
    displayName,
    enabledKey,
    quotesKey,
    txnsKey,
    processingKey,

    async getQuote(context: SwapContext) {
      try {
        context.aggregatorData[quotesKey].value = {};

        const authHeader = await context.signAuthTx({
          account: context.account.value?.addr || "",
          realm: "BiatecRouter#ARC14",
        });
        biatecRouter.OpenAPI.HEADERS = { Authorization: authHeader };
        biatecRouter.OpenAPI.BASE = baseUrl;

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
            context.payamount.value * 10 ** context.fromAssetDecimals.value,
          ),
          receiveMinimum: 0,
          routesCount: 1,
          maxHops: 3,
        };

        const response =
          await biatecRouter.RouterService.postApiV1RouterRouteTxs(requestBody);

        if (!response.routes || response.routes.length === 0) {
          context.error.value = `No ${displayName} routes available`;
          return;
        }

        const route = combineRouteResponse(response);
        context.aggregatorData[quotesKey].value = {
          route: route,
          quoteAmount: route.route?.outputAmount || 0,
          fees: route.route?.totalNetworkFeeMicroAlgos || 0,
        };

        context.txsDetails.value +=
          `\n${displayName.toUpperCase()}: ` +
          (route.route?.outputAmount || 0) +
          " expected receive";
        context.txsDetails.value = context.txsDetails.value.trim();
      } catch (e) {
        console.error(`Error fetching ${displayName} quote:`, e);
        context.error.value =
          `Error fetching quote from ${displayName}: ` + (e as Error).message;
        context.openError(
          `Error fetching quote from ${displayName}: ` + (e as Error).message,
        );
      }
    },

    async execute(context: SwapContext) {
      context.prolong();
      context.aggregatorData[processingKey].value = true;
      context.note.value = "";
      context.error.value = "";

      try {
        const senderSK = await context.getSK({
          addr: context.account.value?.addr || "",
        });
        if (!senderSK) {
          context.aggregatorData[processingKey].value = false;
          return;
        }
        if (
          !context.aggregatorData[quotesKey].value?.route?.route?.outputAmount
        ) {
          throw new Error("Cannot calculate the minimum amount to receive.");
        }
        const authHeader = await context.signAuthTx({
          account: context.account.value?.addr || "",
          realm: "BiatecRouter#ARC14",
        });
        biatecRouter.OpenAPI.HEADERS = { Authorization: authHeader };
        biatecRouter.OpenAPI.BASE = baseUrl;

        const minimumReceiveAmount = Math.floor(
          (context.aggregatorData[quotesKey].value.route.route.outputAmount *
            (10000 - context.slippage.value * 100)) / // component.slippage is in percentage (e.g., 1 = 1%)
            10000,
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
            context.payamount.value * 10 ** context.fromAssetDecimals.value,
          ),
          receiveMinimum: minimumReceiveAmount, // ensure the minimum receive amount is set appropriately
          routesCount: 1,
          maxHops: 3,
        };

        const response =
          await biatecRouter.RouterService.postApiV1RouterRouteTxs(requestBody);
        if (!response.routes || response.routes.length === 0) {
          context.error.value = `No ${displayName} routes available`;
          return;
        }

        const route = combineRouteResponse(response);
        context.aggregatorData[quotesKey].value = {
          route: route,
          quoteAmount: route.route?.outputAmount || 0,
          fees: route.route?.totalNetworkFeeMicroAlgos || 0,
        };

        if (
          !context.aggregatorData[quotesKey].value?.route?.txsToSign ||
          context.aggregatorData[quotesKey].value.route.txsToSign.length === 0
        ) {
          throw new Error(
            `No transactions to sign in the ${displayName} route.`,
          );
        }

        // Decode and group transactions
        const transactions = [];
        for (const txBase64 of context.aggregatorData[quotesKey].value.route
          .txsToSign) {
          const txBytes = new Uint8Array(Buffer.from(txBase64, "base64"));
          // Check for "TX" prefix (0x54, 0x58)
          const tx = algosdk.decodeUnsignedTransaction(
            txBytes,
          ) as algosdk.Transaction;
          transactions.push(tx);
        }
        // Clear group and compute new group ID
        transactions.forEach((tx) => {
          tx.group = undefined;
        });
        const groupId = algosdk.computeGroupID(transactions);
        transactions.forEach((tx) => (tx.group = groupId));

        // Sign transactions
        const signedTxs = [];
        for (const tx of transactions) {
          const signedTx = tx.signTxn(senderSK);
          signedTxs.push(signedTx);
        }
        const tx = await context
          .sendRawTransaction({
            signedTxn: signedTxs,
          })
          .catch((e: any) => {
            context.error.value = e.message;
            context.aggregatorData[processingKey].value = false;
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
          context.aggregatorData[processingKey].value = false;
          await context.reloadAccount();
          return;
        }
        context.note.value = ret.trim().replace(/,$/, "");
        context.aggregatorData[processingKey].value = false;
        await context.reloadAccount();
      } catch (e) {
        context.error.value = (e as Error).message;
        context.aggregatorData[processingKey].value = false;
        context.openError((e as Error).message);
      }
    },

    get allowExecute() {
      return function (context: SwapContext) {
        return (
          context.aggregatorData[quotesKey].value?.route?.txsToSign?.length >
            0 && !context.requiresOptIn.value
        );
      };
    },

    get isQuoteBetter() {
      return function (context: SwapContext) {
        const own = getEffectiveQuoteAmount(
          context.aggregatorData[quotesKey].value,
        );
        if (own === undefined || own === null) return false;
        const ownValue = BigInt(own);
        // Compare against every other enabled aggregator - must check all of
        // them (not stop at the first one that's smaller) or a smaller quote
        // encountered earlier in the list can hide a larger one later in it
        // (e.g. the regular Biatec route being checked before the Stage
        // route, even when Stage is the actual best quote).
        const others = context.dexAggregators.filter(
          (a: any) =>
            a.name !== name && context.aggregatorData[a.enabledKey].value,
        );
        for (const other of others) {
          const otherQuote = getEffectiveQuoteAmount(
            context.aggregatorData[other.quotesKey].value,
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
}

export const biatecAggregator: DexAggregator = createBiatecAggregator({
  name: "biatec",
  displayName: "Biatec Router",
  baseUrl: "https://router.api.biatec.io",
  enabledKey: "useBiatec",
  quotesKey: "biatecQuotes",
  txnsKey: "biatecTxns",
  processingKey: "processingTradeBiatec",
});

// Same API as production, but points at Biatec's stage environment - used to
// test routing improvements before they're promoted to production. Only
// queried when the user opts in via Settings ("Enable stage routers").
export const biatecStageAggregator: DexAggregator = createBiatecAggregator({
  name: "biatecStage",
  displayName: "Biatec Router (Stage)",
  baseUrl: "https://stage.router.api.biatec.io",
  enabledKey: "useBiatecStage",
  quotesKey: "biatecStageQuotes",
  txnsKey: "biatecStageTxns",
  processingKey: "processingTradeBiatecStage",
});
