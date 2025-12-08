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
            :aggregators="dexAggregators"
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
import { dexAggregators } from "../scripts/dexAggregators.js";

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
    // Initialize aggregator data dynamically
    const aggregatorData = {};
    dexAggregators.forEach(agg => {
      aggregatorData[agg.quotesKey] = {};
      aggregatorData[agg.txnsKey] = agg.txnsKey === 'deflexTxs' ? { groupMetadata: [] } : [];
      aggregatorData[agg.processingKey] = false;
      aggregatorData[agg.enabledKey] = agg.name === 'folks' || agg.name === 'deflex'; // Default enabled
    });

    return {
      assets: [],
      asset: null,
      toAsset: null,
      payamount: 0,
      fromAssetObj: {},
      toAssetObj: {},
      txsDetails: "Select assets, quantity and request quote",
      hasSK: null,
      processingQuote: false,
      processingOptin: false,
      note: "",
      error: "",
      slippage: 0.1,
      fee: 0,
      dexAggregators,
      // Spread aggregator data
      ...aggregatorData,
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
      const agg = this.dexAggregators.find(a => a.name === 'deflex');
      return agg ? agg.allowExecute(this) : false;
    },
    allowExecuteFolks() {
      const agg = this.dexAggregators.find(a => a.name === 'folks');
      return agg ? agg.allowExecute(this) : false;
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
      const agg = this.dexAggregators.find(a => a.name === 'folks');
      return agg ? agg.isQuoteBetter(this) : false;
    },
    isDeflexQuoteBetter() {
      const agg = this.dexAggregators.find(a => a.name === 'deflex');
      return agg ? agg.isQuoteBetter(this) : false;
    },
  },
  watch: {
    async asset() {
      // Reset all aggregator data
      this.dexAggregators.forEach(agg => {
        this[agg.quotesKey] = {};
        this[agg.txnsKey] = agg.txnsKey === 'deflexTxs' ? { groupMetadata: [] } : [];
      });
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
      // Reset all aggregator data
      this.dexAggregators.forEach(agg => {
        this[agg.quotesKey] = {};
        this[agg.txnsKey] = agg.txnsKey === 'deflexTxs' ? { groupMetadata: [] } : [];
      });
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
      // Reset all aggregator data
      this.dexAggregators.forEach(agg => {
        this[agg.quotesKey] = {};
        this[agg.txnsKey] = agg.txnsKey === 'deflexTxs' ? { groupMetadata: [] } : [];
      });
      this.makeAssets();
    },
    payamount() {
      // Reset all aggregator data
      this.dexAggregators.forEach(agg => {
        this[agg.quotesKey] = {};
        this[agg.txnsKey] = agg.txnsKey === 'deflexTxs' ? { groupMetadata: [] } : [];
      });
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

    async clickGetQuote() {
      this.prolong();
      this.note = "";
      this.error = "";
      this.processingQuote = true;
      this.txsDetails = "";
      // Reset all aggregator data
      this.dexAggregators.forEach(agg => {
        this[agg.quotesKey] = {};
        this[agg.txnsKey] = agg.txnsKey === 'deflexTxs' ? { groupMetadata: [] } : [];
      });

      const promises = [];
      this.dexAggregators.forEach(agg => {
        if (this[agg.enabledKey]) {
          promises.push(agg.getQuote(this));
        }
      });
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
      const agg = this.dexAggregators.find(a => a.name === 'folks');
      if (agg) {
        await agg.execute(this);
      }
    },
    async clickExecuteDeflex() {
      const agg = this.dexAggregators.find(a => a.name === 'deflex');
      if (agg) {
        await agg.execute(this);
      }
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
