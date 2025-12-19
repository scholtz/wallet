<template>
  <MainLayout>
    <h1>{{ t("swap.title") }}</h1>

    <Card>
      <template #content>
        <div v-if="checkNetwork()">
          {{ t("swap.network") }}: {{ checkNetwork() }}
        </div>
        <Message severity="error" v-else>
          {{ t("swap.network_not_supported") }}
        </Message>
        <Message severity="error" v-if="hasSK === false">
          {{ t("swap.has_sk") }}
        </Message>
        <div>
          <SwapAssetSelector
            :assets="assets"
            :asset="asset ?? undefined"
            @update:asset="asset = $event"
            :toAsset="toAsset ?? undefined"
            @update:toAsset="toAsset = $event"
            @swap-tokens="swapTokens"
          />
          <SwapAmountInput
            v-model:payamount="payamount"
            :maxAmount="maxAmount"
            :stepAmount="stepAmount"
            :decimals="fromAssetDecimals"
            :unit="unit"
            @set-max="payamount = maxAmount"
          />
          <SwapSlippageInput v-model:slippage="slippage" />
          <SwapOptions
            :aggregators="dexAggregators"
            v-model:useFolks="useFolks"
            v-model:useDeflex="useDeflex"
            v-model:useBiatec="useBiatec"
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
            :useBiatec="useBiatec"
            :allowExecuteDeflex="allowExecuteDeflex"
            :allowExecuteFolks="allowExecuteFolks"
            :allowExecuteBiatec="allowExecuteBiatec"
            :processingTradeDeflex="processingTradeDeflex"
            :processingTradeFolks="processingTradeFolks"
            :processingTradeBiatec="processingTradeBiatec"
            :isDeflexQuoteBetter="isDeflexQuoteBetter"
            :isFolksQuoteBetter="isFolksQuoteBetter"
            :isBiatecQuoteBetter="isBiatecQuoteBetter"
            :deflexQuotes="deflexQuotes"
            :folksQuote="folksQuote"
            :biatecQuotes="biatecQuotes"
            :toAssetDecimals="toAssetDecimals"
            :payamount="payamount"
            :pair="pair"
            :pairReversed="pairReversed"
            @execute-deflex="clickExecuteDeflex"
            @execute-folks="clickExecuteFolks"
            @execute-biatec="clickExecuteBiatec"
          />
        </div>
      </template>
    </Card>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, watch, computed } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import MainLayout from "../layouts/Main.vue";
import SwapAssetSelector from "../components/SwapAssetSelector.vue";
import SwapAmountInput from "../components/SwapAmountInput.vue";
import SwapSlippageInput from "../components/SwapSlippageInput.vue";
import SwapOptions from "../components/SwapOptions.vue";
import SwapQuoteButton from "../components/SwapQuoteButton.vue";
import SwapOptIn from "../components/SwapOptIn.vue";
import SwapTransactionDetails from "../components/SwapTransactionDetails.vue";
import SwapExecuteButtons from "../components/SwapExecuteButtons.vue";
import { dexAggregators } from "../scripts/dexAggregators";
import { useSwap } from "../composables/useSwap";
import { RootState } from "@/store";

const { t } = useI18n();
const store = useStore<RootState>();
const route = useRoute();

// Use the swap composable
const {
  // State
  assets,
  asset,
  toAsset,
  payamount,
  fromAssetObj,
  toAssetObj,
  txsDetails,
  hasSK,
  processingQuote,
  processingOptin,
  note,
  error,
  slippage,
  aggregatorData,

  // Computed
  formInvalid,
  account,
  maxAmount,
  stepAmount,
  allowExecuteDeflex,
  allowExecuteFolks,
  allowExecuteBiatec,
  appsToOptIn,
  requiresOptIn,
  unit,
  fromAssetDecimals,
  toAssetDecimals,
  pair,
  pairReversed,
  isFolksQuoteBetter,
  isBiatecQuoteBetter,
  isDeflexQuoteBetter,

  // Methods
  reloadAccount,
  makeAssets,
  clickGetQuote,
  checkNetwork,
  clickExecuteFolks,
  clickExecuteBiatec,
  clickExecuteDeflex,
  swapTokens,
  clickOptInToApps,
} = useSwap();

// Computed properties for template access to aggregator data
const useFolks = computed(() => aggregatorData.useFolks.value);
const useDeflex = computed(() => aggregatorData.useDeflex.value);
const useBiatec = computed(() => aggregatorData.useBiatec.value);
const processingTradeDeflex = computed(
  () => aggregatorData.processingTradeDeflex.value
);
const processingTradeFolks = computed(
  () => aggregatorData.processingTradeFolks.value
);
const processingTradeBiatec = computed(
  () => aggregatorData.processingTradeBiatec.value
);
const deflexQuotes = computed(() => aggregatorData.deflexQuotes.value);
const folksQuote = computed(() => aggregatorData.folksQuote.value);
const biatecQuotes = computed(() => aggregatorData.biatecQuotes.value);

// Watchers
watch(asset, async (newAsset) => {
  // Reset all aggregator data
  dexAggregators.forEach((agg) => {
    aggregatorData[agg.quotesKey].value = {};
    aggregatorData[agg.txnsKey].value =
      agg.txnsKey === "deflexTxs" ? { groupMetadata: [] } : [];
  });

  if (newAsset && newAsset > 0) {
    fromAssetObj.value = await store.dispatch("indexer/getAsset", {
      assetIndex: newAsset,
    });
  } else {
    fromAssetObj.value = {
      "asset-id": 0,
      name: "ALGO",
      "unit-name": "Algo",
      decimals: 6,
    };
  }
  payamount.value = 0;
  localStorage.setItem("last-swap-from-asset", newAsset?.toString() || "");
});

watch(toAsset, async (newToAsset) => {
  // Reset all aggregator data
  dexAggregators.forEach((agg) => {
    aggregatorData[agg.quotesKey].value = {};
    aggregatorData[agg.txnsKey].value =
      agg.txnsKey === "deflexTxs" ? { groupMetadata: [] } : [];
  });

  if (newToAsset && newToAsset > 0) {
    toAssetObj.value = await store.dispatch("indexer/getAsset", {
      assetIndex: newToAsset,
    });
  } else {
    toAssetObj.value = {
      "asset-id": 0,
      name: "ALGO",
      "unit-name": "Algo",
      decimals: 6,
    };
  }
  localStorage.setItem("last-swap-to-asset", newToAsset?.toString() || "");
});

watch(account, () => {
  // Reset all aggregator data
  dexAggregators.forEach((agg) => {
    aggregatorData[agg.quotesKey].value = {};
    aggregatorData[agg.txnsKey].value =
      agg.txnsKey === "deflexTxs" ? { groupMetadata: [] } : [];
  });
  makeAssets();
});

watch(payamount, () => {
  // Reset all aggregator data
  dexAggregators.forEach((agg) => {
    aggregatorData[agg.quotesKey].value = {};
    aggregatorData[agg.txnsKey].value =
      agg.txnsKey === "deflexTxs" ? { groupMetadata: [] } : [];
  });
});

// Lifecycle
onMounted(async () => {
  await store.dispatch("wallet/prolong");
  await reloadAccount();
  await makeAssets();

  asset.value = 0;
  const vote = assets.value.find((a) => a["asset-id"] == 452399768);
  if (vote) {
    toAsset.value = 452399768;
  } else {
    toAsset.value = 0;
  }
  payamount.value = 1;

  if (route.params.fromAsset) {
    asset.value = Number(route.params.fromAsset);
  } else {
    const savedAsset = localStorage.getItem("last-swap-from-asset");
    if (savedAsset) {
      asset.value = Number(savedAsset);
    }
  }

  if (route.params.toAsset) {
    toAsset.value = Number(route.params.toAsset);
  } else {
    const savedAsset = localStorage.getItem("last-swap-to-asset");
    if (savedAsset) {
      toAsset.value = Number(savedAsset);
    }
  }
});
</script>
