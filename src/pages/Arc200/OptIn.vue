<script setup lang="ts">
import { onMounted, reactive } from "vue";
import MainLayout from "../../layouts/Main.vue";
import algosdk from "algosdk";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
import { getArc200Client } from "arc200-client";
import formatCurrencyBigInt from "../../scripts/numbers/formatCurrencyBigInt";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { BoxReference } from "@algorandfoundation/algokit-utils/types/app-manager";
import { RootState } from "@/store";
const store = useStore<RootState>();
const route = useRoute();
const router = useRouter();

const state = reactive({
  account: {
    name: "",
    addr: route.params.account as string,
  },
  arc200id: "",
  arc200Info: {
    arc200id: 0,
    name: "",
    symbol: "",
    decimals: BigInt(0),
    totalSupply: BigInt(0),
    balance: BigInt(0),
  },
  boxNotFound: false,
  loading: false,
});

onMounted(async () => {
  await store.dispatch("wallet/prolong");
});

const fetchAsset = async () => {
  try {
    const algod: algosdk.Algodv2 = await store.dispatch("algod/getAlgod");
    const indexerClient = await store.dispatch("indexer/getIndexer");
    state.arc200Info.arc200id = parseInt(state.arc200id);
    var algoClient = AlgorandClient.fromClients({
      algod,
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
      appId: BigInt(state.arc200Info.arc200id),
      defaultSender: dummyAddress,
      defaultSigner: dummyTransactionSigner,
      appName: "arc200",
      approvalSourceMap: undefined,
      clearSourceMap: undefined,
    });
    state.loading = true;
    state.arc200Info = {
      arc200id: 0,
      name: "",
      symbol: "",
      decimals: BigInt(0),
      totalSupply: BigInt(0),
      balance: BigInt(0),
    };
    try {
      const name = await client.arc200Name();
      try {
        state.arc200Info.name = Buffer.from(name).toString("utf-8");
      } catch (e) {
        state.arc200Info.name = name.toString();
      }
    } catch (e) {
      console.error("error fetching arc200 name", e);
      state.loading = false;
      store.dispatch(
        "toast/openError",
        `Failed to fetch ARC200 name at network ${store.state.config.envName}. Asset does not exist, or you have problem with internet, or you are using wrong network.`
      );
      return;
    }
    await delay(200);
    try {
      const symbol = await client.arc200Symbol();
      state.arc200Info.symbol = Buffer.from(symbol).toString("utf-8");
    } catch (e) {
      console.error("error fetching arc200 symbol", e);
      state.loading = false;
      store.dispatch(
        "toast/openError",
        `Failed to fetch ARC200 symbol at network ${store.state.config.envName}. You have problem with internet, or asset does not exist, or you are using wrong network.`
      );
      return;
    }
    await delay(200);
    try {
      const decimals = await client.arc200Decimals();
      state.arc200Info.decimals = BigInt(decimals);
    } catch (e) {
      console.error("error fetching arc200 decimals", e);
      state.loading = false;
      store.dispatch(
        "toast/openError",
        `Failed to fetch ARC200 decimals at network ${store.state.config.envName}. You have problem with internet, or asset does not exist, or you are using wrong network.`
      );
      return;
    }
    await delay(200);
    try {
      const totalSupply = await client.arc200TotalSupply();
      state.arc200Info.totalSupply = BigInt(totalSupply);
    } catch (e) {
      console.error("error fetching arc200 totalSupply", e);
      state.loading = false;
      store.dispatch(
        "toast/openError",
        `Failed to fetch ARC200 totalSupply at network ${store.state.config.envName}. You have problem with internet, or asset does not exist, or you are using wrong network.`
      );
      return;
    }
    await delay(200);

    try {
      const balance = await client.arc200BalanceOf({
        args: { owner: state.account.addr },
      });
      state.arc200Info.balance = balance;
    } catch (e) {
      console.error("error fetching arc200 balance", e);
      state.loading = false;
      store.dispatch(
        "toast/openError",
        `Failed to fetch ARC200 balance at network ${store.state.config.envName}. You have problem with internet, or asset does not exist, or you are using wrong network.`
      );
      return;
    }

    await delay(200);

    state.arc200Info.arc200id = Number(state.arc200id);
    state.boxNotFound = !(await accountIsOptedInToArc200Asset(
      state.account.addr
    ));

    state.loading = false;
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to fetch arc200", error, err);
    await store.dispatch("toast/openError", error);
  }
};
const accountIsOptedInToArc200Asset = async (addr: string) => {
  if (state.arc200Info.balance > BigInt(0)) {
    return true; // if balance > 0, then account is opted in
  }
  const indexerClient = await store.dispatch("indexer/getIndexer");
  const fromDecoded = algosdk.decodeAddress(addr);
  const boxName = new Uint8Array(
    Buffer.concat([Buffer.from([0x00]), Buffer.from(fromDecoded.publicKey)])
  );
  try {
    await indexerClient
      .lookupApplicationBoxByIDandName(state.arc200Info.arc200id, boxName)
      .do();
    return true;
  } catch (exc: any) {
    if (exc.message?.indexOf("no application boxes found")) {
      return false;
    } else {
      console.error(exc);
      throw exc;
    }
  }
};
const save = async () => {
  try {
    await store.dispatch("wallet/addArc200Asset", {
      addr: state.account.addr,
      arc200Info: state.arc200Info,
    });
    router.push({ name: "Accounts" });
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to addArc200Asset", error, err);
    await store.dispatch("toast/openError", error);
  }
};

const makeOptInTxs = async () => {
  const algod: algosdk.Algodv2 = await store.dispatch("algod/getAlgod");
  const indexerClient = await store.dispatch("indexer/getIndexer");
  const appId = Number(state.arc200Info.arc200id);
  const dummyTransactionSigner = async (
    txnGroup: algosdk.Transaction[],
    indexesToSign: number[]
  ): Promise<Uint8Array[]> => {
    console.log("transactionSigner", txnGroup, indexesToSign);
    return [] as Uint8Array[];
  };
  var algoClient = AlgorandClient.fromClients({
    algod,
    indexer: indexerClient,
  });
  const client = getArc200Client({
    algorand: algoClient,
    appId: BigInt(state.arc200Info.arc200id),
    defaultSender: state.account.addr,
    defaultSigner: dummyTransactionSigner,
    appName: "arc200",
    approvalSourceMap: undefined,
    clearSourceMap: undefined,
  });
  const fromDecoded = algosdk.decodeAddress(state.account.addr);
  var boxFromDirect: BoxReference = {
    // : algosdk.BoxReference
    appId: BigInt(appId),
    name: new Uint8Array(Buffer.from(fromDecoded.publicKey)),
  };
  var boxFrom: BoxReference = {
    // : algosdk.BoxReference
    appId: BigInt(appId),
    name: new Uint8Array(
      Buffer.concat([Buffer.from([0x00]), Buffer.from(fromDecoded.publicKey)])
    ), // data box
  };
  var boxFromAddrText: BoxReference = {
    // : algosdk.BoxReference
    appId: BigInt(appId),
    name: new Uint8Array(Buffer.from(state.account.addr, "ascii")), // box as the address encoded as text
  };
  console.log("boxes: [boxFromDirect, boxFrom, boxFromAddrText]", {
    boxes: [boxFromDirect, boxFrom, boxFromAddrText],
  });
  const txsToSignArc200 = await client.createTransaction.arc200Transfer({
    args: { to: state.account.addr, value: BigInt(0) },
    boxReferences: [boxFromDirect, boxFrom, boxFromAddrText],
  });
  const enc = new TextEncoder();
  let noteEnc = enc.encode("o");
  const payTx = await store.dispatch("algod/preparePayment", {
    payTo: algosdk.getApplicationAddress(appId),
    payFrom: state.account.addr,
    amount: 28500,
    noteEnc: noteEnc,
    fee: undefined,
    asset: undefined,
    reKeyTo: undefined,
  });

  const txsToSign = [];
  txsToSign.push(payTx);
  txsToSignArc200.transactions.forEach((tx) => {
    txsToSign.push(tx);
  });
  algosdk.assignGroupID(txsToSign);
  return txsToSign;
};

const createBoxClick = async () => {
  try {
    await store.dispatch("signer/toSignArray", {
      txs: await makeOptInTxs(),
    });
    await router.push("/signAll");
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to addArc200Asset", error, err);
    await store.dispatch("toast/openError", error);
  }
};

const delay = (ms: any) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
</script>

<template>
  <MainLayout v-if="state">
    <h1>{{ $t("arc200.optin_header") }} {{ state?.account?.name }}</h1>
    <Card>
      <template #content>
        <p>{{ $t("acc_overview.asset_optinArc200_help") }}</p>
        <div class="field grid">
          <label for="arc200id" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("arc200.app_id") }}
          </label>
          <div class="col-12 md:col-10">
            <InputText id="arc200id" v-model="state.arc200id" class="w-full" />
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <Button
              class="my-2 mr-2"
              @click="fetchAsset"
              :severity="state.arc200Info.name ? 'secondary' : 'primary'"
              :disabled="state.loading || !state.arc200id"
            >
              {{ $t("arc200.fetch_action") }}
              <ProgressSpinner
                class="ml-2"
                v-if="state.loading"
                style="width: 1em; height: 1em"
                strokeWidth="10"
              />
            </Button>

            <Button
              class="my-2"
              :disabled="!state.arc200id"
              @click="
                state.arc200id = '';
                state.arc200Info.name = '';
                state.loading = false;
              "
              severity="secondary"
            >
              {{ $t("arc200.reset") }}
            </Button>
          </div>
        </div>
        <div
          class="field grid my-5"
          v-if="
            !state.arc200Info.name &&
            !state.loading &&
            store.state.config.env == 'voitest-v1'
          "
        >
          <label class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("arc200.examples")
          }}</label>
          <div class="col-12 md:col-10">
            <Button
              class="mr-1"
              @click="state.arc200id = '6779767'"
              severity="secondary"
            >
              Via
            </Button>
            <Button
              class="mr-1"
              @click="state.arc200id = '6795477'"
              severity="secondary"
            >
              TacoCoin
            </Button>
            <Button
              class="mr-1"
              @click="state.arc200id = '23214349'"
              severity="secondary"
            >
              NFT Rewards
            </Button>
            <Button
              class="mr-1"
              @click="state.arc200id = '24590664'"
              severity="secondary"
            >
              Wrapped Voi
            </Button>
          </div>
        </div>
        <div
          class="field grid mt-5"
          v-if="state.arc200Info.arc200id && !state.loading"
        >
          <label class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("arc200.app_id")
          }}</label>
          <div class="col-12 md:col-10">
            {{ state.arc200Info.arc200id }}
          </div>
        </div>
        <div
          class="field grid"
          v-if="state.arc200Info.arc200id && !state.loading"
        >
          <label class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("arc200.name")
          }}</label>
          <div class="col-12 md:col-10">
            {{ state.arc200Info.name }}
          </div>
        </div>
        <div
          class="field grid"
          v-if="state.arc200Info.arc200id && !state.loading"
        >
          <label class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("arc200.symbol")
          }}</label>
          <div class="col-12 md:col-10">
            {{ state.arc200Info.symbol }}
          </div>
        </div>
        <div
          class="field grid"
          v-if="state.arc200Info.arc200id && !state.loading"
        >
          <label class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("arc200.decimals")
          }}</label>
          <div class="col-12 md:col-10">
            {{ state.arc200Info.decimals }}
          </div>
        </div>
        <div
          class="field grid"
          v-if="state.arc200Info.arc200id && !state.loading"
        >
          <label class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("arc200.supply")
          }}</label>
          <div class="col-12 md:col-10">
            {{
              formatCurrencyBigInt(
                state.arc200Info.totalSupply,
                state.arc200Info.symbol,
                Number(state.arc200Info.decimals)
              )
            }}
          </div>
        </div>
        <div
          class="field grid"
          v-if="state.arc200Info.arc200id && !state.loading"
        >
          <label class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("arc200.balance")
          }}</label>
          <div class="col-12 md:col-10">
            {{
              formatCurrencyBigInt(
                state.arc200Info.balance,
                state.arc200Info.symbol,
                Number(state.arc200Info.decimals)
              )
            }}
          </div>
        </div>
        <div
          class="field grid"
          v-if="state.arc200Info.arc200id && !state.loading"
        >
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("arc200.is_opted_in") }}
          </label>
          <div class="col-12 md:col-10">
            {{ !state.boxNotFound }}
            {{
              state.boxNotFound ? "- Box does not exists yet" : "- Box exists"
            }}
          </div>
        </div>
        <div
          class="field grid"
          v-if="state.arc200Info.arc200id && !state.loading"
        >
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <Button
              class="my-2 mr-2"
              @click="createBoxClick"
              v-if="state.boxNotFound"
              severity="primary"
            >
              {{ $t("arc200.create_box") }}
            </Button>
            <Button
              class="my-2"
              @click="save"
              :disabled="state.boxNotFound"
              :severity="state.boxNotFound ? 'secondary' : 'primary'"
            >
              {{ $t("arc200.save_action") }}
            </Button>
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>
