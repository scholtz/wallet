<template>
  <MainLayout>
    <h1>{{ $t("swap.title") }}</h1>

    <Card>
      <template #content>
        <div v-if="checkNetwork()">
          {{ $t("swap.network") }}: {{ checkNetwork() }}
        </div>
        <Message severity="error" v-else>
          {{ $t("swap.network_not_supported") }}
        </Message>
        <Message severity="error" v-if="hasSK === false">
          {{ $t("swap.has_sk") }}
        </Message>
        <div>
          <SwapAssetSelector
            :assets="assets"
            v-model:asset="asset"
            v-model:toAsset="toAsset"
            @swap-tokens="swapTokens"
          />
          <SwapAmountInput
            v-model:payamount="payamount"
            :maxAmount="maxAmount"
            :stepAmount="stepAmount"
            :decimals="decimals"
            :unit="unit"
            @set-max="payamount = maxAmount"
          />
          <SwapSlippageInput v-model:slippage="slippage" />
          <SwapOptions
            v-model:useFolks="useFolks"
            v-model:useDeflex="useDeflex"
          />
          <SwapQuoteButton
            :formInvalid="formInvalid"
            :allowExecuteDeflex="allowExecuteDeflex"
            :requiresOptIn="requiresOptIn"
            :processingQuote="processingQuote"
            @get-quote="clickGetQuote"
          />
          <SwapOptIn
            :requiresOptIn="requiresOptIn"
            :appsToOptIn="appsToOptIn"
            :processingOptin="processingOptin"
            @opt-in="clickOptInToApps"
          />
          <SwapTransactionDetails
            v-model:txsDetails="txsDetails"
            :note="note"
            :error="error"
          />
          <SwapExecuteButtons
            :useDeflex="useDeflex"
            :useFolks="useFolks"
            :allowExecuteDeflex="allowExecuteDeflex"
            :allowExecuteFolks="allowExecuteFolks"
            :processingTradeDeflex="processingTradeDeflex"
            :processingTradeFolks="processingTradeFolks"
            :isDeflexQuoteBetter="isDeflexQuoteBetter"
            :isFolksQuoteBetter="isFolksQuoteBetter"
            :deflexQuotes="deflexQuotes"
            :folksQuote="folksQuote"
            :toAssetDecimals="toAssetDecimals"
            :payamount="payamount"
            :pair="pair"
            :pairReversed="pairReversed"
            @execute-deflex="clickExecuteDeflex"
            @execute-folks="clickExecuteFolks"
          />
        </div>
      </template>
    </Card>
  </MainLayout>
</template>

<script>
import MainLayout from "../layouts/Main.vue";
import SwapAssetSelector from "../components/SwapAssetSelector.vue";
import SwapAmountInput from "../components/SwapAmountInput.vue";
import SwapSlippageInput from "../components/SwapSlippageInput.vue";
import SwapOptions from "../components/SwapOptions.vue";
import SwapQuoteButton from "../components/SwapQuoteButton.vue";
import SwapOptIn from "../components/SwapOptIn.vue";
import SwapTransactionDetails from "../components/SwapTransactionDetails.vue";
import SwapExecuteButtons from "../components/SwapExecuteButtons.vue";
import { mapActions } from "vuex";
import algosdk from "algosdk";
import { FolksRouterClient, Network, SwapMode } from "@folks-router/js-sdk";

export default {
  components: {
    MainLayout,
    SwapAssetSelector,
    SwapAmountInput,
    SwapSlippageInput,
    SwapOptions,
    SwapQuoteButton,
    SwapOptIn,
    SwapTransactionDetails,
    SwapExecuteButtons,
  },
  data() {
    return {
      assets: [],
      asset: null,
      toAsset: null,
      payamount: 0,
      fromAssetObj: {},
      toAssetObj: {},
      deflexTxs: { groupMetadata: [] },
      folksQuote: {},
      folksTxns: [],
      txsDetails: "Select assets, quantity and request quote",
      deflexQuotes: {},
      hasSK: null,
      processingQuote: false,
      processingOptin: false,
      processingTradeDeflex: false,
      processingTradeFolks: false,
      note: "",
      error: "",
      useFolks: true,
      useDeflex: true,
      slippage: 0.1,
      fee: 0,
    };
  },
  computed: {
    formInvalid() {
      return !(
        this.asset !== null &&
        this.toAsset !== null &&
        this.payamount > 0 &&
        !this.processingQuote
      );
    },
    account() {
      return this.$store.state.wallet.privateAccounts.find(
        (a) => a.addr == this.$route.params.account
      );
    },
    accountData() {
      if (!this.account) return false;
      if (!this.account.data) return false;
      return this.account.data[this.$store.state.config.env];
    },
    selectedAssetFromAccount() {
      return this.accountData["assets"].find(
        (a) => a["asset-id"] == this.asset
      );
    },
    fromAssetDecimals() {
      let decimals = 6;
      if (this.fromAssetObj && this.fromAssetObj.decimals !== undefined) {
        decimals = this.fromAssetObj.decimals;
      }
      return decimals;
    },
    decimalsPower() {
      return Math.pow(10, this.fromAssetDecimals);
    },
    toAssetDecimals() {
      let decimals = 6;
      if (this.toAssetObj && this.toAssetObj.decimals !== undefined) {
        decimals = this.toAssetObj.decimals;
      }
      return decimals;
    },
    assetData() {
      return this.assets.find((a) => a["asset-id"] == this.asset);
    },
    maxAmount() {
      if (!this.account) return 0;
      if (this.asset > 0) {
        if (!this.selectedAssetFromAccount) return 0;
        return this.selectedAssetFromAccount.amount / this.decimalsPower;
      } else {
        let ret = this.accountData.amount / 1000000 - 0.1;
        ret = ret - this.fee;
        if (this.accountData["assets"] && this.accountData["assets"].length > 0)
          ret = ret - this.accountData["assets"].length * 0.1;
        return ret;
      }
    },
    stepAmount() {
      return Math.pow(10, -1 * this.fromAssetDecimals);
    },
    allowExecuteDeflex() {
      if (
        !this.deflexTxs ||
        !this.deflexTxs.txns ||
        Object.values(this.deflexTxs.groupMetadata).length <= 0
      ) {
        return false;
      }
      return !this.requiresOptIn;
      /**/
    },
    allowExecuteFolks() {
      if (this.folksTxns && this.folksQuote && this.folksTxns.length > 0) {
        return true;
      }
      return false;
      /**/
    },
    appsToOptIn() {
      const requiredAppOptIns = this.deflexQuotes?.requiredAppOptIns ?? [];
      const ret = [];
      if (!this.account) return false;
      const optedInAppIds =
        "apps-local-state" in this.account
          ? this.account["apps-local-state"].map((state) => parseInt(state.id))
          : [];

      for (let i = 0; i < requiredAppOptIns.length; i++) {
        const requiredAppId = requiredAppOptIns[i];
        if (!optedInAppIds.includes(requiredAppId)) {
          ret.push(requiredAppId);
        }
      }
      return ret;
    },
    requiresOptIn() {
      return this.appsToOptIn.length > 0;
    },
    unit() {
      if (!this.fromAssetObj) return "";
      if (this.fromAssetObj["unit-name"]) return this.fromAssetObj["unit-name"];
      return this.fromAssetObj["name"];
    },
    fromAssetUnit() {
      if (!this.fromAssetObj) return "";
      if (this.fromAssetObj["unit-name"]) return this.fromAssetObj["unit-name"];
      return this.fromAssetObj["name"];
    },
    toAssetUnit() {
      if (!this.toAssetObj) return "";
      if (this.toAssetObj["unit-name"]) return this.toAssetObj["unit-name"];
      return this.toAssetObj["name"];
    },
    pair() {
      return `${this.fromAssetUnit}/${this.toAssetUnit}`;
    },
    pairReversed() {
      return `${this.toAssetUnit}/${this.fromAssetUnit}`;
    },
    isFolksQuoteBetter() {
      if (!this.folksQuote) {
        return false;
      }
      if (!this.folksQuote.quoteAmount) {
        return false;
      }
      if (!this.deflexQuotes) {
        return true;
      }
      if (!this.deflexQuotes.quote) {
        return true;
      }
      const deflex = BigInt(this.deflexQuotes.quote).toString();
      const folks = BigInt(this.folksQuote.quoteAmount).toString();
      if (deflex.length > folks.length) return false;
      if (folks.length > deflex.length) return true;
      return folks > deflex;
    },
    isDeflexQuoteBetter() {
      if (!this.deflexQuotes) {
        return false;
      }
      if (!this.deflexQuotes.quote) {
        return false;
      }
      if (!this.folksQuote) {
        return true;
      }
      if (!this.folksQuote.quoteAmount) {
        return true;
      }
      const deflex = BigInt(this.deflexQuotes.quote).toString();
      const folks = BigInt(this.folksQuote.quoteAmount).toString();
      if (folks.length > deflex.length) return false;
      if (deflex.length > folks.length) return true;
      return deflex > folks;
    },
  },
  watch: {
    async asset() {
      this.deflexTxs = { groupMetadata: [] };
      this.folksTxns = [];
      if (this.asset > 0) {
        this.fromAssetObj = await this.getAsset({
          assetIndex: this.asset,
        });
      } else {
        this.fromAssetObj = {
          "asset-id": -1,
          name: "ALGO",
          "unit-name": "Algo",
          decimals: 6,
        };
      }
      this.payamount = 0;
      localStorage.setItem("last-swap-from-asset", this.asset);
    },
    async toAsset() {
      this.deflexTxs = { groupMetadata: [] };
      this.folksTxns = [];
      if (this.toAsset > 0) {
        this.toAssetObj = await this.getAsset({
          assetIndex: this.toAsset,
        });
      } else {
        this.toAssetObj = {
          "asset-id": -1,
          name: "ALGO",
          "unit-name": "Algo",
          decimals: 6,
        };
      }
      localStorage.setItem("last-swap-to-asset", this.toAsset);
    },
    account() {
      this.deflexTxs = { groupMetadata: [] };
      this.folksTxns = [];
      this.makeAssets();
    },
    payamount() {
      this.deflexTxs = { groupMetadata: [] };
      this.folksTxns = [];
    },
  },
  async mounted() {
    await this.prolong();
    await this.reloadAccount();
    await this.makeAssets();

    this.asset = -1;
    const vote = this.assets.find((a) => a["asset-id"] == 452399768);
    if (vote) {
      this.toAsset = 452399768;
    } else {
      this.toAsset = -1;
    }
    this.payamount = 1;
    if (this.$route.params.fromAsset) {
      this.asset = this.$route.params.fromAsset;
    } else {
      const asset = localStorage.getItem("last-swap-from-asset");
      if (asset) {
        this.asset = Number(asset);
      }
    }
    if (this.$route.params.toAsset) {
      this.toAsset = this.$route.params.toAsset;
    } else {
      const asset = localStorage.getItem("last-swap-to-asset");
      if (asset) {
        this.toAsset = Number(asset);
      }
    }
  },
  methods: {
    ...mapActions({
      accountInformation: "indexer/accountInformation",
      updateAccount: "wallet/updateAccount",
      lastActiveAccount: "wallet/lastActiveAccount",
      deleteAccount: "wallet/deleteAccount",
      setTransaction: "wallet/setTransaction",
      getAsset: "indexer/getAsset",
      prolong: "wallet/prolong",
      openSuccess: "toast/openSuccess",
      openError: "toast/openError",
      axiosGet: "axios/get",
      axiosPost: "axios/post",
      getSK: "wallet/getSK",
      getTransactionParams: "algod/getTransactionParams",
      sendRawTransaction: "algod/sendRawTransaction",
      waitForConfirmation: "algod/waitForConfirmation",
      signTransaction: "signer/signTransaction",
    }),

    async reloadAccount() {
      await this.accountInformation({
        addr: this.$route.params.account,
      }).then((info) => {
        if (info) {
          this.updateAccount({ info });
        }
      });
      const senderSK = await this.getSK({
        addr: this.$route.params.account,
      });
      if (senderSK && senderSK.length > 0) {
        this.hasSK = true;
      } else {
        this.hasSK = false;
      }
    },
    async makeAssets() {
      this.assets = [];
      if (this.accountData) {
        const balance = this.$filters.formatCurrency(
          this.accountData.amount,
          this.$store.state.config.tokenSymbol,
          6
        );
        this.assets.push({
          "asset-id": "0",
          amount: this.accountData.amount,
          name: this.$store.state.config.tokenSymbol,
          decimals: 6,
          "unit-name": this.$store.state.config.tokenSymbol,
          type: "Native",
          label: `${this.$store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
        });
      } else {
        const balance = this.$filters.formatCurrency(
          0,
          this.$store.state.config.tokenSymbol,
          6
        );
        this.assets.push({
          "asset-id": "0",
          amount: 0,
          name: this.$store.state.config.tokenSymbol,
          decimals: 6,
          "unit-name": this.$store.state.config.tokenSymbol,
          type: "Native",
          label: `${this.$store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
        });
      }
      if (this.accountData && this.accountData.assets) {
        for (let index in this.accountData.assets) {
          const asset = await this.getAsset({
            assetIndex: this.accountData.assets[index]["asset-id"],
          });
          if (asset) {
            const balance = this.$filters.formatCurrency(
              this.accountData.assets[index]["amount"],
              asset["unit-name"] ? asset["unit-name"] : asset["name"],
              asset["decimals"]
            );

            this.assets.push({
              "asset-id": this.accountData.assets[index]["asset-id"],
              amount: this.accountData.assets[index]["amount"],
              name: asset["name"],
              decimals: asset["decimals"],
              "unit-name": asset["unit-name"],
              type: "ASA",
              label: `${asset["name"]} (ASA ${this.accountData.assets[index]["asset-id"]}) Balance: ${balance}`,
            });
          } else {
            console.error(
              "Asset not loaded",
              this.accountData.assets[index]["asset-id"]
            );
          }
        }
      }
    },
    async requestDeflexQuote() {
      try {
        this.deflexQuotes = {};
        const amount = BigInt(
          Math.round(this.payamount * 10 ** this.fromAssetDecimals)
        );
        const fromAsset = this.asset > 0 ? this.asset : 0;
        const toAsset = this.toAsset > 0 ? this.toAsset : 0;
        const chain = this.checkNetwork();
        if (!chain) {
          this.txsDetails += "\nDEFLEX: Wrong network selected";
          this.txsDetails = this.txsDetails.trim();
          this.processingQuote = false;
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

        const apiKey = this.$store.state.config.deflex;
        const request = `https://deflex.txnlab.dev/api/fetchQuote?chain=${chain}&algodUri=${algodUri}&algodToken=${algodToken}&algodPort=${algodPort}&fromASAID=${fromAsset}&toASAID=${toAsset}&atomicOnly=true&amount=${amount}&type=fixed-input&disabledProtocols=&referrerAddress=AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y&apiKey=${apiKey}`;
        const quotes = await this.axiosGet({ url: request }).catch((e) => {
          this.error = "No deflex quotes available " + e.message;
          return;
        });

        if (!quotes || !quotes.txnPayload) {
          this.error = "No deflex quotes available";
          return;
        }
        this.deflexQuotes = quotes;
        const params = JSON.stringify({
          address: this.account.addr,
          slippage: this.slippage, // 1 = 1%
          txnPayloadJSON: this.deflexQuotes.txnPayload,
          apiKey,
        });
        const config = {
          headers: {
            "Content-Type": "application/json",
          },
        };

        const txs = await this.axiosPost({
          url: "https://deflex.txnlab.dev/api/fetchExecuteSwapTxns",
          body: params,
          config,
        }).catch((e) => {
          this.error += "No deflex quotes available " + e.message + "\n";
          return;
        });
        if (!txs) {
          this.error = "No deflex quotes available\n";
          this.processingQuote = false;
          return;
        }
        this.deflexTxs = txs;

        const ret2 = this.deflexTxs.groupMetadata
          .map((tx) => tx.labelText)
          .join(",\n");
        this.txsDetails += "\nDEFLEX: " + ret2;
        this.txsDetails = this.txsDetails.trim();
      } catch (e) {
        this.openError("Error fetching quote from deflex: " + e.message);
      }
    },
    getFolksClient() {
      if (this.$store.state.config.env == "mainnet-v1.0") {
        return new FolksRouterClient(Network.MAINNET);
      }
      if (this.$store.state.config.env == "mainnet") {
        return new FolksRouterClient(Network.MAINNET);
      }
      if (this.$store.state.config.env == "testnet-v1.0") {
        return new FolksRouterClient(Network.TESTNET);
      }
      if (this.$store.state.config.env == "testnet") {
        return new FolksRouterClient(Network.TESTNET);
      }
      return null;
    },
    async fetchFolksRouterQuotes() {
      try {
        this.folksQuote = {};
        const amount = BigInt(
          Math.round(this.payamount * 10 ** this.fromAssetObj.decimals)
        );
        const folksRouterClient = this.getFolksClient();
        if (!folksRouterClient)
          throw Error(
            "Unable to create folks router client for specified network"
          );
        const fromAsset = this.asset > 0 ? this.asset : 0;
        const toAsset = this.toAsset > 0 ? this.toAsset : 0;

        this.folksQuote = await folksRouterClient.fetchSwapQuote(
          fromAsset,
          toAsset,
          amount,
          SwapMode.FIXED_INPUT,
          15,
          10,
          "AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y"
        );
        const slippage = Math.round(this.slippage * 100);
        this.folksTxns = await folksRouterClient.prepareSwapTransactions(
          this.$route.params.account,
          slippage,
          this.folksQuote
        );
        const token = await this.getAsset({
          assetIndex: toAsset,
        });
        this.txsDetails += `\nFOLKS ROUTER: Quote Amount: ${
          Number(this.folksQuote.quoteAmount) / 10 ** token.decimals
        }, Price Impact: ${
          Math.round(Number(this.folksQuote.priceImpact) * 10000) / 100
        }%, Txs fees: ${
          Number(this.folksQuote.microalgoTxnsFee) / 10 ** 6
        } Algo`;
        this.txsDetails = this.txsDetails.trim();
      } catch (e) {
        this.openError(`Error fetching quote from folks: ${e.message}`);
      }
    },
    async clickGetQuote() {
      this.prolong();
      this.note = "";
      this.error = "";
      this.processingQuote = true;
      this.txsDetails = "";
      this.deflexTxs = { groupMetadata: [] };
      this.folksTxns = [];
      var promises = [];
      if (this.useDeflex) promises.push(this.requestDeflexQuote());
      if (this.useFolks) promises.push(this.fetchFolksRouterQuotes());
      await Promise.all(promises);
      this.processingQuote = false;
    },
    checkNetwork() {
      if (this.$store.state.config.env == "mainnet-v1.0") {
        return "mainnet";
      }
      if (this.$store.state.config.env == "mainnet") {
        return "mainnet";
      }
      if (this.$store.state.config.env == "testnet-v1.0") {
        return "testnet";
      }
      if (this.$store.state.config.env == "testnet") {
        return "testnet";
      }
      return false;
    },
    async clickExecuteFolks() {
      this.prolong();
      this.processingTradeFolks = true;
      this.note = "";
      this.error = "";
      const senderSK = await this.getSK({
        addr: this.account.addr,
      });
      if (!senderSK) {
        this.processingTradeFolks = false;
        return;
      }
      const unsignedTxns = this.folksTxns.map((txn) =>
        algosdk.decodeUnsignedTransaction(Buffer.from(txn, "base64"))
      );
      const signedTxns = unsignedTxns.map((txn) => txn.signTxn(senderSK));
      if (!signedTxns) {
        this.processingTradeFolks = false;
        return;
      }
      let tx = await this.sendRawTransaction({
        signedTxn: signedTxns,
      }).catch((e) => {
        this.error = e.message;
        this.processingTradeFolks = false;
        this.openError(e.message);
        return;
      });

      let ret = "Processed in txs: ";

      if (!tx || !tx.txId) return;
      const confirmation = await this.waitForConfirmation({
        txId: tx.txId,
        timeout: 4,
      });
      if (confirmation) {
        ret += tx.txId + ", ";
      } else {
        this.processingOptin = false;
        await this.reloadAccount();
        return;
      }
      this.note = ret.trim().trim(",");
      this.processingTradeFolks = false;
      await this.reloadAccount();
    },
    async clickExecuteDeflex() {
      this.prolong();
      this.processingTradeDeflex = true;
      this.note = "";
      this.error = "";
      const senderSK = await this.getSK({
        addr: this.account.addr,
      });
      if (!senderSK) {
        this.processingTradeDeflex = false;
        return;
      }
      const byGroup = this.deflexTxs.txns.reduce(
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
          this.processingTradeDeflex = false;
          return;
        }
        const tx = await this.sendRawTransaction({
          signedTxn: signedTxns,
        }).catch((e) => {
          this.error = e.message;
          this.processingTradeDeflex = false;
          this.openError(e.message);
          return;
        });
        if (!tx || !tx.txId) return;
        const confirmation = await this.waitForConfirmation({
          txId: tx.txId,
          timeout: 4,
        });
        if (confirmation) {
          ret += tx.txId + ", ";
        } else {
          this.processingOptin = false;
          await this.reloadAccount();
          return;
        }
      }
      this.note = ret.trim().trim(",");
      this.processingTradeDeflex = false;
      await this.reloadAccount();
    },
    swapTokens() {
      const tmp = this.toAsset;
      this.toAsset = this.asset;
      this.asset = tmp;
    },
    async clickOptInToApps() {
      this.processingOptin = true;
      const params = await this.getTransactionParams();

      let ret = "Processed in txs: ";
      for (let app of this.appsToOptIn) {
        const appOptInTxn = algosdk.makeApplicationOptInTxn(
          this.account.addr,
          params,
          app
        );

        let signedTxn = await signTransaction({
          from: this.account.addr,
          tx: appOptInTxn,
        });
        const tx = await this.sendRawTransaction({ signedTxn }).catch((e) => {
          //console.error("error doing swap", e);
          this.error = e.message;
          this.processingTradeDeflex = false;
          return;
        });
        if (!tx || !tx.txId) {
          this.processingOptin = false;
          await this.reloadAccount();
          return;
        }
        const confirmation = await this.waitForConfirmation({
          txId: tx.txId,
          timeout: 4,
        });
        if (confirmation) {
          ret += tx.txId + ", ";
        } else {
          this.processingOptin = false;
          await this.reloadAccount();
          return;
        }
      }

      this.note = ret.trim().trim(",");
      await this.reloadAccount();
      this.processingOptin = false;
    },
  },
};
</script>
