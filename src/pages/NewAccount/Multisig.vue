<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { onMounted, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import MultiSelect from "primevue/multiselect";
import Slider from "primevue/slider";
import { RootState } from "@/store";

const multisigaccts: string[] = [];
const state = reactive({
  addr: "",
  name: "",

  multisignum: 2,
  multisigaccts,
  lastmultisigaccts: multisigaccts,
  friendaccounts: "",
});

const reset = async () => {
  state.name = "";

  state.addr = "";

  await store.dispatch("wallet/prolong");
  router.push({ name: "Accounts" });
};

const { t } = useI18n(); // use as global scope

const store = useStore<RootState>();
const router = useRouter();
const makeAccounts = () => {
  const accounts = state.friendaccounts.split("\n");
  let accts: string[] = [];

  for (let account of accounts) {
    if (account.length == 58) {
      accts.push(account);
    }
  }
  return accts;
};
const createMultisignClick = async () => {
  try {
    let accts = makeAccounts();
    const mparams = {
      version: 1,
      threshold: state.multisignum,
      addrs: accts,
    };
    await store.dispatch("wallet/addMultiAccount", {
      params: mparams,
      name: state.name,
    });
    router.push({ name: "Accounts" });
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to create account", error, err);
    await store.dispatch("toast/openError", error);
  }
};
onMounted(async () => {
  await store.dispatch("wallet/prolong");
});

const countAccounts = () => {
  return makeAccounts().length;
};

const onAccountsChanged = () => {
  // on add
  for (const acct of state.multisigaccts) {
    if (state.lastmultisigaccts.indexOf(acct) < 0) {
      state.friendaccounts += acct + "\n";
    }
  }

  // on remove
  for (const acct of state.lastmultisigaccts) {
    if (state.multisigaccts.indexOf(acct) < 0) {
      state.friendaccounts = state.friendaccounts.replace(acct + "\n", "");
    }
  }

  state.lastmultisigaccts = state.multisigaccts;
};
</script>
<template>
  <MainLayout>
    <h1>{{ t("newacc.create_multisign_account") }}</h1>

    <Card>
      <template #content>
        <p>
          {{ t("newacc.multisig_help") }}
        </p>
        <div class="field grid">
          <label for="accounts" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("newacc.select_account_from_list") }}
          </label>
          <div class="col-12 md:col-10">
            <MultiSelect
              id="accounts"
              v-model="state.multisigaccts"
              class="w-full"
              :options="store.state.wallet.privateAccounts"
              optionLabel="name"
              optionValue="addr"
              @change="onAccountsChanged"
            />
          </div>
        </div>
        <div class="field grid">
          <label
            for="accountslist"
            class="col-12 mb-2 md:col-2 md:mb-0 vertical-align-top h-full"
          >
            {{ t("newacc.add_other_accounts") }}
          </label>
          <div class="col-12 md:col-10">
            <Textarea
              id="accountslist"
              v-model="state.friendaccounts"
              class="w-full"
              style="min-height: 150px"
              :rows="10"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="threshold" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("newacc.trashold_help") }}
          </label>
          <div class="col-12 md:col-10">
            <p class="my-2">({{ state.multisignum }}/{{ countAccounts() }}):</p>

            <Slider
              inputId="customRange2Slider"
              v-model="state.multisignum"
              class="w-full"
              :min="1"
              :max="countAccounts()"
            />

            <InputNumber
              inputId="threshold"
              v-model="state.multisignum"
              class="w-full"
              :min="1"
              :max="countAccounts()"
              showButtons
            />
          </div>
        </div>

        <div class="field grid">
          <label for="name" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("newacc.name") }}
          </label>
          <div class="col-12 md:col-10">
            <InputText id="name" v-model="state.name" class="form-control" />
          </div>
        </div>

        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <Button class="m-1" @click="createMultisignClick">
              {{ t("newacc.create_account") }}
            </Button>
            <Button severity="secondary" class="m-1" @click="reset">
              {{ t("global.go_back") }}
            </Button>
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>
