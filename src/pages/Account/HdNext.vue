<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import { computed, onMounted, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import { RootState } from "@/store";

interface HdNextState {
  name: string;
  accountIndex: number;
  lastError: string;
  hdRootAddr: string;
}

const { t } = useI18n();
const store = useStore<RootState>();
const router = useRouter();
const route = useRoute();

const state = reactive<HdNextState>({
  name: "",
  accountIndex: 0,
  lastError: "",
  hdRootAddr: "",
});

const canCreate = computed(() => !!state.name);

async function generateAccount() {
  try {
    state.lastError = "";
    const addr = await store.dispatch("wallet/addHdWalletChildAccount", {
      name: state.name,
      hdRootAddr: state.hdRootAddr,
      hdAccountIndex: state.accountIndex,
    });
    router.push("/account/" + addr);
  } catch (err: any) {
    state.lastError = err.message ?? err;
    console.error("failed to generate hd account", err);
  }
}

onMounted(async () => {
  await store.dispatch("wallet/prolong");
  const addr = String(route.params.account);
  const account = (await store.dispatch("wallet/getAccount", {
    addr,
  })) as RootState["wallet"]["privateAccounts"][number] | undefined;
  state.hdRootAddr = account?.hdRootAddr ?? addr;
  const siblings = store.state.wallet.privateAccounts.filter(
    (a) => a.hdRootAddr === state.hdRootAddr
  );
  const maxIndex = siblings.reduce(
    (max, a) => Math.max(max, a.hdAccountIndex ?? 0),
    -1
  );
  state.accountIndex = maxIndex + 1;
});
</script>
<template>
  <MainLayout>
    <h1>{{ t("hdaccount.generate_next") }}</h1>

    <Card>
      <template #content>
        <div v-if="state.lastError">
          <Message severity="error">
            {{ t("new_account_pass.last_error") }}: {{ state.lastError }}
          </Message>
        </div>
        <p>{{ t("hdaccount.generate_next_help") }}</p>

        <div class="field grid">
          <label for="accountIndex" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("hdaccount.iteration") }}
          </label>
          <div class="col-12 md:col-10">
            <InputNumber
              showButtons
              inputId="accountIndex"
              v-model="state.accountIndex"
              :min="0"
              :max="2147483647"
              :step="1"
              class="w-full"
            />
          </div>
        </div>

        <div class="field grid">
          <label for="name" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("accounts.account_name") }}
          </label>
          <div class="col-12 md:col-10">
            <InputText id="name" v-model="state.name" class="w-full" />
          </div>
        </div>

        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <Button
              class="my-2"
              @click="generateAccount"
              :disabled="!canCreate"
              id="generate_hd_account"
            >
              {{ t("hdaccount.generate_next") }}
            </Button>
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>
