<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { useStore } from "vuex";
import { onMounted, reactive, watch } from "vue";
import { FilterMatchMode } from "primevue/api";
import DropDown from "primevue/dropdown";
import Button from "primevue/button";
import CAsset from "@/scripts/interface/CAsset";
import base642base64url from "@/scripts/encoding/base642base64url";
import { useRoute, useRouter } from "vue-router";
import formatCurrency from "@/scripts/numbers/formatCurrency";
import * as algokit from "@algorandfoundation/algokit-utils";

import copy from "copy-to-clipboard";
import {
  BiatecTaskManagerClient,
  BiatecCronJobShortHashClient,
  getPoolManagerApp,
  getBoxReferenceApp,
  parseBoxData,
} from "biatec-scheduler";
import algosdk, { AtomicTransactionComposer } from "algosdk";
import axios from "axios";
import { RootState } from "@/store";
import { useI18n } from "vue-i18n";
import { Buffer } from "buffer";
import { StoredAsset } from "@/store/indexer";

type FilterMode = (typeof FilterMatchMode)[keyof typeof FilterMatchMode];

type FilterEntry = {
  value: string | null;
  matchMode: FilterMode;
};

type WalletAccount = {
  addr?: string;
  data?: Record<string, AccountEnvData>;
};

type AccountAssetEntry = {
  amount: number;
  assetId: bigint;
};

type AssetHolding = algosdk.modelsv2.AssetHolding;

type AccountEnvData = {
  amount?: number;
  assets?: AccountAssetEntry[];
  arc200?: Record<string, unknown>;
};

type GlobalStateEntry = {
  key: string;
  value: {
    uint?: number;
    bytes?: string;
  };
};

const readGlobalState = (
  params?: algosdk.modelsv2.ApplicationParams | Record<string, unknown>
): GlobalStateEntry[] => {
  if (!params) return [];
  const paramRecord = params as Record<string, unknown>;
  const raw =
    (paramRecord["global-state"] as GlobalStateEntry[] | undefined) ??
    (paramRecord["globalState" as keyof typeof paramRecord] as
      | GlobalStateEntry[]
      | undefined);
  return Array.isArray(raw) ? raw : [];
};

const normalizeAccountAssets = (
  assets?: AssetHolding[]
): AccountAssetEntry[] => {
  if (!assets) return [];
  return assets.map((asset) => ({
    assetId: BigInt(
      (asset as unknown as AccountAssetEntry).assetId ?? asset.assetId ?? 0n
    ),
    amount: Number(asset.amount ?? 0),
  }));
};

interface EscrowAssetRow {
  assetId: bigint;
  amount: number;
  assetName?: string;
  info: StoredAsset | undefined;
}

interface AppInfo {
  appId: number;
  appAddress: string;
  start: number;
  period: number;
  balanceFee: number;
  fee: number;
}

type ScheduledAction = "" | "tx-deploy" | "tx-configure";

type ScheduledPaymentDetailFilters = {
  global: FilterEntry;
  assetName: FilterEntry;
  amount: FilterEntry;
};

interface ScheduledPaymentDetailState {
  selection: EscrowAssetRow | null;
  payTo: string;
  assetData: CAsset;
  account: string;
  withdrawAmount: number;
  maxAmount: number;
  stepAmount: number;
  appInfo: AppInfo;
  assets: EscrowAssetRow[];
  filters: ScheduledPaymentDetailFilters;
  period: string;
  optionsSchedule: Array<{ value: string; name: string }>;
  start: number;
  txID: string;
  action: ScheduledAction;
  hash: string;
  client: string;
  appId: string;
  fee: number;
  feeAssetId: number;
  feeAssetData: StoredAsset;
  optin: number;
  withdrawAsset: number | string | null;
  amountToDeposit: number;
  script: string;
}

const { t } = useI18n();
const route = useRoute();
const store = useStore<RootState>();
const router = useRouter();
const state = reactive<ScheduledPaymentDetailState>({
  selection: null,
  payTo: "",
  assetData: new CAsset(),
  account: route.params.account as string,
  withdrawAmount: 0,
  maxAmount: 0,
  stepAmount: 1,
  appInfo: {
    appId: 0,
    appAddress: "",
    start: 0,
    period: 0,
    balanceFee: 0,
    fee: 0,
  },
  assets: [],
  filters: {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    assetName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    amount: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  },
  period: "86400",
  optionsSchedule: [
    {
      value: "60",
      name: "Run each minute",
    },
    {
      value: "3600",
      name: "Run each hour",
    },
    {
      value: "86400",
      name: "Run each day",
    },
  ],
  start: Math.round(new Date().getTime() / 1000),
  txID: "",
  action: "",
  hash: "",
  client: "",
  appId: "",
  fee: 1000,
  feeAssetId: 0,
  feeAssetData: {} as StoredAsset,
  optin: 0,
  withdrawAsset: null,
  amountToDeposit: 0,
  script: "",
});

const getAccountData = (): AccountEnvData | undefined => {
  const account = (store.state.wallet.privateAccounts as WalletAccount[]).find(
    (a) => a.addr === state.account
  );
  return account?.data?.[store.state.config.env];
};
const maxAmount = () => {
  if (!state.assetData) return 0;
  if (state.assetData.type == "ARC200" || state.assetData.type == "ASA") {
    const decimals = state.assetData.decimals ?? 0;
    return Number(state.assetData.amount || 0) / 10 ** decimals;
  }
  const accountInfo = getAccountData();
  if (!accountInfo?.amount) {
    return 0;
  }
  let ret = accountInfo.amount / 1_000_000 - 0.1;
  const optedAssets = accountInfo.assets?.length ?? 0;
  if (optedAssets > 0) {
    ret -= optedAssets * 0.1;
  }
  return Math.max(ret, 0);
};

const stepAmount = () => {
  if (!state.assetData.decimals) return 1;
  const ret = Math.pow(10, -1 * state.assetData.decimals);
  return ret;
};
watch(
  () => state.assetData,
  async () => {
    state.maxAmount = maxAmount();
    state.stepAmount = stepAmount();
    await store.dispatch("wallet/prolong");
  },
  { deep: true }
);

const loadTableData = async () => {
  try {
    const algod = (await store.dispatch("algod/getAlgod")) as algosdk.Algodv2;
    const indexer = (await store.dispatch(
      "indexer/getIndexer"
    )) as algosdk.Indexer;
    // var client = new BiatecTaskManagerClient(
    //   {
    //     resolveBy: "id",
    //     id: getPoolManagerApp(store.state.config.env),
    //   },
    //   algod
    // );
    const poolAppId = getPoolManagerApp(store.state.config.env);
    const poolApp = await algod.getApplicationByID(poolAppId).do();
    const poolState = readGlobalState(poolApp.params);
    const fa = poolState.find((kv) => kv.key == "ZmE=")?.value.uint ?? 0;
    state.feeAssetId = fa;
    const feeAsset = (await store.dispatch("indexer/getAsset", {
      assetIndex: fa,
    })) as StoredAsset | undefined;
    if (feeAsset) {
      state.feeAssetData = feeAsset;
    }

    const appId = Number(route.params.appId);
    state.appId = appId.toString();
    const boxApp = await algod
      .getApplicationBoxByName(
        poolAppId,
        getBoxReferenceApp(poolAppId, appId).name
      )
      .do();
    const data = parseBoxData(boxApp.value);

    const app = await algod.getApplicationByID(appId).do();
    const appState = readGlobalState(app.params);
    const s = appState.find((kv) => kv.key == "cw==")?.value.uint ?? 0;
    const p = appState.find((kv) => kv.key == "cA==")?.value.uint ?? 0;
    state.appInfo = {
      appId: appId,
      appAddress: String(algosdk.getApplicationAddress(appId)),
      start: s,
      period: p,
      balanceFee: data.funds,
      fee: data.fee,
    };
    const account = await indexer
      .lookupAccountByID(algosdk.getApplicationAddress(appId))
      .do();

    const assets: EscrowAssetRow[] = [];
    const info = (await store.dispatch("indexer/getAsset", {
      assetIndex: 0,
    })) as StoredAsset | undefined;
    assets.push({
      assetId: 0n,
      amount: Number(account?.account?.amount ?? 0),
      assetName: info?.name ?? "",
      info: info,
    });
    const accountAssets = normalizeAccountAssets(
      account?.account?.assets as AssetHolding[] | undefined
    );
    for (const asset of accountAssets) {
      const assetId = asset.assetId ?? 0n;
      const infoA = (await store.dispatch("indexer/getAsset", {
        assetIndex: assetId,
      })) as StoredAsset | undefined;
      assets.push({
        assetId: assetId,
        amount: Number(asset.amount ?? 0),
        assetName: infoA?.name ?? "",
        info: infoA,
      });
    }
    state.assets = assets;
  } catch (e) {
    console.error(e);
  }
};

onMounted(async () => {
  await store.dispatch("wallet/prolong");
  await loadTableData();
  try {
    const deserialized = JSON.parse(
      localStorage.getItem("currentAction") ?? ""
    );
    if (deserialized.selection) {
      state.selection = deserialized.selection as EscrowAssetRow;
    }
    if (deserialized.payTo) {
      state.payTo = deserialized.payTo;
    }
    if (deserialized.assetData) {
      var newAssetData = new CAsset();
      newAssetData.amount = deserialized.assetData.amount;
      newAssetData.assetId = deserialized.assetData.assetId;
      newAssetData.decimals = deserialized.assetData.decimals;
      newAssetData.label = deserialized.assetData.label;
      newAssetData.name = deserialized.assetData.name;
      newAssetData.type = deserialized.assetData.type;
      newAssetData.unitName = deserialized.assetData.unitName;
      state.assetData = newAssetData;
    }
  } catch (exc: any) {
    console.error(exc.message ?? exc);
  }
});

const optinEscrowToAsset = async () => {
  try {
    const algod = (await store.dispatch("algod/getAlgod")) as algosdk.Algodv2;
    const signer = {
      addr: route.params.account as string,
      signer: async (
        _txnGroup: algosdk.Transaction[],
        _indexesToSign: number[]
      ) => {
        return [];
      },
    };
    var client = new BiatecCronJobShortHashClient(
      {
        resolveBy: "id",
        id: state.appInfo.appId,
      },
      algod
    );
    const atc = new AtomicTransactionComposer();
    await client.assetTransfer(
      {
        assetAmount: 0,
        assetReceiver: state.appInfo.appAddress,
        note: "",
        xferAsset: state.optin,
      },
      {
        sendParams: {
          fee: algokit.microAlgos(2000),
          atc: atc,
        },
        assets: [state.optin],
      }
    );
    const params = await algod.getTransactionParams().do();
    const receiver = state.appInfo.appAddress;
    const payToEscrowMBR = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      amount: 100_000,
      suggestedParams: params,
      receiver: receiver,
      sender: signer.addr.toString(),
    });
    const txs = atc.buildGroup().map((tx) => tx.txn);
    const txs2 = [payToEscrowMBR, txs[0]];
    const grouped = algosdk.assignGroupID(txs2);
    await store.dispatch("signer/returnToSignAll", "ScheduledPayments");
    await store.dispatch("signer/toSignArray", { txs: grouped });
    await router.push("/signAll");
  } catch (e) {
    console.error(e);
  }
};
const depositToFeePool = async () => {
  try {
    const algod = (await store.dispatch("algod/getAlgod")) as algosdk.Algodv2;
    const signer = {
      addr: route.params.account as string,
      signer: async (
        _txnGroup: algosdk.Transaction[],
        _indexesToSign: number[]
      ) => {
        return [];
      },
    };
    const poolAppId = getPoolManagerApp(store.state.config.env);
    var client = new BiatecTaskManagerClient(
      {
        resolveBy: "id",
        id: poolAppId,
        sender: signer as never,
      },
      algod
    );

    const params = await algod.getTransactionParams().do();
    const feeDecimals = state.feeAssetData.decimals ?? 0;
    const depositTx = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
      {
        amount: state.amountToDeposit * 10 ** feeDecimals,
        assetIndex: state.feeAssetId,
        sender: signer.addr.toString(),
        suggestedParams: params,
        receiver: algosdk.getApplicationAddress(poolAppId),
      }
    );
    const box = getBoxReferenceApp(poolAppId, state.appInfo.appId);
    const atc = new AtomicTransactionComposer();
    await client.fundTask(
      {
        deposit: depositTx,
        taskAppId: state.appInfo.appId,
      },
      {
        sendParams: {
          fee: algokit.microAlgos(1000),
          atc: atc,
        },
        boxes: [box],
      }
    );
    const grouped = atc.buildGroup().map((tx) => tx.txn);
    await store.dispatch("signer/returnToSignAll", "ScheduledPayments");
    await store.dispatch("signer/toSignArray", { txs: grouped });
    await router.push("/signAll");
  } catch (e) {
    console.error(e);
  }
};

const withdrawFromEscrow = async () => {
  try {
    const algod = (await store.dispatch("algod/getAlgod")) as algosdk.Algodv2;
    const signer = {
      addr: route.params.account as string,
      signer: async (
        _txnGroup: algosdk.Transaction[],
        _indexesToSign: number[]
      ) => {
        return [];
      },
    };
    var client = new BiatecCronJobShortHashClient(
      {
        resolveBy: "id",
        id: state.appInfo.appId,
        sender: signer as never,
      },
      algod
    );
    const atc = new AtomicTransactionComposer();
    const withdrawAssetId = Number(state.withdrawAsset);
    if (withdrawAssetId > 0) {
      const asset = (await store.dispatch("indexer/getAsset", {
        assetIndex: withdrawAssetId,
      })) as StoredAsset | undefined;
      await client.assetTransfer(
        {
          assetAmount:
            Number(state.withdrawAmount) * 10 ** (asset?.decimals ?? 6),
          assetReceiver: signer.addr,
          note: "",
          xferAsset: withdrawAssetId,
        },
        {
          sendParams: {
            fee: algokit.microAlgos(2000),
            atc: atc,
          },
          assets: [withdrawAssetId],
        }
      );
    } else {
      await client.payment(
        {
          amount: Number(state.withdrawAmount) * 10 ** 6,
          receiver: signer.addr,
          note: "",
        },
        {
          sendParams: {
            fee: algokit.microAlgos(2000),
            atc: atc,
          },
        }
      );
    }
    const grouped = atc.buildGroup().map((tx) => tx.txn);
    await store.dispatch("signer/returnTo", "ScheduledPayments");
    await store.dispatch("signer/toSign", { txx: grouped[0] });
    const encoded = base642base64url(
      Buffer.from(algosdk.encodeUnsignedTransaction(grouped[0])).toString(
        "base64"
      )
    );

    state.txID = (grouped[0] as algosdk.Transaction).txID();
    router.push(`/sign/${route.params.account}/${encoded}`);
  } catch (e) {
    console.error(e);
  }
};

const deposit = (data: any) => {
  router.push({
    name: "PayToAccountAndAsset",
    params: {
      account: route.params.account,
      toAccountDirect: state.appInfo.appAddress,
      asset: data.assetId,
    },
  });
};

async function copyToClipboard(text: string | number) {
  if (copy(String(text))) {
    await store.dispatch("toast/openSuccess", `${text} copied to clipboard`);
  }
}
const toSwap = () => {
  router.push({
    name: "SwapWithTo",
    params: {
      account: route.params.account,
      toAsset: state.feeAssetId,
    },
  });
};

const loadScript = async () => {
  try {
    const algod = (await store.dispatch("algod/getAlgod")) as algosdk.Algodv2;
    const app = await algod.getApplicationByID(state.appInfo.appId).do();

    const globalState = readGlobalState(app.params);
    const fileBytes = globalState.find((kv) => kv.key == "aWQ=")?.value.bytes;
    if (!fileBytes) {
      throw new Error("Script identifier not found in global state");
    }
    const id = Buffer.from(fileBytes, "base64").subarray(2).toString("utf-8");
    const inputRequest = await axios.get(
      `https://api-scheduler.biatec.io/v1/file/${id}/input.yaml`
    );
    state.script = inputRequest.data;
  } catch (e) {
    console.error(e);
  }
};
</script>
<template>
  <MainLayout>
    <h1>{{ t("scheduled_payments.title") }}</h1>
    <Card>
      <template #content>
        <p>
          {{ t("scheduled_payments.description_detail") }}
        </p>
        <h2>{{ t("scheduled_payments.details_title") }}</h2>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("scheduled_payments.app_id") }}
          </label>
          <div class="col-12 md:col-10">
            {{ state.appInfo.appId }}
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("scheduled_payments.appAddress") }}
          </label>
          <div class="col-12 md:col-10">
            {{ state.appInfo.appAddress }}
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("scheduled_payments.period") }}
          </label>
          <div class="col-12 md:col-10">
            {{ state.appInfo.period }} {{ t("scheduled_payments.seconds") }}
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("scheduled_payments.start") }}
          </label>
          <div class="col-12 md:col-10">
            {{ new Date(state.appInfo.start * 1000) }}
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("scheduled_payments.feeBalance") }}
          </label>
          <div class="col-12 md:col-10">
            {{
              formatCurrency(
                state.appInfo.balanceFee,
                state.feeAssetData.unitName ?? state.feeAssetData.name,
                state.feeAssetData.decimals ?? 0
              )
            }}
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("scheduled_payments.execution_fee") }}
          </label>
          <div class="col-12 md:col-10">
            {{
              formatCurrency(
                state.appInfo.fee,
                state.feeAssetData.unitName ?? state.feeAssetData.name,
                state.feeAssetData.decimals ?? 0
              )
            }}
          </div>
        </div>

        <h2>{{ t("scheduled_payments.deposit_fee_title") }}</h2>

        <div class="field grid">
          <label for="amountToDeposit" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("scheduled_payments.fee_asset_id") }}
          </label>
          <div class="col-12 md:col-10">
            <Button
              size="small"
              link
              @click="copyToClipboard(state.feeAssetId)"
            >
              {{ state.feeAssetId }}
            </Button>
            <Button severity="secondary" size="small" @click="toSwap">
              {{ t("scheduled_payments.get_more") }}
            </Button>
          </div>
        </div>
        <div class="field grid">
          <label for="amountToDeposit" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("scheduled_payments.amount_to_deposit") }}
          </label>
          <div class="col-12 md:col-10">
            <InputNumber
              itemId="amountToDeposit"
              v-model="state.amountToDeposit"
              :min="0"
              :step="0.000001"
              :maxFractionDigits="6"
              class="w-full"
            />
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"> </label>
          <div class="col-12 md:col-10">
            <Button severity="primary" @click="depositToFeePool">
              {{ t("scheduled_payments.deposit") }}
            </Button>
          </div>
        </div>

        <h2>{{ t("scheduled_payments.list_of_assets") }}</h2>
        <DataTable
          v-model:selection="state.selection"
          :value="state.assets"
          responsive-layout="scroll"
          selection-mode="single"
          :paginator="true"
          :rows="20"
          v-model:filters="state.filters"
          filterDisplay="menu"
          :globalFilterFields="['assetId', 'assetName']"
        >
          <template #header>
            <div class="grid" v-if="state.filters['global']">
              <div class="col">
                <span class="p-input-icon-left">
                  <i class="pi pi-search" />
                  <InputText
                    v-model="state.filters['global'].value"
                    :placeholder="t('placeholders.keyword_search')"
                  />
                </span>
              </div>
            </div>
          </template>
          <template #empty>
            {{ t("scheduled_payments.assets_loading") }}
          </template>
          <Column
            field="assetName"
            :header="t('scheduled_payments.asset_id')"
            :sortable="true"
          />
          <Column :header="t('scheduled_payments.asset_id')" :sortable="true">
            <template #body="slotProps">
              {{ slotProps.data["assetId"] }}
            </template>
          </Column>
          <Column :header="t('scheduled_payments.asset_name')" :sortable="true">
            <template #body="slotProps">
              {{ slotProps.data.info.name }}
            </template>
          </Column>
          <Column
            field="amount"
            :header="t('scheduled_payments.asset_amount')"
            :sortable="true"
          >
            <template #body="slotProps">
              <span v-if="slotProps.data.amount && slotProps.data.info">
                {{
                  formatCurrency(
                    slotProps.data.amount,
                    slotProps.data.info["unit-name"] ??
                      slotProps.data.info.name,
                    slotProps.data.info.decimals
                  )
                }}
              </span>
            </template>
          </Column>
          <Column :header="t('scheduled_payments.actions')" :sortable="true">
            <template #body="slotProps">
              <Button @click="deposit(slotProps.data)">{{
                t("scheduled_payments.deposit")
              }}</Button>
            </template>
          </Column>
        </DataTable>
        <h2>{{ t("scheduled_payments.optin_title") }}</h2>

        <div class="field grid">
          <label for="optin" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("scheduled_payments.optin_to_asset") }}
          </label>
          <div class="col-12 md:col-10">
            <InputGroup>
              <InputNumber
                itemId="optin"
                v-model="state.optin"
                :min="0"
                :step="1"
                class="w-full"
              />
              <Button
                severity="secondary"
                class="col-2"
                @click="optinEscrowToAsset"
              >
                {{ t("scheduled_payments.optin_click") }}
              </Button>
            </InputGroup>
          </div>
        </div>
        <h2>{{ t("scheduled_payments.withdraw_asset_title") }}</h2>
        <div class="field grid">
          <label for="withdrawAsset" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("scheduled_payments.withdraw_asset") }}
          </label>
          <div class="col-12 md:col-10">
            <DropDown
              inputId="withdrawAsset"
              :options="state.assets"
              v-model="state.withdrawAsset"
              optionLabel="assetName"
              optionValue="assetId"
              class="w-full"
            ></DropDown>
          </div>
        </div>
        <div class="field grid">
          <label for="withdrawAmount" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("scheduled_payments.withdraw_amount") }}
          </label>
          <div class="col-12 md:col-10">
            <InputGroup>
              <InputNumber
                itemId="withdrawAmount"
                v-model="state.withdrawAmount"
                :min="0"
                :step="0.000001"
                :maxFractionDigits="6"
                class="w-full"
              />
            </InputGroup>
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"> </label>
          <div class="col-12 md:col-10">
            <Button severity="secondary" @click="withdrawFromEscrow">
              {{ t("scheduled_payments.withdraw_click") }}
            </Button>
          </div>
        </div>
        <h2>{{ t("scheduled_payments.load_script_title") }}</h2>
        <div class="field grid">
          <Button severity="secondary" @click="loadScript">{{
            t("scheduled_payments.load_click")
          }}</Button>
        </div>
        <div class="field grid" v-if="state.script">
          <Textarea
            id="script"
            v-model="state.script"
            class="w-full"
            rows="20"
          />
        </div>
      </template>
    </Card>
  </MainLayout>
</template>
