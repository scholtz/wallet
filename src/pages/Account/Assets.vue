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
      :globalFilterFields="['name', 'assetId', 'amount', 'type']"
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
        field="assetId"
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
            :to="`/accounts/pay/${lastActiveAccountAddr}/${slotProps.data['assetId']}`"
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
import { computed, getCurrentInstance, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { FilterMatchMode } from "primevue/api";
import Badge from "primevue/badge";
import MainLayout from "../../layouts/Main.vue";
import AccountTopMenu from "../../components/AccountTopMenu.vue";
import { useStore } from "@/store";
import type { AccountNetworkData, PrivateAccount } from "@/types/account";
import { StoredAsset } from "@/store/indexer";
import { getArc200Client } from "arc200-client";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import algosdk from "algosdk";

type AssetType = "Native" | "ASA" | "ARC200";

type AssetListItem = {
  assetId: bigint;
  amount: bigint;
  name: string;
  decimals: number;
  unitName: string;
  type: AssetType;
};

type FilterConfig = {
  value: string | null;
  matchMode: string;
};

type AssetsFilters = {
  global: FilterConfig;
  name: FilterConfig;
  assetId: FilterConfig;
  amount: FilterConfig;
  type: FilterConfig;
};

const store = useStore();
const route = useRoute();

const loading = ref(true);
const assets = ref<AssetListItem[]>([]);

const filters = ref<AssetsFilters>({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  assetId: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
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
const getAssetAction = (payload: {
  assetIndex: bigint;
}): Promise<StoredAsset | undefined> =>
  store.dispatch("indexer/getAsset", payload);
const prolongAction = () => store.dispatch("wallet/prolong");
const openSuccessAction = (message: string) =>
  store.dispatch("toast/openSuccess", message);
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
  const nativeAmount = BigInt(data.amount ?? 0);
  if (nativeAmount > 0) {
    assets.value.push({
      assetId: BigInt(0),
      amount: nativeAmount,
      name: store.state.config.tokenSymbol ?? "ALG",
      decimals: 6,
      unitName: "",
      type: "Native",
    });
  }
  const asaAssets = Array.isArray(data.assets) ? data.assets : [];
  for (const accountAsset of asaAssets) {
    const assetId = BigInt(accountAsset.assetId ?? 0n);
    if (!assetId) continue;
    const asset = await getAssetAction({ assetIndex: assetId });
    if (asset) {
      assets.value.push({
        assetId: assetId,
        amount: BigInt(accountAsset.amount ?? 0n),
        name: asset.name ?? "",
        decimals: Number(asset.decimals ?? 0),
        unitName: asset.unitName ?? "",
        type: "ASA",
      });
    }
  }
  if (data.arc200) {
    for (const accountAsset of Object.values(data.arc200)) {
      assets.value.push({
        assetId: BigInt(accountAsset.arc200id),
        amount: BigInt(accountAsset.balance),
        name: accountAsset.name,
        decimals: Number(accountAsset.decimals),
        unitName: accountAsset.symbol,
        type: "ARC200",
      });
    }
  }
  loading.value = false;
};

const isNumericAssetId = (
  asset: AssetListItem
): asset is AssetListItem & { assetId: bigint } =>
  typeof asset.assetId === "bigint";

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

const formatAssetAmount = (asset: AssetListItem) => {
  return formatCurrencyValue(asset.amount, asset.name, asset.decimals);
};

const reloadArc200AccountBalance = async (data: AssetListItem) => {
  try {
    if (data.type !== "ARC200" || !isNumericAssetId(data)) {
      console.error("Not arc200 asset", data);
      return;
    }
    const accountAddr = account.value?.addr;
    if (!accountAddr) return;
    const algodClient = await getAlgodAction();
    const indexerClient = await getIndexerAction();

    var algoClient = AlgorandClient.fromClients({
      algod: algodClient,
      indexer: indexerClient,
    });

    const dummyAddress =
      "TESTNTTTJDHIF5PJZUBTTDYYSKLCLM6KXCTWIOOTZJX5HO7263DPPMM2SU";
    const dummyTransactionSigner = async (
      txnGroup: algosdk.Transaction[],
      indexesToSign: number[]
    ): Promise<Uint8Array[]> => {
      console.log("transactionSigner", txnGroup, indexesToSign);
      return [] as Uint8Array[];
    };
    const client = getArc200Client({
      algorand: algoClient,
      appId: BigInt(data.assetId),
      defaultSender: dummyAddress,
      defaultSigner: dummyTransactionSigner,
      appName: "arc200",
      approvalSourceMap: undefined,
      clearSourceMap: undefined,
    });

    const balance = await client.arc200BalanceOf({
      args: { owner: accountAddr },
    });

    await updateArc200BalanceAction({
      addr: accountAddr,
      arc200Id: String(data.assetId),
      balance: balance,
    });
    await makeAssets();
  } catch (e: any) {
    console.error("Failed to reload ARC200 balance", e);
  }
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
