<template>
  <div class="field grid">
    <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
    <div class="col-12 md:col-10">
      <Button
        class="my-2"
        severity="secondary"
        outlined
        icon="pi pi-sitemap"
        :label="$t('swap.explore_routes')"
        :disabled="!hasAnyQuote"
        @click="visible = true"
      />
    </div>
  </div>

  <Dialog
    v-model:visible="visible"
    modal
    :header="$t('swap.routes_dialog_title')"
    :style="{ width: '52rem', maxWidth: '95vw' }"
  >
    <Message v-if="tabs.length === 0" severity="secondary" :closable="false">
      {{ $t("swap.routes_no_quote") }}
    </Message>
    <Tabs v-else v-model:value="activeTab">
      <TabList>
        <Tab v-for="tab in tabs" :key="tab.name" :value="tab.name">
          {{ tab.displayName }}
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel v-for="tab in tabs" :key="tab.name" :value="tab.name">
          <SwapRouteDiagram
            :route-info="tab.info"
            :asset-meta="assetMeta"
            :raw-quote="tab.rawQuote"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import SwapRouteDiagram from "./SwapRouteDiagram.vue";
import {
  buildDeflexRouteInfo,
  buildFolksRouteInfo,
  buildBiatecRouteInfo,
  collectRouteAssetIds,
  type AggregatorRouteInfo,
} from "@/scripts/aggregators/routeInfo";
import type { StoredAsset } from "@/store/indexer";
import type { RootState } from "@/store";

const props = defineProps<{
  useDeflex: boolean;
  useFolks: boolean;
  useBiatec: boolean;
  deflexQuotes: unknown;
  deflexTxs: unknown;
  folksQuote: unknown;
  biatecQuotes: unknown;
  fromAssetObj?: StoredAsset;
  toAssetObj?: StoredAsset;
  payamount: number;
  fromAssetDecimals: number;
}>();

const store = useStore<RootState>();
const { t } = useI18n();

const visible = ref(false);
const activeTab = ref("");

const fromAssetId = computed(() => Number(props.fromAssetObj?.assetId ?? 0));
const toAssetId = computed(() => Number(props.toAssetObj?.assetId ?? 0));
const inputAmountBase = computed(() =>
  Math.round(props.payamount * 10 ** props.fromAssetDecimals)
);

interface RouteTab {
  name: string;
  displayName: string;
  info: AggregatorRouteInfo;
  rawQuote: unknown;
}

const tabs = computed<RouteTab[]>(() => {
  const list: RouteTab[] = [];
  if (props.useDeflex) {
    list.push({
      name: "deflex",
      displayName: t("swap.aggregator_name_deflex"),
      info: buildDeflexRouteInfo(
        props.deflexQuotes,
        props.deflexTxs,
        fromAssetId.value,
        toAssetId.value,
        inputAmountBase.value
      ),
      rawQuote: props.deflexQuotes,
    });
  }
  if (props.useFolks) {
    list.push({
      name: "folks",
      displayName: t("swap.aggregator_name_folks"),
      info: buildFolksRouteInfo(
        props.folksQuote,
        fromAssetId.value,
        toAssetId.value,
        inputAmountBase.value
      ),
      rawQuote: props.folksQuote,
    });
  }
  if (props.useBiatec) {
    list.push({
      name: "biatec",
      displayName: t("swap.aggregator_name_biatec"),
      info: buildBiatecRouteInfo(props.biatecQuotes, fromAssetId.value, toAssetId.value),
      rawQuote: props.biatecQuotes,
    });
  }
  return list;
});

const hasAnyQuote = computed(() => tabs.value.some((tab) => tab.info.available));

watch(
  tabs,
  (newTabs) => {
    if (!newTabs.some((tab) => tab.name === activeTab.value)) {
      activeTab.value = newTabs[0]?.name ?? "";
    }
  },
  { immediate: true }
);

const assetMeta = ref<Record<number, { symbol: string; decimals: number }>>({});

watch(
  tabs,
  async (newTabs) => {
    if (props.fromAssetObj) {
      assetMeta.value[Number(props.fromAssetObj.assetId)] = {
        symbol: props.fromAssetObj.unitName || props.fromAssetObj.name || "?",
        decimals: props.fromAssetObj.decimals ?? 6,
      };
    }
    if (props.toAssetObj) {
      assetMeta.value[Number(props.toAssetObj.assetId)] = {
        symbol: props.toAssetObj.unitName || props.toAssetObj.name || "?",
        decimals: props.toAssetObj.decimals ?? 6,
      };
    }

    const ids = new Set<number>();
    for (const tab of newTabs) {
      for (const id of collectRouteAssetIds(tab.info)) ids.add(id);
    }
    const missing = [...ids].filter((id) => assetMeta.value[id] === undefined);

    await Promise.all(
      missing.map(async (id) => {
        if (id === 0) {
          assetMeta.value[0] = {
            symbol: store.state.config.tokenSymbol,
            decimals: 6,
          };
          return;
        }
        try {
          const info = (await store.dispatch("indexer/getAsset", {
            assetIndex: BigInt(id),
          })) as StoredAsset | undefined;
          assetMeta.value[id] = {
            symbol: info?.unitName || info?.name || `#${id}`,
            decimals: info?.decimals ?? 6,
          };
        } catch {
          assetMeta.value[id] = { symbol: `#${id}`, decimals: 6 };
        }
      })
    );
  },
  { immediate: true }
);
</script>
