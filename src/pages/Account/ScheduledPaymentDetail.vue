<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { useStore } from "vuex";
import { onMounted, reactive, watch } from "vue";
import { FilterMatchMode } from "primevue/api";
import SelectAccount from "../../components/SelectAccount.vue";
import SelectAsset from "../../components/SelectAsset.vue";
import DropDown from "primevue/dropdown";
import Button from "primevue/button";
import CAsset from "@/scripts/interface/CAsset";
import base642base64url from "@/scripts/encoding/base642base64url";
import { useRoute, useRouter } from "vue-router";
import AlgorandAddress from "@/components/AlgorandAddress.vue";
import formatCurrency from "@/scripts/numbers/formatCurrency";
import * as algokit from "@algorandfoundation/algokit-utils";

import copy from "copy-to-clipboard";
import YAML from "yaml";
import {
  BiatecTaskManagerClient,
  BiatecCronJobShortHashClient,
  getPoolManagerApp,
  getBoxReferenceUser,
  getBoxReferenceApp,
  parseBoxData,
} from "biatec-scheduler";
import algosdk, { AtomicTransactionComposer } from "algosdk";
import axios from "axios";

const route = useRoute();
const store = useStore();
const router = useRouter();
const state = reactive({
  selection: "",
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
  feeAssetData: new CAsset(),
  optin: 0,
  withdrawAsset: "",
  amountToDeposit: 0,
  script: "",
});

const getAccountData = () => {
  const account = store.state.wallet.privateAccounts.find(
    (a: any) => a.addr == state.account
  );
  if (!account) return false;
  if (!account.data) return false;
  return account.data[store.state.config.env];
};
const maxAmount = () => {
  const accountData = getAccountData();
  if (!state.assetData) return 0;
  if (state.assetData.type == "ARC200") {
    if (!state.assetData) return 0;
    return state.assetData.amount / 10 ** state.assetData.decimals;
  } else if (state.assetData.type == "ASA") {
    if (!state.assetData) return 0;
    return state.assetData.amount / 10 ** state.assetData.decimals;
  } else {
    let ret = accountData.amount / 1000000 - 0.1;
    if (accountData["assets"] && accountData["assets"].length > 0)
      ret = ret - accountData["assets"].length * 0.1;
    return ret;
  }
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
    const fa = poolApp.params["global-state"].find((kv) => kv.key == "ZmE=")
      .value.uint;
    state.feeAssetId = fa;
    state.feeAssetData = await store.dispatch("indexer/getAsset", {
      assetIndex: fa,
    });

    const addr = route.params.account as string;
    const decodedAddr = algosdk.decodeAddress(addr);
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
    const s = app.params["global-state"].find((kv) => kv.key == "cw==").value
      .uint;
    const p = app.params["global-state"].find((kv) => kv.key == "cA==").value
      .uint;
    state.appInfo = {
      appId: appId,
      appAddress: algosdk.getApplicationAddress(appId),
      start: s,
      period: p,
      balanceFee: data.funds,
      fee: data.fee,
    };
    const account = await indexer
      .lookupAccountByID(algosdk.getApplicationAddress(appId))
      .do();

    const assets = [];
    let info = await store.dispatch("indexer/getAsset", { assetIndex: 0 });
    assets.push({
      "asset-id": 0,
      amount: account.account.amount,
      assetName: info.name,
      info: info,
    });
    if (account.account.assets) {
      for (const asset of account.account.assets) {
        const infoA = await store.dispatch("indexer/getAsset", {
          assetIndex: asset["asset-id"],
        });
        assets.push({
          "asset-id": asset["asset-id"],
          amount: asset.amount,
          assetName: infoA.name,
          info: infoA,
        });
      }
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
      state.selection = deserialized.selection;
    }
    if (deserialized.payTo) {
      state.payTo = deserialized.payTo;
    }
    if (deserialized.assetData) {
      var newAssetData = new CAsset();
      newAssetData.amount = deserialized.assetData.amount;
      newAssetData["asset-id"] = deserialized.assetData["asset-id"];
      newAssetData.decimals = deserialized.assetData.decimals;
      newAssetData.label = deserialized.assetData.label;
      newAssetData.name = deserialized.assetData.name;
      newAssetData.type = deserialized.assetData.type;
      newAssetData["unit-name"] = deserialized.assetData["unit-name"];
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
      // eslint-disable-next-line no-unused-vars
      signer: async (txnGroup: Transaction[], indexesToSign: number[]) => {
        return [];
      },
    };
    var client = new BiatecCronJobShortHashClient(
      {
        resolveBy: "id",
        id: state.appInfo.appId,
        sender: signer,
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
    const payToEscrowMBR = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      amount: 100_000,
      from: signer.addr,
      suggestedParams: params,
      to: state.appInfo.appAddress,
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
      // eslint-disable-next-line no-unused-vars
      signer: async (txnGroup: Transaction[], indexesToSign: number[]) => {
        return [];
      },
    };
    const poolAppId = getPoolManagerApp(store.state.config.env);
    var client = new BiatecTaskManagerClient(
      {
        resolveBy: "id",
        id: poolAppId,
        sender: signer,
      },
      algod
    );

    const params = await algod.getTransactionParams().do();
    const depositTx = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
      {
        amount: state.amountToDeposit * 10 ** state.feeAssetData.decimals,
        assetIndex: state.feeAssetId,
        from: signer.addr,
        suggestedParams: params,
        to: algosdk.getApplicationAddress(poolAppId),
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
      // eslint-disable-next-line no-unused-vars
      signer: async (txnGroup: Transaction[], indexesToSign: number[]) => {
        return [];
      },
    };
    var client = new BiatecCronJobShortHashClient(
      {
        resolveBy: "id",
        id: state.appInfo.appId,
        sender: signer,
      },
      algod
    );
    const atc = new AtomicTransactionComposer();
    if (Number(state.withdrawAsset) > 0) {
      const asset = await store.dispatch("indexer/getAsset", {
        assetIndex: state.withdrawAsset,
      });
      await client.assetTransfer(
        {
          assetAmount: Number(state.withdrawAmount) * 10 ** asset.decimals,
          assetReceiver: signer.addr,
          note: "",
          xferAsset: Number(state.withdrawAsset),
        },
        {
          sendParams: {
            fee: algokit.microAlgos(2000),
            atc: atc,
          },
          assets: [Number(state.withdrawAsset)],
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
    const params = await algod.getTransactionParams().do();

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
      asset: data["asset-id"],
    },
  });
};

async function copyToClipboard(text) {
  if (copy(text)) {
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

    const id = Buffer.from(
      app.params["global-state"].find((kv) => kv.key == "aWQ=").value.bytes,
      "base64"
    )
      .subarray(2)
      .toString("utf-8");
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
    <h1>{{ $t("scheduled_payments.title") }}</h1>
    <Card>
      <template #content>
        <p>
          {{ $t("scheduled_payments.description_detail") }}
        </p>
        <h2>{{ $t("scheduled_payments.details_title") }}</h2>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("scheduled_payments.app_id") }}
          </label>
          <div class="col-12 md:col-10">
            {{ state.appInfo.appId }}
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("scheduled_payments.appAddress") }}
          </label>
          <div class="col-12 md:col-10">
            {{ state.appInfo.appAddress }}
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("scheduled_payments.period") }}
          </label>
          <div class="col-12 md:col-10">
            {{ state.appInfo.period }} {{ $t("scheduled_payments.seconds") }}
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("scheduled_payments.start") }}
          </label>
          <div class="col-12 md:col-10">
            {{ new Date(state.appInfo.start * 1000) }}
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("scheduled_payments.feeBalance") }}
          </label>
          <div class="col-12 md:col-10">
            {{
              formatCurrency(
                state.appInfo.balanceFee,
                state.feeAssetData["unit-name"] ?? state.feeAssetData.name,
                state.feeAssetData.decimals
              )
            }}
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("scheduled_payments.execution_fee") }}
          </label>
          <div class="col-12 md:col-10">
            {{
              formatCurrency(
                state.appInfo.fee,
                state.feeAssetData["unit-name"] ?? state.feeAssetData.name,
                state.feeAssetData.decimals
              )
            }}
          </div>
        </div>

        <h2>{{ $t("scheduled_payments.deposit_fee_title") }}</h2>

        <div class="field grid">
          <label for="amountToDeposit" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("scheduled_payments.fee_asset_id") }}
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
              {{ $t("scheduled_payments.get_more") }}
            </Button>
          </div>
        </div>
        <div class="field grid">
          <label for="amountToDeposit" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("scheduled_payments.amount_to_deposit") }}
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
              {{ $t("scheduled_payments.deposit") }}
            </Button>
          </div>
        </div>

        <h2>{{ $t("scheduled_payments.list_of_assets") }}</h2>
        <DataTable
          v-model:selection="state.selection"
          :value="state.assets"
          responsive-layout="scroll"
          selection-mode="single"
          :paginator="true"
          :rows="20"
          v-model:filters="state.filters"
          filterDisplay="menu"
          :globalFilterFields="['asset-id', 'assetName']"
        >
          <template #header>
            <div class="grid" v-if="state.filters['global']">
              <div class="col">
                <span class="p-input-icon-left">
                  <i class="pi pi-search" />
                  <InputText
                    v-model="state.filters['global'].value"
                    placeholder="Keyword Search"
                  />
                </span>
              </div>
            </div>
          </template>
          <template #empty>
            {{ $t("scheduled_payments.assets_loading") }}
          </template>
          <Column
            field="assetName"
            :header="$t('scheduled_payments.asset_id')"
            :sortable="true"
          />
          <Column :header="$t('scheduled_payments.asset_id')" :sortable="true">
            <template #body="slotProps">
              {{ slotProps.data["asset-id"] }}
            </template>
          </Column>
          <Column
            :header="$t('scheduled_payments.asset_name')"
            :sortable="true"
          >
            <template #body="slotProps">
              {{ slotProps.data.info.name }}
            </template>
          </Column>
          <Column
            field="amount"
            :header="$t('scheduled_payments.asset_amount')"
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
          <Column :header="$t('scheduled_payments.actions')" :sortable="true">
            <template #body="slotProps">
              <Button @click="deposit(slotProps.data)">{{
                $t("scheduled_payments.deposit")
              }}</Button>
            </template>
          </Column>
        </DataTable>
        <h2>{{ $t("scheduled_payments.optin_title") }}</h2>

        <div class="field grid">
          <label for="optin" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("scheduled_payments.optin_to_asset") }}
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
                {{ $t("scheduled_payments.optin_click") }}
              </Button>
            </InputGroup>
          </div>
        </div>
        <h2>{{ $t("scheduled_payments.withdraw_asset_title") }}</h2>
        <div class="field grid">
          <label for="withdrawAsset" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("scheduled_payments.withdraw_asset") }}
          </label>
          <div class="col-12 md:col-10">
            <DropDown
              inputId="withdrawAsset"
              :options="state.assets"
              v-model="state.withdrawAsset"
              optionLabel="assetName"
              optionValue="asset-id"
              class="w-full"
            ></DropDown>
          </div>
        </div>
        <div class="field grid">
          <label for="withdrawAmount" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("scheduled_payments.withdraw_amount") }}
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
              {{ $t("scheduled_payments.withdraw_click") }}
            </Button>
          </div>
        </div>
        <h2>{{ $t("scheduled_payments.load_script_title") }}</h2>
        <div class="field grid">
          <Button severity="secondary" @click="loadScript">{{
            $t("scheduled_payments.load_click")
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
