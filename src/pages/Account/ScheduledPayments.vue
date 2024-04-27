<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { useStore } from "vuex";
import { onMounted, reactive, watch } from "vue";
import { FilterMatchMode } from "primevue/api";
import SelectAccount from "../../components/SelectAccount.vue";
import SelectAsset from "../../components/SelectAsset.vue";
import DropDown from "primevue/dropdown";
import CAsset from "@/scripts/interface/CAsset";
import base642base64url from "@/scripts/encoding/base642base64url";
import { useRoute, useRouter } from "vue-router";
import YAML from "yaml";
import {
  BiatecTaskManagerClient,
  getPoolManagerApp,
  getBoxReferenceUser,
} from "biatec-scheduler";
import algosdk from "algosdk";
import axios from "axios";

const route = useRoute();
const store = useStore();
const router = useRouter();
console.log("route.params", route.params);
const state = reactive({
  selection: "",
  payTo: "",
  assetData: new CAsset(),
  account: route.params.account as string,
  amount: 0,
  maxAmount: 0,
  stepAmount: 1,
  apps: [
    {
      appId: 123,
      balanceFee: 123,
      period: 3600,
      start: new Date(),
    },
  ],
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
  console.log("state.assetData", state.assetData);
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

const decimals = () => {
  console.log("decimals.state.assetData", state.assetData);
  if (state.assetData) {
    return state.assetData.decimals;
  }
  return 6;
};
const stepAmount = () => {
  if (!state.assetData.decimals) return 1;
  const ret = Math.pow(10, -1 * state.assetData.decimals);
  console.log("stepAmount", ret);
  return ret;
};
const setMaxAmount = () => {
  state.amount = maxAmount();
};
watch(
  () => state.assetData,
  async () => {
    console.log("asset watch", state.assetData["asset-id"]);
    state.maxAmount = maxAmount();
    state.stepAmount = stepAmount();
    await store.dispatch("wallet/prolong");
  },
  { deep: true }
);

const loadTableData = async () => {
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
  const addr = route.params.account as string;
  console.log("addr", addr, route, route.params);
  const decodedAddr = algosdk.decodeAddress(addr);
  const box = await algod
    .getApplicationBoxByName(
      poolAppId,
      getBoxReferenceUser(poolAppId, decodedAddr).name
    )
    .do();
  // const box = await indexer
  //   .lookupApplicationBoxByIDandName(
  //     poolAppId,
  //     getBoxReferenceUser(poolAppId, decodedAddr).name
  //   )
  //   .do();
  console.log("poolAppId", poolAppId, box);
};

const deployApp = async () => {
  const doc = {
    schedule: {
      period: state.period,
      start: state.start,
      fee: 1000,
      app: 0,
    },
    tasks: [
      {
        task: "pay@v1",
        displayName: `Pay to '${state.payTo}' ${state.amount} of token ${state.assetData["asset-id"]}`,
        inputs: {
          receiver: `'${state.payTo}'`,
          amount: Math.round(state.amount * 10 ** state.assetData.decimals),
          token: state.assetData["asset-id"],
        },
      },
    ],
  };
  const docYaml = YAML.stringify(doc);
  const postRet = await axios.post(
    "https://api-scheduler.biatec.io/v1/build/0",
    docYaml,
    {
      headers: {
        "Content-Type": "application/yaml",
      },
    }
  );

  console.log("postRet", postRet);
  if (postRet.data.status !== "success") {
    throw Error("Build has failed");
  }
  state.hash = postRet.data.hash;
  state.client = postRet.data.client;

  const txsRequest = await axios.get(
    `https://api-scheduler.biatec.io/v1/tx-create/${state.hash}/${store.state.config.env}/${route.params.account}/${state.client}`
  );

  const txs = txsRequest.data.map((t: string) => {
    return algosdk.decodeUnsignedTransaction(
      Buffer.from(t, "base64")
    ) as algosdk.Transaction;
  });

  await store.dispatch("signer/returnTo", "ScheduledPayments");
  await store.dispatch("signer/toSign", { tx: txs[0] });
  const encoded = base642base64url(
    Buffer.from(algosdk.encodeUnsignedTransaction(txs[0])).toString("base64")
  );

  state.txID = (txs[0] as algosdk.Transaction).txID();
  state.action = "tx-deploy";
  localStorage.setItem("currentAction", JSON.stringify(state));

  router.push(`/sign/${route.params.account}/${encoded}`);
};

const continueTxDeploy = async () => {
  try {
    const algod = (await store.dispatch("algod/getAlgod")) as algosdk.Algodv2;
    const info = await algosdk.waitForConfirmation(algod, state.txID, 1);
    state.appId = info["application-index"];

    const txsRequest = await axios.post(
      `https://api-scheduler.biatec.io/v1/tx/${state.hash}/${store.state.config.env}/${route.params.account}/${state.appId}/bootstrap/${state.client}`,
      {
        period: Number(state.period),
        start: Number(state.start),
        fee: Number(state.fee),
      }
    );

    state.action = "tx-configure";
    localStorage.setItem("currentAction", JSON.stringify(state));

    const txs = txsRequest.data.map((t: string) => {
      return algosdk.decodeUnsignedTransaction(
        Buffer.from(t, "base64")
      ) as algosdk.Transaction;
    });

    await store.dispatch("signer/returnToSignAll", "ScheduledPayments");
    await store.dispatch("signer/toSignArray", { txs: txs });

    await router.push("/signAll");
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
    if (deserialized.account) {
      state.account = deserialized.account;
    }
    if (deserialized.amount) {
      state.amount = deserialized.amount;
    }
    if (deserialized.period) {
      state.period = deserialized.period;
    }
    if (deserialized.txID) {
      state.txID = deserialized.txID;
    }
    if (deserialized.action) {
      state.action = deserialized.action;
    }
    if (deserialized.hash) {
      state.hash = deserialized.hash;
    }
    if (deserialized.client) {
      state.client = deserialized.client;
    }
    if (deserialized.start) {
      state.start = deserialized.start;
    }
    if (deserialized.fee) {
      state.fee = deserialized.fee;
    }
  } catch (exc: any) {
    console.error(exc.message ?? exc);
  }

  if (state.action === "tx-deploy") {
    continueTxDeploy();
  }
});
</script>
<template>
  <MainLayout>
    <h1>Scheduled payments management</h1>

    <Card>
      <template #content>
        <p>
          With decentralized scheduler you will deploy the smart contract -
          escrow account which will be used for purpose to allow any executor
          perform withdrawal from your escrow account to the destination account
          when the time comes. Executors are incentivized to execute your
          scheduled task with vision of receiving small fee paid in ASA.Gold
          token - 0.001 gram of gold.
        </p>
        <h2>New scheduled payment</h2>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"> Period </label>
          <div class="col-12 md:col-10">
            <DropDown
              v-model="state.period"
              option-label="name"
              option-value="value"
              :options="state.optionsSchedule"
              class="w-full"
            >
            </DropDown>
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"> Pay to </label>
          <div class="col-12 md:col-10">
            <SelectAccount v-model="state.payTo" class="w-full"></SelectAccount>
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0" for="asset">
            Asset to send
          </label>
          <div class="col-12 md:col-10">
            <SelectAsset
              itemId="asset"
              v-model="state.assetData"
              class="w-full"
              :account="state.account"
            ></SelectAsset>
          </div>
        </div>
        <div class="field grid">
          <label for="payamount" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("pay.amount") }}
          </label>
          <div class="col-12 md:col-10">
            <InputGroup>
              <InputNumber
                itemId="payamount"
                v-model="state.amount"
                :min="0"
                :max="state.maxAmount"
                :step="state.stepAmount"
                :maxFractionDigits="state.assetData.decimals"
                showButtons
                class="w-full"
              />
              <InputGroupAddon v-if="state.assetData">
                {{ state.assetData["unit-name"] }}
              </InputGroupAddon>
              <Button severity="secondary" class="col-2" @click="setMaxAmount">
                {{ $t("pay.set_max") }}
              </Button>
            </InputGroup>
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"> </label>
          <div class="col-12 md:col-10">
            <Button @click="deployApp">Create escrow account</Button>
          </div>
        </div>
        <h2>List of active payments</h2>
        <DataTable
          v-model:selection="state.selection"
          :value="state.apps"
          responsive-layout="scroll"
          selection-mode="single"
          :paginator="true"
          :rows="20"
          v-model:filters="state.filters"
          filterDisplay="menu"
          :globalFilterFields="['appId']"
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
          <template #empty> No scheduled payments has been found </template>
          <Column
            field="appId"
            :header="$t('scheduled_payments.app_id')"
            :sortable="true"
          />
          <Column
            field="interval"
            :header="$t('scheduled_payments.interval')"
            :sortable="true"
          />
          <Column
            field="start"
            :header="$t('scheduled_payments.start')"
            :sortable="true"
          />
          <Column
            field="feeBalance"
            :header="$t('scheduled_payments.fee_balance')"
            :sortable="true"
          />
        </DataTable>
      </template>
    </Card>
  </MainLayout>
</template>
