<template>
  <div class="field grid">
    <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
    <div class="col-12 md:col-10">
      <Button
        class="my-2"
        severity="secondary"
        outlined
        :icon="expanded ? 'pi pi-chevron-up' : 'pi pi-sitemap'"
        :label="expanded ? $t('swap.hide_routes') : $t('swap.explore_routes')"
        :disabled="!hasAnyQuote"
        @click="expanded = !expanded"
      />
    </div>
  </div>

  <div v-if="expanded" class="route-explorer-panel">
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
            :simulation="simulationResults[tab.name]"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
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
import {
  extractDeflexSimulateGroups,
  extractFolksSimulateGroups,
  extractBiatecSimulateGroups,
  summarizeSimulation,
  type SimulatedOutcome,
} from "@/scripts/aggregators/simulate";
import type { StoredAsset } from "@/store/indexer";
import type { RootState } from "@/store";

const props = defineProps<{
  useDeflex: boolean;
  useFolks: boolean;
  useBiatec: boolean;
  deflexQuotes: unknown;
  deflexTxs: unknown;
  folksQuote: unknown;
  folksTxns: unknown;
  biatecQuotes: unknown;
  fromAssetObj?: StoredAsset;
  toAssetObj?: StoredAsset;
  payamount: number;
  fromAssetDecimals: number;
  accountAddr?: string;
}>();

const store = useStore<RootState>();
const { t } = useI18n();

const expanded = ref(false);
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

// Dry-runs each aggregator's prepared transactions against current ledger
// state to show the real (not just quoted/estimated) swap outcome. Requires
// no secret key and never broadcasts anything, so it's safe to run
// automatically as soon as the route panel is opened.
const simulationResults = ref<Record<string, SimulatedOutcome | "loading" | undefined>>(
  {}
);

const simulateTab = async (tab: RouteTab): Promise<void> => {
  if (!props.accountAddr || !tab.info.available) return;

  let groups: Uint8Array[][] = [];
  if (tab.name === "deflex") {
    groups = extractDeflexSimulateGroups(props.deflexTxs);
  } else if (tab.name === "folks") {
    groups = extractFolksSimulateGroups(props.folksTxns);
  } else if (tab.name === "biatec") {
    groups = extractBiatecSimulateGroups(props.biatecQuotes);
  }
  if (groups.length === 0 || groups.every((group) => group.length === 0)) return;

  simulationResults.value[tab.name] = "loading";
  try {
    const response = await store.dispatch("algod/simulateTransactionGroups", {
      groups,
    });
    simulationResults.value[tab.name] = summarizeSimulation(
      response,
      props.accountAddr,
      fromAssetId.value,
      toAssetId.value
    );
  } catch (error) {
    simulationResults.value[tab.name] = {
      success: false,
      failureMessage: error instanceof Error ? error.message : String(error),
    };
  }
};

watch(tabs, (newTabs) => {
  for (const tab of newTabs) {
    if (!tab.info.available) {
      simulationResults.value[tab.name] = undefined;
    }
  }
  if (!expanded.value) return;
  for (const tab of newTabs) {
    if (tab.info.available) simulateTab(tab);
  }
});

watch(expanded, (isExpanded) => {
  if (!isExpanded) return;
  for (const tab of tabs.value) {
    if (tab.info.available && simulationResults.value[tab.name] === undefined) {
      simulateTab(tab);
    }
  }
});
</script>

<style scoped>
.route-explorer-panel {
  margin: 0.5rem 0 1rem;
  padding: 1rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
}
</style>
