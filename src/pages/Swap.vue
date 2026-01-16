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
        <div
          v-if="loadingAssets"
          class="flex justify-content-center align-items-center p-5"
        >
          <ProgressSpinner />
        </div>
        <div v-else>
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
import { StoredAsset } from "@/store/indexer";

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
  loadingAssets,

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

// Computed properties for template access to aggregator data (must be writable for v-model)
const useFolks = computed({
  get: () => aggregatorData.useFolks.value,
  set: (value: boolean) => {
    aggregatorData.useFolks.value = value;
  },
});
const useDeflex = computed({
  get: () => aggregatorData.useDeflex.value,
  set: (value: boolean) => {
    aggregatorData.useDeflex.value = value;
  },
});
const useBiatec = computed({
  get: () => aggregatorData.useBiatec.value,
  set: (value: boolean) => {
    aggregatorData.useBiatec.value = value;
  },
});
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

  if (newAsset !== null && newAsset > 0n) {
    const asset = (await store.dispatch("indexer/getAsset", {
      assetIndex: BigInt(newAsset),
    })) as StoredAsset | undefined;
    if (asset) {
      fromAssetObj.value = asset;
    }
  } else {
    fromAssetObj.value = {
      assetId: 0n,
      name: "ALGO",
      unitName: "Algo",
      decimals: 6,
      type: "Native",
      label: "ALGO (Native token)",
    };
  }
  payamount.value = 0;
  localStorage.setItem("last-swap-from-asset", newAsset?.toString() || "0");
});

watch(toAsset, async (newToAsset) => {
  // Reset all aggregator data
  dexAggregators.forEach((agg) => {
    aggregatorData[agg.quotesKey].value = {};
    aggregatorData[agg.txnsKey].value =
      agg.txnsKey === "deflexTxs" ? { groupMetadata: [] } : [];
  });

  if (newToAsset !== null && newToAsset > 0n) {
    const asset = (await store.dispatch("indexer/getAsset", {
      assetIndex: BigInt(newToAsset),
    })) as StoredAsset | undefined;
    if (asset) {
      toAssetObj.value = asset;
    }
  } else {
    toAssetObj.value = {
      assetId: 0n,
      name: "ALGO",
      unitName: "Algo",
      decimals: 6,
      type: "Native",
      label: "ALGO (Native token)",
    };
  }
  localStorage.setItem("last-swap-to-asset", newToAsset?.toString() || "0");
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

  // Wait for assets to be loaded before setting saved values
  const waitForAssets = () => {
    return new Promise<void>((resolve) => {
      if (!loadingAssets.value) {
        resolve();
      } else {
        const unwatch = watch(loadingAssets, (newValue) => {
          if (!newValue) {
            unwatch();
            resolve();
          }
        });
      }
    });
  };

  await waitForAssets();

  let initialAsset = 0n;
  if (route.params.fromAsset) {
    try {
      initialAsset = BigInt(route.params.fromAsset as string);
    } catch {
      initialAsset = 0n;
    }
  } else {
    const savedAsset = localStorage.getItem("last-swap-from-asset");
    if (savedAsset !== null && savedAsset !== "" && savedAsset !== "0") {
      try {
        const savedAssetId = BigInt(savedAsset);
        // Check if the saved asset is available in current assets
        const assetExists = assets.value.some(
          (a) => a.assetId === savedAssetId
        );
        if (assetExists) {
          initialAsset = savedAssetId;
        }
      } catch {
        // ignore invalid saved value
      }
    }
  }
  asset.value = initialAsset;

  let initialToAsset = 0n;
  const vote = assets.value.find((a) => a.assetId == 452399768n);
  if (vote) {
    initialToAsset = 452399768n;
  }

  if (route.params.toAsset) {
    try {
      initialToAsset = BigInt(route.params.toAsset as string);
    } catch {
      initialToAsset = 0n;
    }
  } else {
    const savedAsset = localStorage.getItem("last-swap-to-asset");
    if (savedAsset !== null && savedAsset !== "" && savedAsset !== "0") {
      try {
        const savedAssetId = BigInt(savedAsset);
        // Check if the saved asset is available in current assets
        const assetExists = assets.value.some(
          (a) => a.assetId === savedAssetId
        );
        if (assetExists) {
          initialToAsset = savedAssetId;
        }
      } catch {
        // ignore invalid saved value
      }
    }
  }
  toAsset.value = initialToAsset;

  payamount.value = 1;
});
</script>
