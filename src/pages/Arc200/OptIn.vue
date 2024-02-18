<script setup lang="ts">
import { onMounted, reactive } from "vue";
import MainLayout from "../../layouts/Main.vue";
import algosdk from "algosdk";
import Contract from "arc200js";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";

const store = useStore();
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
  loading: false,
});

onMounted(async () => {
  await store.dispatch("wallet/prolong");
});

const fetchAsset = async () => {
  try {
    const algodClient = await store.dispatch("algod/getAlgod");
    const indexerClient = await store.dispatch("indexer/getIndexer");
    state.arc200Info.arc200id = parseInt(state.arc200id);

    const contract = new Contract(
      state.arc200Info.arc200id,
      algodClient,
      indexerClient
    );
    state.arc200Info.name = "";
    state.loading = true;
    var name = await contract.arc200_name();
    if (!name.success) {
      store.dispatch("toast/openError", "Failed to fetch ARC200 name");
      state.loading = false;
      return;
    }
    state.arc200Info.name = name.returnValue;
    var symbol = await contract.arc200_symbol();
    if (!symbol.success) {
      store.dispatch("toast/openError", "Failed to fetch ARC200 symbol");
      state.loading = false;
      return;
    }
    state.arc200Info.symbol = symbol.returnValue;
    var decimals = await contract.arc200_decimals();
    if (!decimals.success) {
      store.dispatch("toast/openError", "Failed to fetch ARC200 decimals");
      state.loading = false;
      return;
    }
    state.arc200Info.decimals = decimals.returnValue;

    var totalSupply = await contract.arc200_totalSupply();
    if (!totalSupply.success) {
      store.dispatch("toast/openError", "Failed to fetch ARC200 totalSupply");
      state.loading = false;
      return;
    }
    state.arc200Info.totalSupply = totalSupply.returnValue;

    var balance = await contract.arc200_balanceOf(state.account.addr);
    if (!balance.success) {
      store.dispatch("toast/openError", "Failed to fetch ARC200 balance");
      state.loading = false;
      return;
    }
    state.arc200Info.balance = balance.returnValue;
    state.loading = false;
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to fetch arc200", error, err);
    await store.dispatch("toast/openError", error);
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
</script>

<template>
  <MainLayout v-if="state">
    <h1>Add ARC 200 asset to account {{ state?.account?.name }}</h1>
    <p>{{ $t("acc_overview.asset_optinArc200_help") }}</p>
    <div class="field grid">
      <label for="arc200id" class="col-12 mb-2 md:col-2 md:mb-0">
        ARC200 App ID
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
          Fetch asset information
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
          Reset
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
      <label class="col-12 mb-2 md:col-2 md:mb-0">Example assets</label>
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
    <div class="field grid mt-5" v-if="state.arc200Info.name && !state.loading">
      <label class="col-12 mb-2 md:col-2 md:mb-0">Name</label>
      <div class="col-12 md:col-10">
        {{ state.arc200Info.name }}
      </div>
    </div>
    <div class="field grid" v-if="state.arc200Info.name && !state.loading">
      <label class="col-12 mb-2 md:col-2 md:mb-0">Symbol</label>
      <div class="col-12 md:col-10">
        {{ state.arc200Info.symbol }}
      </div>
    </div>
    <div class="field grid" v-if="state.arc200Info.name && !state.loading">
      <label class="col-12 mb-2 md:col-2 md:mb-0">Decimals</label>
      <div class="col-12 md:col-10">
        {{ state.arc200Info.decimals }}
      </div>
    </div>
    <div class="field grid" v-if="state.arc200Info.name && !state.loading">
      <label class="col-12 mb-2 md:col-2 md:mb-0">Total supply</label>
      <div class="col-12 md:col-10">
        {{
          $filters.formatCurrencyBigInt(
            state.arc200Info.totalSupply,
            state.arc200Info.symbol,
            state.arc200Info.decimals
          )
        }}
      </div>
    </div>
    <div class="field grid" v-if="state.arc200Info.name && !state.loading">
      <label class="col-12 mb-2 md:col-2 md:mb-0">Account balance</label>
      <div class="col-12 md:col-10">
        {{
          $filters.formatCurrencyBigInt(
            state.arc200Info.balance,
            state.arc200Info.symbol,
            state.arc200Info.decimals
          )
        }}
      </div>
    </div>
    <div class="field grid" v-if="state.arc200Info.name && !state.loading">
      <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
      <div class="col-12 md:col-10">
        <Button class="my-2" @click="save"> Save asset to your account </Button>
      </div>
    </div>
  </MainLayout>
</template>
