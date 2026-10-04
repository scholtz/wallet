<template>
  <MainLayout>
    <AccountTopMenu />

    <DataTable
      v-if="filters"
      :value="visibleAssets"
      responsive-layout="scroll"
      :paginator="true"
      :rows="20"
      :loading="loading"
      v-model:filters="filters"
      filterDisplay="menu"
      :globalFilterFields="['name', 'assetId', 'amount', 'type']"
      sortField="usdValue"
      :sortOrder="-1"
    >
      <template #header>
        <div
          class="flex justify-content-between align-items-center flex-wrap gap-2"
          v-if="filters['global']"
        >
          <div class="flex align-items-center gap-2">
            <Checkbox
              v-model="onlyWithBalance"
              inputId="only-with-balance"
              binary
            />
            <label for="only-with-balance">
              {{ $t("acc_overview_assets.only_with_balance") }}
            </label>
          </div>
          <IconField>
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="filters['global'].value"
              :placeholder="$t('global.keyword_search')"
            />
          </IconField>
        </div>
      </template>
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox" aria-hidden="true" />
          <span>{{ $t("acc_overview.no_assets") }}</span>
        </div>
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
      <Column
        field="usdValue"
        :header="$t('acc_overview_assets.usd_value')"
        :sortable="true"
      >
        <template #body="slotProps">
          <div class="text-right">
            {{ formatUsdValue(slotProps.data.usdValue) }}
          </div>
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
          <Button
            v-if="slotProps.data.type === 'ASA' && account"
            class="m-1"
            size="small"
            severity="danger"
            :title="$t('acc_overview_assets.opt_out')"
            @click="askOptOut(slotProps.data)"
          >
            <i class="pi pi-times-circle"></i>
          </Button>
        </template>
      </Column>
    </DataTable>
    <Dialog
      v-model:visible="optOutDialogVisible"
      :header="$t('acc_overview_assets.opt_out')"
      :modal="true"
    >
      <template v-if="optOutTarget">
        <p>
          {{ $t("acc_overview_assets.opt_out_confirm") }}
          <b>{{ optOutTarget.name }} ({{ optOutTarget.assetId }})</b>
        </p>
        <p v-if="optOutTarget.amount > 0n" class="font-bold">
          {{
            $t("acc_overview_assets.opt_out_balance_warning", {
              amount: formatAssetAmount(optOutTarget),
            })
          }}
        </p>
        <p v-if="optOutCloseTo">
          {{ $t("acc_overview_assets.opt_out_close_to") }}
          <code class="break-all">{{ optOutCloseTo }}</code>
        </p>
      </template>
      <template #footer>
        <Button
          severity="secondary"
          size="small"
          :disabled="optOutProcessing"
          @click="optOutDialogVisible = false"
        >
          {{ $t("global.cancel") }}
        </Button>
        <Button
          severity="danger"
          size="small"
          :loading="optOutProcessing"
          @click="confirmOptOut"
        >
          {{ $t("acc_overview_assets.opt_out_confirm_button") }}
        </Button>
      </template>
    </Dialog>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { FilterMatchMode } from "@primevue/core/api";
import Badge from "primevue/badge";
import MainLayout from "../../layouts/Main.vue";
import AccountTopMenu from "../../components/AccountTopMenu.vue";
import { useStore } from "@/store";
import type { AccountNetworkData, PrivateAccount } from "@/types/account";
import { StoredAsset } from "@/store/indexer";
import { getArc200Client } from "arc200-client";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { getAssetUsdPrices } from "@/scripts/biatecScan";
import { resolveOptOutCloseTo } from "@/scripts/assets/optOut";
import type { OptOutResult } from "@/scripts/assets/optOut";
import { filterAssetsWithBalance } from "@/scripts/assets/filterAssetsWithBalance";

type AssetType = "Native" | "ASA" | "ARC200";

type AssetListItem = {
  assetId: bigint;
  amount: bigint;
  name: string;
  decimals: number;
  unitName: string;
  type: AssetType;
  usdValue?: number;
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
const { t } = useI18n();
const route = useRoute();

const loading = ref(true);
const assets = ref<AssetListItem[]>([]);
const onlyWithBalance = ref(true);
const visibleAssets = computed(() =>
  filterAssetsWithBalance(assets.value, onlyWithBalance.value)
);

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
const getAlgodAction = () => store.dispatch("algod/getAlgod");
const getIndexerAction = () => store.dispatch("indexer/getIndexer");
const updateArc200BalanceAction = (payload: {
  addr: string;
  arc200Id: string;
  balance: bigint | number | string;
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

const loadPrices = async () => {
  const env = store.state.config.env;
  if (!env || assets.value.length === 0) return;
  try {
    const prices = await getAssetUsdPrices(
      env,
      assets.value.map((a) => a.assetId)
    );
    for (const asset of assets.value) {
      const price = prices.get(asset.assetId);
      if (price === undefined) continue;
      const decimalAmount = Number(asset.amount) / 10 ** asset.decimals;
      asset.usdValue = decimalAmount * price;
    }
  } catch (e: unknown) {
    console.error("Failed to load asset USD prices", e);
  }
};

const usdFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

const formatUsdValue = (value?: number) =>
  value === undefined ? "" : usdFormatter.format(value);

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

    const algoClient = AlgorandClient.fromClients({
      algod: algodClient,
      indexer: indexerClient,
    });

    const dummyAddress =
      "TESTNTTTJDHIF5PJZUBTTDYYSKLCLM6KXCTWIOOTZJX5HO7263DPPMM2SU";
    const dummyTransactionSigner = async (): Promise<Uint8Array[]> => {
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
    await loadPrices();
  } catch (e: unknown) {
    console.error("Failed to reload ARC200 balance", e);
  }
};

const optOutDialogVisible = ref(false);
const optOutProcessing = ref(false);
const optOutTarget = ref<AssetListItem | null>(null);

const optOutCloseTo = ref<string | undefined>(undefined);

const askOptOut = async (data: AssetListItem) => {
  const addr = account.value?.addr;
  if (!addr || data.type !== "ASA") return;
  try {
    // AW-2026-054: show the address the remaining balance will be sent to before the
    // user confirms; the node's answer is re-checked against it at send time.
    const creator = (await store.dispatch("algod/getAssetCreator", {
      assetId: data.assetId,
    })) as string | undefined;
    const closeTo = resolveOptOutCloseTo(addr, creator);
    if (!closeTo) {
      await store.dispatch(
        "toast/openError",
        t("acc_overview_assets.opt_out_creator")
      );
      return;
    }
    optOutCloseTo.value = closeTo;
  } catch (error) {
    await store.dispatch(
      "toast/openError",
      error instanceof Error ? error.message : String(error)
    );
    return;
  }
  optOutTarget.value = data;
  optOutDialogVisible.value = true;
};

const confirmOptOut = async () => {
  const target = optOutTarget.value;
  const addr = account.value?.addr;
  if (!target || !addr || target.type !== "ASA") return;
  optOutProcessing.value = true;
  try {
    const result = (await store.dispatch("algod/optOutAsset", {
      addr,
      assetId: target.assetId,
      expectedCloseTo: optOutCloseTo.value,
    })) as OptOutResult;
    if (result.status === "creator") {
      await store.dispatch(
        "toast/openError",
        t("acc_overview_assets.opt_out_creator")
      );
      return;
    }
    if (result.status !== "sent") return;
    const confirmed = await store.dispatch("algod/waitForConfirmation", {
      txId: result.txId,
      timeout: 4,
    });
    if (!confirmed) {
      await store.dispatch(
        "toast/openError",
        t("acc_overview_assets.opt_out_failed")
      );
      return;
    }
    await store.dispatch(
      "toast/openSuccess",
      t("acc_overview_assets.opt_out_success")
    );
    optOutDialogVisible.value = false;
    await reloadAccount();
    await makeAssets();
    await loadPrices();
  } finally {
    optOutProcessing.value = false;
  }
};

const reloadAccount = async () => {
  if (!accountAddressParam.value) return;
  const info = await accountInformationAction({
    addr: accountAddressParam.value,
  });
  if (!info) return;
  await updateAccountAction({ info });
  await store.dispatch("wallet/syncAccountSigner", {
    addr: accountAddressParam.value,
  });
};

const refresh = async (data: AssetListItem) => {
  if (data.type === "ARC200") {
    await reloadArc200AccountBalance(data);
  } else {
    await reloadAccount();
    await makeAssets();
    await loadPrices();
  }
};

watch(account, async () => {
  await makeAssets();
  await loadPrices();
});

onMounted(async () => {
  await reloadAccount();
  await makeAssets();
  await loadPrices();
  await prolongAction();
});
</script>
