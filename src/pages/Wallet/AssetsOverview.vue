<template>
  <MainLayout>
    <div class="grid">
      <div class="col">
        <h1>{{ t("assets_overview.title") }}</h1>
      </div>
    </div>

    <div class="grid align-items-center mb-3">
      <div class="col-fixed" style="min-width: 260px">
        <Select
          v-model="activeProfileId"
          :options="profileOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>
      <div class="col-fixed">
        <Button
          :label="t('assets_overview.manage_profiles')"
          icon="pi pi-cog"
          @click="showManageDialog = true"
        />
      </div>
      <div class="col-fixed">
        <Button icon="pi pi-refresh" :loading="loading" @click="refresh" />
      </div>
    </div>

    <Card>
      <template #content>
        <DataTable
          :value="filteredRows"
          responsive-layout="scroll"
          :paginator="true"
          :rows="20"
          :loading="loading"
          v-model:filters="filters"
          v-model:selection="selectedRow"
          selection-mode="single"
          filterDisplay="menu"
          :globalFilterFields="[
            'accountName',
            'accountAddr',
            'name',
            'assetId',
            'amount',
            'assetType',
          ]"
        >
          <template #header>
            <div class="flex justify-content-end" v-if="filters['global']">
              <IconField>
                <InputIcon class="pi pi-search" />
                <InputText
                  v-model="(filters['global'] as any).value"
                  :placeholder="$t('global.keyword_search')"
                />
              </IconField>
            </div>
          </template>
          <template #empty>
            {{ t("assets_overview.no_assets") }}
          </template>
          <Column
            field="accountName"
            :header="t('assets_overview.account')"
            :sortable="true"
            :show-filter-match-modes="false"
          >
            <template #body="slotProps">
              <div class="flex align-items-center gap-1">
                <span class="white-space-nowrap"
                  >{{ slotProps.data.accountName }}:</span
                >
                <AlgorandAddress :address="slotProps.data.accountAddr" />
              </div>
            </template>
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                @input="filterCallback()"
                class="p-column-filter"
                :placeholder="t('assets_overview.search_by_account')"
              />
            </template>
          </Column>
          <Column
            field="name"
            :header="t('assets_overview.name')"
            :sortable="true"
            :show-filter-match-modes="false"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                @input="filterCallback()"
                class="p-column-filter"
                :placeholder="t('assets_overview.search_by_name')"
              />
            </template>
          </Column>
          <Column
            field="assetType"
            :header="t('assets_overview.type')"
            :sortable="true"
            :show-filter-match-modes="false"
          >
            <template #body="slotProps">
              <div v-if="slotProps.data.assetType == 'Native'">
                <Badge severity="primary" value="Native"></Badge>
              </div>
              <div v-else-if="slotProps.data.assetType == 'ASA'">
                <Badge severity="info" value="ASA"></Badge>
              </div>
              <div v-else-if="slotProps.data.assetType == 'ARC200'">
                <Badge severity="success" value="ARC200"></Badge>
              </div>
            </template>
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                @input="filterCallback()"
                class="p-column-filter"
                :placeholder="t('assets_overview.search_by_type')"
              />
            </template>
          </Column>
          <Column
            field="assetId"
            :header="t('assets_overview.id')"
            :sortable="true"
            :show-filter-match-modes="false"
          >
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                @input="filterCallback()"
                class="p-column-filter"
                :placeholder="t('assets_overview.search_by_id')"
              />
            </template>
          </Column>
          <Column
            field="amount"
            :header="t('assets_overview.amount')"
            :sortable="true"
            :show-filter-match-modes="false"
          >
            <template #body="slotProps">
              <div class="text-right">
                {{ formatAssetAmount(slotProps.data) }}
              </div>
            </template>
            <template #filter="{ filterModel, filterCallback }">
              <InputText
                v-model="filterModel.value"
                type="text"
                @input="filterCallback()"
                class="p-column-filter"
                :placeholder="t('assets_overview.search_by_amount')"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <ManageAssetProfilesDialog
      v-model:visible="showManageDialog"
      :rows="rows"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { FilterMatchMode } from "@primevue/core/api";
import Badge from "primevue/badge";
import MainLayout from "../../layouts/Main.vue";
import AlgorandAddress from "@/components/AlgorandAddress.vue";
import ManageAssetProfilesDialog from "@/components/asset-profiles/ManageAssetProfilesDialog.vue";
import { useStore } from "@/store";
import type { AssetProfile } from "@/store/config";
import {
  applyAssetProfile,
  getCachedAssetMeta,
  type AssetOverviewRow,
} from "@/scripts/aggregators/assetsOverview";

const store = useStore();
const router = useRouter();
const { t } = useI18n();

const instance = getCurrentInstance();
const filtersUtil = instance?.appContext.config.globalProperties.$filters;

const loading = ref(true);
const rows = ref<AssetOverviewRow[]>([]);
const showManageDialog = ref(false);
const selectedRow = ref<AssetOverviewRow | null>(null);

const filters = ref<Record<string, { value: string | null; matchMode: string }>>({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  accountName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  assetType: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  assetId: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  amount: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
});

const activeProfileId = computed({
  get: () => store.state.config.activeAssetProfileId,
  set: (v: string) => store.dispatch("config/setActiveAssetProfileId", v),
});

const profileOptions = computed(() => [
  { label: t("assets_overview.default_profile"), value: "" },
  ...store.state.config.assetProfiles.map((p: AssetProfile) => ({
    label: `${p.name} (${p.mode})`,
    value: p.id,
  })),
]);

const activeProfile = computed<AssetProfile | undefined>(() =>
  store.state.config.assetProfiles.find(
    (p: AssetProfile) => p.id === activeProfileId.value
  )
);

const filteredRows = computed(() =>
  applyAssetProfile(rows.value, activeProfile.value)
);

const formatCurrencyValue = (
  amount: bigint,
  name?: string,
  decimals?: number
) => {
  if (filtersUtil?.formatCurrency) {
    return filtersUtil.formatCurrency(amount, name, decimals);
  }
  return name ? `${amount} ${name}` : `${amount}`;
};

const formatAssetAmount = (row: AssetOverviewRow) => {
  return formatCurrencyValue(row.amount, row.unitName || row.name, row.decimals);
};

// Reads only what is already loaded in the wallet store (and the asset
// metadata cache) -- never issues a network request. An account only shows
// up here once its data has been loaded by visiting that account's own
// pages at least once; this page does not fetch anything on its own.
const buildRows = () => {
  loading.value = true;
  const result: AssetOverviewRow[] = [];
  const env = store.state.config.env;
  const inMemoryAssets = store.state.indexer.assets;
  for (const account of store.state.wallet.privateAccounts) {
    const accountData = account.data?.[env];
    if (!accountData) continue;
    const accountAddr = account.addr;
    const accountName = account.name ?? account.addr;

    const nativeAmount = BigInt(accountData.amount ?? 0);
    if (nativeAmount > 0) {
      result.push({
        accountAddr,
        accountName,
        assetId: "0",
        assetType: "Native",
        amount: nativeAmount,
        name: store.state.config.tokenSymbol ?? "Algo",
        decimals: 6,
        unitName: store.state.config.tokenSymbol ?? "Algo",
      });
    }

    const asaAssets = Array.isArray(accountData.assets)
      ? accountData.assets
      : [];
    for (const accountAsset of asaAssets) {
      const assetId = BigInt(accountAsset.assetId ?? 0n);
      if (!assetId) continue;
      const asset = getCachedAssetMeta(env, assetId, inMemoryAssets);
      result.push({
        accountAddr,
        accountName,
        assetId: String(assetId),
        assetType: "ASA",
        amount: BigInt(accountAsset.amount ?? 0n),
        name: asset?.name ?? "",
        decimals: Number(asset?.decimals ?? 0),
        unitName: asset?.unitName ?? "",
      });
    }

    if (accountData.arc200) {
      for (const arc200 of Object.values(accountData.arc200)) {
        result.push({
          accountAddr,
          accountName,
          assetId: String(arc200.arc200id),
          assetType: "ARC200",
          amount: BigInt(arc200.balance),
          name: arc200.name,
          decimals: Number(arc200.decimals),
          unitName: arc200.symbol,
        });
      }
    }
  }
  rows.value = result;
  loading.value = false;
};

const refresh = () => buildRows();

watch(
  () => store.state.wallet.privateAccounts,
  () => buildRows(),
  { deep: true }
);
watch(
  () => store.state.config.env,
  () => buildRows()
);

watch(
  () => selectedRow.value?.accountAddr,
  async (addr) => {
    if (!addr) return;
    await store.dispatch("wallet/lastActiveAccount", { addr });
    router.push(`/account/${addr}`);
  }
);

onMounted(() => {
  buildRows();
});
</script>
