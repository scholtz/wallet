<template>
  <MainLayout>
    <AccountTopMenu />

    <DataTable
      v-if="tableFilters"
      v-model:selection="selection"
      :value="transactions"
      responsive-layout="scroll"
      selection-mode="single"
      :paginator="true"
      :rows="20"
      filterDisplay="menu"
      v-model:filters="tableFilters"
      :loading="loading"
      :globalFilterFields="[
        'txType',
        'roundTime',
        'representative.name',
        'status',
        'sender',
        'paymentTransaction.receiver',
        'assetTransferTransaction.receiver',
        'confirmedRound',
      ]"
    >
      <template #header>
        <div class="flex justify-content-end" v-if="tableFilters['global']">
          <span class="p-input-icon-left">
            <i class="pi pi-search" />
            <InputText
              v-model="tableFilters['global'].value"
              :placeholder="$t('placeholders.keyword_search')"
            />
          </span>
        </div>
      </template>
      <template #empty>
        {{ $t("acc_overview.no_transactions") }}
      </template>
      <Column field="txType" :header="$t('acc_overview.type')" :sortable="true">
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('placeholders.search_by_type')"
          />
        </template>
      </Column>
      <Column
        field="roundTime"
        :header="$t('acc_overview.time')"
        :sortable="true"
      >
        <template #body="slotProps">
          <div v-if="hasSlotField(slotProps)">
            {{ uiFilters.formatDateTime(getSlotFieldValue(slotProps)) }}
          </div>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('placeholders.search_by_date')"
          />
        </template>
      </Column>
      <Column :header="$t('acc_overview.tr_amount')" :sortable="true">
        <template #body="slotProps">
          <div
            v-if="
              slotProps.data['txType'] == 'pay' &&
              'paymentTransaction' in slotProps.data &&
              'amount' in slotProps.data['paymentTransaction']
            "
            class="text-right"
          >
            {{
              uiFilters.formatCurrency(
                slotProps.data["paymentTransaction"]["amount"]
              )
            }}
          </div>
          <div
            v-if="
              slotProps.data['txType'] == 'axfer' &&
              'assetTransferTransaction' in slotProps.data &&
              'amount' in slotProps.data['assetTransferTransaction']
            "
            class="text-right"
          >
            {{
              uiFilters.formatCurrency(
                slotProps.data["assetTransferTransaction"]["amount"],
                getAssetName(
                  slotProps.data["assetTransferTransaction"]["assetId"]
                ),

                getAssetDecimals(asset["assetId"])
              )
            }}
          </div>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="number"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('placeholders.search_by_amount')"
          />
        </template>
      </Column>
      <Column
        field="sender"
        :header="$t('acc_overview.sender')"
        :sortable="true"
        style-class="not-show-at-start"
      >
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('placeholders.search_by_sender')"
          />
        </template>
      </Column>
      <Column
        field="receiver"
        :header="$t('acc_overview.receiver')"
        :sortable="true"
        style-class="not-show-at-start"
      >
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('placeholders.search_by_receiver')"
          />
        </template>
      </Column>
      <Column field="fee" :header="$t('acc_overview.fee')" :sortable="true">
        <template #body="slotProps">
          <div v-if="hasSlotField(slotProps)" class="text-right">
            {{ uiFilters.formatCurrency(getSlotFieldValue(slotProps)) }}
          </div>
        </template>

        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('placeholders.search_by_fee')"
          />
        </template>
      </Column>
      <Column
        field="confirmedRound"
        :header="$t('acc_overview.confirmed_round')"
        :sortable="true"
      >
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="number"
            @input="filterCallback()"
            class="p-column-filter"
            :placeholder="$t('placeholders.search_by_round')"
          />
        </template>
      </Column>
    </DataTable>
  </MainLayout>
</template>

<script lang="ts" setup>
import {
  type ComponentPublicInstance,
  computed,
  getCurrentInstance,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { FilterMatchMode } from "primevue/api";
import MainLayout from "../../layouts/Main.vue";
import AccountTopMenu from "../../components/AccountTopMenu.vue";
import { useStore } from "../../store";
import type { StoredAsset } from "../../store/indexer";
import type { WalletAccount, IAccountData } from "../../store/wallet";
import algosdk from "algosdk";
import {
  TransactionAssetTransfer,
  TransactionPayment,
} from "algosdk/dist/types/client/v2/indexer/models/types";

type GlobalFilters = {
  formatCurrencyBigInt: (
    value?: number | bigint,
    currency?: string,
    minimumFractionDigits?: number,
    multiply?: boolean,
    language?: string | string[]
  ) => string;
  formatCurrency: (
    value?: number | bigint,
    currency?: string,
    minimumFractionDigits?: number,
    multiply?: boolean,
    language?: string | string[]
  ) => string;
  formatDateTime: (
    value?: number,
    separator?: string,
    showSeconds?: boolean,
    locale?: string,
    alwaysShowDate?: boolean
  ) => string;
  formatPercent: (value?: number) => string;
};

type FilterMatch = (typeof FilterMatchMode)[keyof typeof FilterMatchMode];

type FilterValue = string | number | null;

type FilterModel<T extends FilterValue = FilterValue> = {
  value: T;
  matchMode: FilterMatch;
};

type TableFilters = {
  global: FilterModel<string | null>;
  txType: FilterModel<string | null>;
  roundTime: FilterModel<string | null>;
  "representative.name": FilterModel<string | null>;
  sender: FilterModel<string | null>;
  status: FilterModel<string | null>;
  receiver: FilterModel<string | null>;
  fee: FilterModel<string | null>;
  confirmedRound: FilterModel<string | null>;
};

type IndexerTransaction = algosdk.indexerModels.Transaction;

interface TransactionRow {
  id: string;
  sender: string;
  receiver: string;
  roundTime: number;
  txType: string;
  assetTransferTransaction?: TransactionAssetTransfer;
  paymentTransaction?: TransactionPayment;
  fee: bigint;
  confirmedRound: bigint;
  tx: IndexerTransaction;
}

interface AssetSummary {
  assetId: bigint;
  amount?: number | bigint;
  name?: string;
  decimals?: number;
  unitName?: string;
}

type DataTableSlotProps = {
  data?: Record<string, any>;
  column?: {
    props?: {
      field?: string | ((item: any) => string);
    };
  };
};

const instance = getCurrentInstance();
const proxy = instance?.proxy as
  | (ComponentPublicInstance & { $filters?: GlobalFilters })
  | undefined;
if (!proxy?.$filters) {
  throw new Error("Global filters are not available");
}
const uiFilters = proxy.$filters;

const store = useStore();
const router = useRouter();
const route = useRoute();

const transactions = ref<TransactionRow[]>([]);
const selection = ref<TransactionRow | null>(null);
const assets = ref<AssetSummary[]>([]);
const asset = ref<Record<string, any>>({});
const loading = ref(true);
const tableFilters = ref<TableFilters>({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  txType: { value: null, matchMode: FilterMatchMode.CONTAINS },
  roundTime: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  "representative.name": {
    value: null,
    matchMode: FilterMatchMode.STARTS_WITH,
  },
  sender: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  status: { value: null, matchMode: FilterMatchMode.EQUALS },
  receiver: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  fee: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  confirmedRound: { value: null, matchMode: FilterMatchMode.EQUALS },
});

const accountAddress = computed(() => route.params.account as string);

const account = computed<WalletAccount | undefined>(() =>
  store.state.wallet.privateAccounts.find(
    (walletAccount) => walletAccount.addr === accountAddress.value
  )
);

const accountData = computed<IAccountData | undefined>(() => {
  const currentAccount = account.value;
  if (!currentAccount?.data) {
    return undefined;
  }
  return currentAccount.data[store.state.config.env];
});

const hasPositiveAmount = (value?: number | bigint): boolean => {
  if (typeof value === "bigint") {
    return value > 0n;
  }
  if (typeof value === "number") {
    return value > 0;
  }
  return false;
};

const getAssetSync = (id?: bigint | number | string) => {
  if (id === undefined || id === null) {
    return undefined;
  }
  try {
    const normalizedId = BigInt(id);
    return store.state.indexer.assets.find(
      (storedAsset) => BigInt(storedAsset.assetId) === normalizedId
    );
  } catch (error) {
    console.error("getAssetSync", error);
    return undefined;
  }
};

const getAssetName = (id?: bigint | number | string) => getAssetSync(id)?.name;

const getAssetDecimals = (id?: bigint | number | string) =>
  getAssetSync(id)?.decimals ?? 0;

const getSlotFieldValue = (slotProps: DataTableSlotProps) => {
  const field = slotProps?.column?.props?.field;
  if (typeof field !== "string") {
    return undefined;
  }
  return slotProps.data?.[field];
};

const hasSlotField = (slotProps: DataTableSlotProps): boolean => {
  const field = slotProps?.column?.props?.field;
  if (typeof field !== "string") {
    return false;
  }
  const data = slotProps.data ?? {};
  return field in data;
};

const makeAssets = async () => {
  assets.value = [];
  const data = accountData.value;
  if (!data) {
    return;
  }

  if (hasPositiveAmount(data.amount)) {
    assets.value.push({
      assetId: 0n,
      amount: data.amount,
      name: "ALG",
      decimals: 6,
      unitName: "",
    });
  }

  if (data.assets) {
    for (const accountAsset of data.assets) {
      if (!accountAsset?.assetId) {
        continue;
      }
      const assetInfo = (await store.dispatch("indexer/getAsset", {
        assetIndex: accountAsset.assetId,
      })) as StoredAsset | undefined;
      if (assetInfo) {
        assets.value.push({
          assetId: accountAsset.assetId,
          amount: accountAsset.amount,
          name: assetInfo.name,
          decimals: assetInfo.decimals,
          unitName: assetInfo.unitName,
        });
      }
    }
  }
};

const reloadAccount = async () => {
  loading.value = true;
  const addr = accountAddress.value;
  if (!addr) {
    loading.value = false;
    return;
  }

  try {
    const info = await store.dispatch("indexer/accountInformation", {
      addr,
    });
    if (info) {
      await store.dispatch("wallet/updateAccount", { info });
      const data = accountData.value;
      if (data && data.rekeyedTo !== data["auth-addr"]) {
        const rekeyedTo = data["auth-addr"] as string | undefined;
        console.error(
          `New rekey information detected: ${data.rekeyedTo} -> ${rekeyedTo}`
        );
        if (rekeyedTo) {
          const info2: Partial<IAccountData> = {};
          info2.address = data.addr;
          info2.rekeyedTo = rekeyedTo;
          await store.dispatch("wallet/updateAccount", { info: info2 });
          await store.dispatch(
            "toast/openSuccess",
            `Information about rekeying to address ${rekeyedTo} has been stored`
          );
        }
      }
    }

    const searchData = (await store.dispatch("indexer/searchForTransactions", {
      addr,
    })) as algosdk.indexerModels.TransactionsResponse | undefined;
    if (searchData?.transactions) {
      transactions.value = searchData.transactions.map(
        (tx: algosdk.indexerModels.Transaction) =>
          ({
            id: tx.id,
            sender: tx.sender,
            receiver:
              tx.paymentTransaction?.receiver ??
              tx.assetTransferTransaction?.receiver ??
              "",
            roundTime: Number(tx?.roundTime ?? 0),
            txType: tx.txType,
            assetTransferTransaction: tx.assetTransferTransaction,
            paymentTransaction: tx.paymentTransaction,
            fee: BigInt(tx.fee),
            confirmedRound: BigInt(tx?.confirmedRound ?? 0n),
            tx,
          } as TransactionRow)
      );
    }
  } finally {
    loading.value = false;
  }
};

watch(selection, async (value) => {
  if (!value) {
    return;
  }
  await store.dispatch("wallet/setTransaction", { transaction: value.tx });
  if (value.id) {
    await router.push(`/transaction/${value.id}`);
  }
});

watch(account, () => {
  void makeAssets();
});

onMounted(async () => {
  await reloadAccount();
  await makeAssets();
  await store.dispatch("wallet/prolong");
});
</script>
