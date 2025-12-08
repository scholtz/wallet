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

export const dexAggregators = [
  {
    name: "deflex",
    displayName: "Deflex",
    enabledKey: "useDeflex",
    quotesKey: "deflexQuotes",
    txnsKey: "deflexTxs",
    processingKey: "processingTradeDeflex",

    async getQuote(component) {
      try {
        component.deflexQuotes = {};
        const amount = BigInt(
          Math.round(component.payamount * 10 ** component.fromAssetDecimals)
        );
        const fromAsset = component.asset > 0 ? component.asset : 0;
        const toAsset = component.toAsset > 0 ? component.toAsset : 0;
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
        const quotes = await component.axiosGet({ url: request }).catch((e) => {
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
          .catch((e) => {
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
          .map((tx) => tx.labelText)
          .join(",\n");
        component.txsDetails += "\nDEFLEX: " + ret2;
        component.txsDetails = component.txsDetails.trim();
      } catch (e) {
        component.openError("Error fetching quote from deflex: " + e.message);
      }
    },

    async execute(component) {
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
        (entryMap, e) =>
          entryMap.set(e.group, [...(entryMap.get(e.group) || []), e]),
        new Map()
      );
      const byGroupMap = [...byGroup].map((m) => m[1]);

      let ret = "Processed in txs: ";
      for (let group of byGroupMap) {
        const signedTxns = group.map((txn) => {
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
          .catch((e) => {
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
          component.processingOptin = false;
          await component.reloadAccount();
          return;
        }
      }
      component.note = ret.trim().trim(",");
      component.processingTradeDeflex = false;
      await component.reloadAccount();
    },

    get allowExecute() {
      return function (component) {
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
      return function (component) {
        if (!component.deflexQuotes) {
          return false;
        }
        if (!component.deflexQuotes.quote) {
          return false;
        }
        // Compare with other aggregators
        const others = component.dexAggregators.filter(
          (a) => a.name !== "deflex" && component[a.enabledKey]
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

    getFolksClient(component) {
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

    async getQuote(component) {
      try {
        component.folksQuote = {};
        const amount = BigInt(
          Math.round(
            component.payamount * 10 ** component.fromAssetObj.decimals
          )
        );
        const folksRouterClient = this.getFolksClient(component);
        if (!folksRouterClient)
          throw Error(
            "Unable to create folks router client for specified network"
          );
        const fromAsset = component.asset > 0 ? component.asset : 0;
        const toAsset = component.toAsset > 0 ? component.toAsset : 0;

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
        component.openError(`Error fetching quote from folks: ${e.message}`);
      }
    },

    async execute(component) {
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
      const unsignedTxns = component.folksTxns.map((txn) =>
        component.algosdk.decodeUnsignedTransaction(Buffer.from(txn, "base64"))
      );
      const signedTxns = unsignedTxns.map((txn) => txn.signTxn(senderSK));
      if (!signedTxns) {
        component.processingTradeFolks = false;
        return;
      }
      let tx = await component
        .sendRawTransaction({
          signedTxn: signedTxns,
        })
        .catch((e) => {
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
        component.processingOptin = false;
        await component.reloadAccount();
        return;
      }
      component.note = ret.trim().trim(",");
      component.processingTradeFolks = false;
      await component.reloadAccount();
    },

    get allowExecute() {
      return function (component) {
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
      return function (component) {
        if (!component.folksQuote) {
          return false;
        }
        if (!component.folksQuote.quoteAmount) {
          return false;
        }
        // Compare with other aggregators
        const others = component.dexAggregators.filter(
          (a) => a.name !== "folks" && component[a.enabledKey]
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
];

// Helper function to add a new aggregator
export function addDexAggregator(aggregator) {
  dexAggregators.push(aggregator);
}
