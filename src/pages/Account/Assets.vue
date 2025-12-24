<template>
  <MainLayout>
    <AccountTopMenu />

    <DataTable
      v-if="filters"
      :value="assets"
      responsive-layout="scroll"
      :paginator="true"
      :rows="20"
      :loading="loading"
      v-model:filters="filters"
      filterDisplay="menu"
      :globalFilterFields="['name', 'asset-id', 'amount', 'type']"
    >
      <template #header>
        <div class="flex justify-content-end" v-if="filters['global']">
          <span class="p-input-icon-left">
            <i class="pi pi-search" />
            <InputText
              v-model="filters['global'].value"
              :placeholder="$t('global.keyword_search')"
            />
          </span>
        </div>
      </template>
      <template #empty>
        {{ $t("acc_overview.no_assets") }}
      </template>
      <Column
        field="name"
        :header="$t('acc_overview_assets.name')"
        :sortable="true"
      >
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('acc_overview_assets.search_by_name')"
          />
        </template>
      </Column>
      <Column
        field="type"
        :header="$t('acc_overview_assets.type')"
        :sortable="true"
      >
        <template #body="slotProps">
          <div v-if="slotProps.data.type == 'Native'">
            <Badge severity="primary" value="Native"></Badge>
          </div>
          <div v-else-if="slotProps.data['type'] == 'ASA'">
            <Badge severity="info" value="ASA"></Badge>
          </div>
          <div v-else-if="slotProps.data['type'] == 'ARC200'">
            <Badge severity="success" value="ARC200"></Badge>
          </div>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('acc_overview_assets.search_by_type')"
          />
        </template>
      </Column>
      <Column
        field="asset-id"
        :header="$t('acc_overview_assets.id')"
        :sortable="true"
      >
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('placeholders.search_by_asset_id')"
          />
        </template>
      </Column>
      <Column
        field="amount"
        :header="$t('acc_overview_assets.amount')"
        :sortable="true"
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
            :placeholder="$t('acc_overview_assets.search_by_amount')"
          />
        </template>
      </Column>
      <Column :header="$t('acc_overview_assets.actions')" :sortable="true">
        <template #body="slotProps">
          <Button class="m-1" size="small" @click="refresh(slotProps.data)">
            <i class="pi pi-refresh"></i>
          </Button>
          <RouterLink
            :to="`/accounts/pay/${lastActiveAccountAddr}/${slotProps.data['asset-id']}`"
          >
            <Button
              class="m-1"
              size="small"
              @click="refresh(slotProps.data)"
              :title="$t('acc_overview.pay')"
            >
              <i class="pi pi-send"></i>
            </Button>
          </RouterLink>
        </template>
      </Column>
    </DataTable>
  </MainLayout>
</template>

<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import Contract from "arc200js";
import { FilterMatchMode } from "primevue/api";
import Badge from "primevue/badge";
import MainLayout from "../../layouts/Main.vue";
import AccountTopMenu from "../../components/AccountTopMenu.vue";
import { useStore } from "@/store";
import type { AccountNetworkData, PrivateAccount } from "@/types/account";

type AssetType = "Native" | "ASA" | "ARC200";

type AssetListItem = {
  "asset-id": number | "";
  amount: number;
  name: string;
  decimals: number;
  "unit-name": string;
  type: AssetType;
};

type FilterConfig = {
  value: string | null;
  matchMode: string;
};

const store = useStore();
const route = useRoute();

const loading = ref(true);
const assets = ref<AssetListItem[]>([]);

const filters = reactive<Record<string, FilterConfig>>({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  "asset-id": { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  amount: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  type: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
});

const accountAddressParam = computed(() => String(route.params.account ?? ""));

const instance = getCurrentInstance();
const filtersUtil = instance?.appContext.config.globalProperties.$filters;

const account = computed<PrivateAccount | undefined>(() =>
  store.state.wallet.privateAccounts.find(
    (a) => a.addr === accountAddressParam.value
  )
);

const accountData = computed<AccountNetworkData | null>(() => {
  const acc = account.value;
  const env = store.state.config.env;
  if (!acc?.data || !env) {
    return null;
  }
  return acc.data[env] ?? null;
});

const lastActiveAccountAddr = computed(
  () => store.state.wallet.lastActiveAccount
);

const accountInformationAction = (payload: { addr: string }) =>
  store.dispatch("indexer/accountInformation", payload);
const updateAccountAction = (payload: { info: Record<string, unknown> }) =>
  store.dispatch("wallet/updateAccount", payload);
const getAssetAction = (payload: { assetIndex: number }) =>
  store.dispatch("indexer/getAsset", payload);
const prolongAction = () => store.dispatch("wallet/prolong");
const openSuccessAction = (message: string) =>
  store.dispatch("toast/openSuccess", message);
const openErrorAction = (message: string) =>
  store.dispatch("toast/openError", message);
const getAlgodAction = () => store.dispatch("algod/getAlgod");
const getIndexerAction = () => store.dispatch("indexer/getIndexer");
const updateArc200BalanceAction = (payload: {
  addr: string;
  arc200Id: string;
  balance: unknown;
}) => store.dispatch("wallet/updateArc200Balance", payload);

const makeAssets = async () => {
  loading.value = true;
  assets.value = [];
  const data = accountData.value;
  if (!data) {
    loading.value = false;
    return;
  }
  const nativeAmount = Number(data.amount ?? 0);
  if (nativeAmount > 0) {
    assets.value.push({
      "asset-id": "",
      amount: nativeAmount,
      name: store.state.config.tokenSymbol ?? "ALG",
      decimals: 6,
      "unit-name": "",
      type: "Native",
    });
  }
  const asaAssets = Array.isArray(data.assets) ? data.assets : [];
  for (const accountAsset of asaAssets as Array<Record<string, any>>) {
    const assetId = Number(accountAsset["asset-id"] ?? 0);
    if (!assetId) continue;
    const asset = await getAssetAction({ assetIndex: assetId });
    if (asset) {
      assets.value.push({
        "asset-id": assetId,
        amount: Number(accountAsset["amount"] ?? 0),
        name: asset["name"] ?? "",
        decimals: Number(asset["decimals"] ?? 0),
        "unit-name": asset["unit-name"] ?? "",
        type: "ASA",
      });
    }
  }
  const arc200Assets = data.arc200 as
    | Record<
        string,
        {
          arc200id: number | string;
          balance: number | string;
          name: string;
          decimals: number | string;
          symbol: string;
        }
      >
    | undefined;
  if (arc200Assets) {
    for (const accountAsset of Object.values(arc200Assets)) {
      assets.value.push({
        "asset-id": Number(accountAsset.arc200id),
        amount: Number(accountAsset.balance),
        name: accountAsset.name,
        decimals: Number(accountAsset.decimals),
        "unit-name": accountAsset.symbol,
        type: "ARC200",
      });
    }
  }
  loading.value = false;
};

const getAssetSync = (id: number) => {
  return store.state.indexer.assets.find(
    (asset: Record<string, any>) => Number(asset["asset-id"]) === id
  ) as Record<string, any> | undefined;
};

const getAssetName = (id: AssetListItem["asset-id"]) => {
  if (typeof id !== "number") return undefined;
  const asset = getAssetSync(id);
  return asset ? asset["name"] : undefined;
};

const getAssetDecimals = (id: AssetListItem["asset-id"]) => {
  if (typeof id !== "number") return undefined;
  const asset = getAssetSync(id);
  return asset ? Number(asset["decimals"]) : undefined;
};

const isNumericAssetId = (
  asset: AssetListItem
): asset is AssetListItem & { "asset-id": number } =>
  typeof asset["asset-id"] === "number";

const formatCurrencyValue = (
  amount: number,
  name?: string,
  decimals?: number
) => {
  if (filtersUtil?.formatCurrency) {
    return filtersUtil.formatCurrency(amount, name, decimals);
  }
  return name ? `${amount} ${name}` : `${amount}`;
};

const formatAssetAmount = (asset: AssetListItem) => {
  if (isNumericAssetId(asset)) {
    return formatCurrencyValue(
      asset.amount,
      getAssetName(asset["asset-id"]),
      getAssetDecimals(asset["asset-id"])
    );
  }
  return formatCurrencyValue(asset.amount);
};

const reloadArc200AccountBalance = async (data: AssetListItem) => {
  if (data.type !== "ARC200" || !isNumericAssetId(data)) {
    console.error("Not arc200 asset", data);
    return;
  }
  const accountAddr = account.value?.addr;
  if (!accountAddr) return;
  const algodClient = await getAlgodAction();
  const indexerClient = await getIndexerAction();
  const contract = new Contract(data["asset-id"], algodClient, indexerClient);
  const balance = await contract.arc200_balanceOf(accountAddr);
  if (!balance?.success) {
    await openErrorAction("Failed to fetch ARC200 balance");
    return;
  }
  await updateArc200BalanceAction({
    addr: accountAddr,
    arc200Id: String(data["asset-id"]),
    balance: balance.returnValue,
  });
  await makeAssets();
};

const reloadAccount = async () => {
  if (!accountAddressParam.value) return;
  const info = await accountInformationAction({
    addr: accountAddressParam.value,
  });
  if (!info) return;
  await updateAccountAction({ info });
  const data = accountData.value;
  if (data && data.rekeyedTo !== data["auth-addr"]) {
    const rekeyedTo = data["auth-addr"];
    const info2: Record<string, unknown> = {};
    info2.address = data.addr;
    info2.rekeyedTo = rekeyedTo;
    await updateAccountAction({ info: info2 });
    await openSuccessAction(
      `Information about rekeying to address ${rekeyedTo} has been stored`
    );
  }
};

const refresh = async (data: AssetListItem) => {
  if (data.type === "ARC200") {
    await reloadArc200AccountBalance(data);
  } else {
    await reloadAccount();
    await makeAssets();
  }
};

watch(account, async () => {
  await makeAssets();
});

onMounted(async () => {
  await reloadAccount();
  await makeAssets();
  await prolongAction();
});
</script>
