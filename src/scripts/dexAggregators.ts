// dexAggregators.js - Modular DEX Aggregator Configuration
//
// This file contains the configuration for all DEX aggregators supported by the swap functionality.
// Each aggregator implements a common interface with the following methods:
// - getQuote(component): Async function to fetch quotes from the aggregator
// - execute(component): Async function to execute the swap transaction
// - allowExecute(component): Computed property indicating if execution is allowed
// - isQuoteBetter(component): Computed property comparing quotes between aggregators
//
// To add a new aggregator:
// 1. Create an object with the required interface
// 2. Add it to the dexAggregators array
// 3. The UI will automatically include checkboxes and handle the aggregator dynamically
//
// Example aggregator object:
// {
//   name: 'aggregatorName',           // Unique identifier
//   displayName: 'Display Name',       // Human-readable name
//   enabledKey: 'useAggregatorName',   // Key for enabled state
//   quotesKey: 'aggregatorNameQuotes', // Key for storing quotes in component data
//   txnsKey: 'aggregatorNameTxns',     // Key for storing transactions in component data
//   processingKey: 'processingAggregatorName', // Key for processing state
//   getQuote: async (component) => { ... },
//   execute: async (component) => { ... },
//   allowExecute: (component) => { ... },
//   isQuoteBetter: (component) => { ... }
// }

// DEX Aggregators configuration
// Each aggregator implements a common interface for getting quotes and executing swaps

import { FolksRouterClient, Network, SwapMode } from "@folks-router/js-sdk";
import { biatecRouter, authTransaction } from "biatec-router";
import arc14 from "arc14";
import type {
  SwapComponentData,
  SwapMethods,
  SwapStore,
  SwapRoute,
} from "../types/swap";
import algosdk from "algosdk";

// Type definitions
interface SwapComponent extends SwapComponentData, SwapMethods {
  // Store and route access
  $store: SwapStore;
  $route: SwapRoute;
}

interface DexAggregator {
  name: string;
  displayName: string;
  enabledKey: string;
  quotesKey: string;
  txnsKey: string;
  processingKey: string;
  getQuote: (component: SwapComponent) => Promise<void>;
  execute: (component: SwapComponent) => Promise<void>;
  allowExecute: (component: SwapComponent) => boolean;
  isQuoteBetter: (component: SwapComponent) => boolean;
  getFolksClient?: (component: SwapComponent) => FolksRouterClient | null;
}

export const dexAggregators: DexAggregator[] = [
  {
    name: "deflex",
    displayName: "Deflex",
    enabledKey: "useDeflex",
    quotesKey: "deflexQuotes",
    txnsKey: "deflexTxs",
    processingKey: "processingTradeDeflex",

    async getQuote(component: SwapComponent) {
      try {
        component.deflexQuotes = {};
        const amount = BigInt(
          Math.round(component.payamount * 10 ** component.fromAssetDecimals)
        );
        const fromAsset =
          component.asset && component.asset > 0 ? component.asset : 0;
        const toAsset =
          component.toAsset && component.toAsset > 0 ? component.toAsset : 0;
        const chain = component.checkNetwork();
        if (!chain) {
          component.txsDetails += "\nDEFLEX: Wrong network selected";
          component.txsDetails = component.txsDetails.trim();
          component.processingQuote = false;
          return;
        }
        var algodUri = encodeURIComponent("https://mainnet-api.algonode.cloud");
        var algodToken = "";
        var algodPort = 443;
        if (chain == "testnet") {
          algodUri = encodeURIComponent("https://testnet-api.algonode.cloud");
          algodToken = "";
          algodPort = 443;
        }

        const apiKey = component.$store.state.config.deflex;
        const request = `https://deflex.txnlab.dev/api/fetchQuote?chain=${chain}&algodUri=${algodUri}&algodToken=${algodToken}&algodPort=${algodPort}&fromASAID=${fromAsset}&toASAID=${toAsset}&atomicOnly=true&amount=${amount}&type=fixed-input&disabledProtocols=&referrerAddress=AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y&apiKey=${apiKey}`;
        const quotes = await component
          .axiosGet({ url: request })
          .catch((e: any) => {
            component.error = "No deflex quotes available " + e.message;
            return;
          });

        if (!quotes || !quotes.txnPayload) {
          component.error = "No deflex quotes available";
          return;
        }
        component.deflexQuotes = quotes;
        const params = JSON.stringify({
          address: component.account.addr,
          slippage: component.slippage, // 1 = 1%
          txnPayloadJSON: component.deflexQuotes.txnPayload,
          apiKey,
        });
        const config = {
          headers: {
            "Content-Type": "application/json",
          },
        };

        const txs = await component
          .axiosPost({
            url: "https://deflex.txnlab.dev/api/fetchExecuteSwapTxns",
            body: params,
            config,
          })
          .catch((e: any) => {
            component.error += "No deflex quotes available " + e.message + "\n";
            return;
          });
        if (!txs) {
          component.error = "No deflex quotes available\n";
          component.processingQuote = false;
          return;
        }
        component.deflexTxs = txs;

        const ret2 = component.deflexTxs.groupMetadata
          .map((tx: any) => tx.labelText)
          .join(",\n");
        component.txsDetails += "\nDEFLEX: " + ret2;
        component.txsDetails = component.txsDetails.trim();
      } catch (e) {
        component.openError(
          "Error fetching quote from deflex: " + (e as Error).message
        );
      }
    },

    async execute(component: SwapComponent) {
      component.prolong();
      component.processingTradeDeflex = true;
      component.note = "";
      component.error = "";
      const senderSK = await component.getSK({
        addr: component.account.addr,
      });
      if (!senderSK) {
        component.processingTradeDeflex = false;
        return;
      }
      const byGroup = component.deflexTxs.txns.reduce(
        (entryMap: any, e: any) =>
          entryMap.set(e.group, [...(entryMap.get(e.group) || []), e]),
        new Map()
      );
      const byGroupMap = [...byGroup].map((m) => m[1]);

      let ret = "Processed in txs: ";
      for (let group of byGroupMap) {
        const signedTxns = group.map((txn: any) => {
          if (txn.logicSigBlob !== false) {
            return Uint8Array.from(Object.values(txn.logicSigBlob));
          } else {
            let bytes = new Uint8Array(Buffer.from(txn.data, "base64"));
            const decoded = algosdk.decodeUnsignedTransaction(bytes);
            return algosdk.signTransaction(decoded, senderSK).blob;
          }
        });
        if (!signedTxns) {
          component.processingTradeDeflex = false;
          return;
        }
        const tx = await component
          .sendRawTransaction({
            signedTxn: signedTxns,
          })
          .catch((e: any) => {
            component.error = e.message;
            component.processingTradeDeflex = false;
            component.openError(e.message);
            return;
          });
        if (!tx || !tx.txId) return;
        const confirmation = await component.waitForConfirmation({
          txId: tx.txId,
          timeout: 4,
        });
        if (confirmation) {
          ret += tx.txId + ", ";
        } else {
          component.processingTradeDeflex = false;
          await component.reloadAccount();
          return;
        }
      }
      component.note = ret.trim().replace(/,$/, "");
      component.processingTradeDeflex = false;
      await component.reloadAccount();
    },

    get allowExecute() {
      return function (component: SwapComponent) {
        if (
          !component.deflexTxs ||
          !component.deflexTxs.txns ||
          Object.values(component.deflexTxs.groupMetadata).length <= 0
        ) {
          return false;
        }
        return !component.requiresOptIn;
      };
    },

    get isQuoteBetter() {
      return function (component: SwapComponent) {
        if (!component.deflexQuotes) {
          return false;
        }
        if (!component.deflexQuotes.quote) {
          return false;
        }
        // Compare with other aggregators
        const others = component.dexAggregators.filter(
          (a: any) => a.name !== "deflex" && component[a.enabledKey]
        );
        for (let other of others) {
          const otherQuote =
            component[other.quotesKey]?.quoteAmount ||
            component[other.quotesKey]?.quote;
          if (otherQuote) {
            const deflex = BigInt(component.deflexQuotes.quote).toString();
            const otherVal = BigInt(otherQuote).toString();
            if (otherVal.length > deflex.length) return false;
            if (deflex.length > otherVal.length) return true;
            if (otherVal > deflex) return false;
          }
        }
        return true;
      };
    },
  },

  {
    name: "folks",
    displayName: "Folks Router",
    enabledKey: "useFolks",
    quotesKey: "folksQuote",
    txnsKey: "folksTxns",
    processingKey: "processingTradeFolks",

    getFolksClient(component: SwapComponent) {
      if (component.$store.state.config.env == "mainnet-v1.0") {
        return new FolksRouterClient(Network.MAINNET);
      }
      if (component.$store.state.config.env == "mainnet") {
        return new FolksRouterClient(Network.MAINNET);
      }
      if (component.$store.state.config.env == "testnet-v1.0") {
        return new FolksRouterClient(Network.TESTNET);
      }
      if (component.$store.state.config.env == "testnet") {
        return new FolksRouterClient(Network.TESTNET);
      }
      return null;
    },

    async getQuote(component: SwapComponent) {
      try {
        component.folksQuote = {};
        const amount = BigInt(
          Math.round(
            component.payamount * 10 ** (component.fromAssetObj?.decimals ?? 6)
          )
        );
        const folksRouterClient = (this as any).getFolksClient(component);
        if (!folksRouterClient)
          throw Error(
            "Unable to create folks router client for specified network"
          );
        const fromAsset =
          component.asset && component.asset > 0 ? component.asset : 0;
        const toAsset =
          component.toAsset && component.toAsset > 0 ? component.toAsset : 0;

        component.folksQuote = await folksRouterClient.fetchSwapQuote(
          fromAsset,
          toAsset,
          amount,
          SwapMode.FIXED_INPUT,
          15,
          10,
          "AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y"
        );
        const slippage = Math.round(component.slippage * 100);
        component.folksTxns = await folksRouterClient.prepareSwapTransactions(
          component.$route.params.account,
          slippage,
          component.folksQuote
        );
        const token = await component.getAsset({
          assetIndex: toAsset,
        });
        component.txsDetails += `\nFOLKS ROUTER: Quote Amount: ${
          Number(component.folksQuote.quoteAmount) / 10 ** token.decimals
        }, Price Impact: ${
          Math.round(Number(component.folksQuote.priceImpact) * 10000) / 100
        }%, Txs fees: ${
          Number(component.folksQuote.microalgoTxnsFee) / 10 ** 6
        } Algo`;
        component.txsDetails = component.txsDetails.trim();
      } catch (e) {
        component.openError(
          `Error fetching quote from folks: ${(e as Error).message}`
        );
      }
    },

    async execute(component: SwapComponent) {
      component.prolong();
      component.processingTradeFolks = true;
      component.note = "";
      component.error = "";
      const senderSK = await component.getSK({
        addr: component.account.addr,
      });
      if (!senderSK) {
        component.processingTradeFolks = false;
        return;
      }

      const unsignedTxns = component.folksTxns.map((txn: any) =>
        algosdk.decodeUnsignedTransaction(
          new Uint8Array(Buffer.from(txn, "base64"))
        )
      );
      const signedTxns = unsignedTxns.map((txn: any) => txn.signTxn(senderSK));
      if (!signedTxns) {
        component.processingTradeFolks = false;
        return;
      }
      let tx = await component
        .sendRawTransaction({
          signedTxn: signedTxns,
        })
        .catch((e: any) => {
          component.error = e.message;
          component.processingTradeFolks = false;
          component.openError(e.message);
          return;
        });

      let ret = "Processed in txs: ";

      if (!tx || !tx.txId) return;
      const confirmation = await component.waitForConfirmation({
        txId: tx.txId,
        timeout: 4,
      });
      if (confirmation) {
        ret += tx.txId + ", ";
      } else {
        component.processingTradeFolks = false;
        await component.reloadAccount();
        return;
      }
      component.note = ret.trim().replace(/,$/, "");
      component.processingTradeFolks = false;
      await component.reloadAccount();
    },

    get allowExecute() {
      return function (component: SwapComponent) {
        if (
          component.folksTxns &&
          component.folksQuote &&
          component.folksTxns.length > 0
        ) {
          return true;
        }
        return false;
      };
    },

    get isQuoteBetter() {
      return function (component: SwapComponent) {
        if (!component.folksQuote) {
          return false;
        }
        if (!component.folksQuote.quoteAmount) {
          return false;
        }
        // Compare with other aggregators
        const others = component.dexAggregators.filter(
          (a: any) => a.name !== "folks" && component[a.enabledKey]
        );
        for (let other of others) {
          const otherQuote =
            component[other.quotesKey]?.quoteAmount ||
            component[other.quotesKey]?.quote;
          if (otherQuote) {
            const folks = BigInt(component.folksQuote.quoteAmount).toString();
            const otherVal = BigInt(otherQuote).toString();
            if (otherVal.length > folks.length) return false;
            if (folks.length > otherVal.length) return true;
            if (otherVal > folks) return false;
          }
        }
        return true;
      };
    },
  },

  // Biatec Router Aggregator
  {
    name: "biatec",
    displayName: "Biatec Router",
    enabledKey: "useBiatec",
    quotesKey: "biatecQuotes",
    txnsKey: "biatecTxns",
    processingKey: "processingTradeBiatec",

    async getQuote(component: SwapComponent) {
      try {
        component.biatecQuotes = {};

        const authHeader = await component.signAuthTx({
          account: component.account.addr.toString(),
          realm: "BiatecRouter#ARC14",
        });
        biatecRouter.OpenAPI.HEADERS = { Authorization: authHeader };
        biatecRouter.OpenAPI.BASE = "https://router.api.biatec.io";

        const requestBody = {
          sender: component.account.addr.toString(),
          fromAsset:
            component.asset && component.asset > 0 ? component.asset : 0,
          toAsset:
            component.toAsset && component.toAsset > 0 ? component.toAsset : 0,
          swapAmount: Math.round(
            component.payamount * 10 ** component.fromAssetDecimals
          ),
          receiveMinimum: 0,
          routesCount: 1,
          maxHops: 3,
        };

        const response =
          await biatecRouter.RouterService.postApiV1RouterRouteTxs(requestBody);

        if (!response.routes || response.routes.length === 0) {
          component.error = "No Biatec Router routes available";
          return;
        }

        const route = response.routes[0];
        component.biatecQuotes = {
          route: route,
          quoteAmount: route.route?.outputAmount || 0,
          fees: route.route?.totalNetworkFeeMicroAlgos || 0,
        };

        component.txsDetails +=
          "\nBIATEC: " + (route.route?.outputAmount || 0) + " expected receive";
        component.txsDetails = component.txsDetails.trim();
      } catch (e) {
        console.error("Error fetching Biatec Router quote:", e);
        component.error =
          "Error fetching quote from Biatec Router: " + (e as Error).message;
        component.openError(
          "Error fetching quote from Biatec Router: " + (e as Error).message
        );
      }
    },

    async execute(component: SwapComponent) {
      component.prolong();
      component.processingTradeBiatec = true;
      component.note = "";
      component.error = "";

      try {
        const senderSK = await component.getSK({
          addr: component.account.addr,
        });
        if (!senderSK) {
          component.processingTradeBiatec = false;
          return;
        }
        console.log("component.biatecQuotes", component.biatecQuotes);
        if (!component.biatecQuotes?.route?.route?.outputAmount) {
          throw new Error("Cannot calculate the minimum amount to receive.");
        }
        const authHeader = await component.signAuthTx({
          account: component.account.addr.toString(),
          realm: "BiatecRouter#ARC14",
        });
        biatecRouter.OpenAPI.HEADERS = { Authorization: authHeader };
        biatecRouter.OpenAPI.BASE = "https://router.api.biatec.io";

        const minimumReceiveAmount = Math.floor(
          (component.biatecQuotes.route.route.outputAmount *
            (10000 - component.slippage * 100)) / // component.slippage is in percentage (e.g., 1 = 1%)
            10000
        );

        const requestBody = {
          sender: component.account.addr.toString(),
          fromAsset:
            component.asset && component.asset > 0 ? component.asset : 0,
          toAsset:
            component.toAsset && component.toAsset > 0 ? component.toAsset : 0,
          swapAmount: Math.round(
            component.payamount * 10 ** component.fromAssetDecimals
          ),
          receiveMinimum: minimumReceiveAmount, // ensure the minimum receive amount is set appropriately
          routesCount: 1,
          maxHops: 3,
        };

        const response =
          await biatecRouter.RouterService.postApiV1RouterRouteTxs(requestBody);
        if (!response.routes || response.routes.length === 0) {
          component.error = "No Biatec Router routes available";
          return;
        }

        const route = response.routes[0];
        component.biatecQuotes = {
          route: route,
          quoteAmount: route.route?.outputAmount || 0,
          fees: route.route?.totalNetworkFeeMicroAlgos || 0,
        };

        if (
          !component.biatecQuotes?.route?.txsToSign ||
          component.biatecQuotes.route.txsToSign.length === 0
        ) {
          throw new Error("No transactions to sign in the Biatec route.");
        }

        // Decode and group transactions
        const transactions = [];
        console.log(
          "component.biatecQuotes.route",
          component.biatecQuotes.route
        );
        for (const txBase64 of component.biatecQuotes.route.txsToSign) {
          console.log("txBase64", txBase64);
          let txBytes = new Uint8Array(Buffer.from(txBase64, "base64"));
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
        const tx = await component
          .sendRawTransaction({
            signedTxn: signedTxs,
          })
          .catch((e: any) => {
            component.error = e.message;
            component.processingTradeBiatec = false;
            component.openError(e.message);
            return;
          });
        let ret = "Processed in txs: ";

        if (!tx || !tx.txId) return;
        const confirmation = await component.waitForConfirmation({
          txId: tx.txId,
          timeout: 4,
        });
        if (confirmation) {
          ret += tx.txId + ", ";
        } else {
          component.processingTradeBiatec = false;
          await component.reloadAccount();
          return;
        }
        component.note = ret.trim().replace(/,$/, "");
        component.processingTradeBiatec = false;
        await component.reloadAccount();
      } catch (e) {
        component.error = (e as Error).message;
        component.processingTradeBiatec = false;
        component.openError((e as Error).message);
      }
    },

    get allowExecute() {
      return function (component: SwapComponent) {
        return (
          component.biatecQuotes?.route?.txsToSign?.length > 0 &&
          !component.requiresOptIn
        );
      };
    },

    get isQuoteBetter() {
      return function (component: SwapComponent) {
        if (!component.biatecQuotes?.quoteAmount) {
          return false;
        }
        // Compare with other aggregators
        const others = component.dexAggregators.filter(
          (a: any) => a.name !== "biatec" && component[a.enabledKey]
        );
        for (let other of others) {
          const otherQuote =
            component[other.quotesKey]?.quoteAmount ||
            component[other.quotesKey]?.quote;
          if (otherQuote) {
            const biatec = BigInt(
              component.biatecQuotes.quoteAmount
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
  },
];

// Helper function to add a new aggregator
export function addDexAggregator(aggregator: DexAggregator) {
  dexAggregators.push(aggregator);
}
