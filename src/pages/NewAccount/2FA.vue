<script setup lang="ts">
import { mapActions, useStore } from "vuex";
import MainLayout from "../../layouts/Main.vue";
import { reactive } from "vue";
import { useI18n } from "vue-i18n";
import InputMask from "primevue/inputmask";
import SelectAccount from "@/components/SelectAccount.vue";
import Select2FAServer from "@/components/Select2FAServer.vue";

import algosdk from "algosdk";
import { useRouter } from "vue-router";
const state = reactive({
  lastError: "",
  account1: "",
  account2: "",
  auth2FAResp: {
    qrCodeSetupImageUrl: "",
    manualEntryKey: "",
  },
  txtCode: "",
  authToken: "",
  name: "",
  confirmResp: undefined,
  server: "",
});

const { t } = useI18n(); // use as global scope

const store = useStore();
const router = useRouter();

async function arc14Request() {
  const realm = await store.dispatch("fa2/getRealm", {
    twoFactorAuthProvider: state.server,
  });
  console.log("sending", { account: state.account1, realm });
  state.authToken = await store.dispatch("arc14/signAuthTx", {
    account: state.account1,
    realm,
  });
  if (!state.authToken) return;
  console.log("authToken", state.authToken);
  state.auth2FAResp = await store.dispatch("fa2/setupAuthenticator", {
    authToken: state.authToken,
    account: state.account1,
    secondaryAccount: state.account2,
    twoFactorAuthProvider: state.server,
  });
  console.log("setupAuthenticator", state.auth2FAResp);
}
async function confirmRequest() {
  if (!state.authToken) return;

  state.confirmResp = await store.dispatch("fa2/confirmAuthenticator", {
    authToken: state.authToken,
    secondaryAccount: state.account2,
    txtCode: state.txtCode,
    twoFactorAuthProvider: state.server,
  });
  console.log("state.confirmResp", state.confirmResp);
  if (state.confirmResp) {
    await store.dispatch("wallet/add2FAAccount", {
      name: state.name,
      primaryAccount: state.account1,
      recoveryAccount: state.account2,
      twoFactorAccount: state.confirmResp,
      twoFactorAuthProvider: state.server,
    });
    router.push({ name: "Accounts" });
  }
  console.log("state.confirmResp", state.confirmResp);
}
</script>
<template>
  <MainLayout>
    <h1>{{ $t("new_account_2fa.title") }}</h1>
    <div v-if="state.lastError">
      <div class="alert alert-danger">
        {{ $t("general.last_error") }}: {{ state.lastError }}
      </div>
    </div>
    <p>
      {{ $t("new_account_2fa.help1") }}
    </p>
    <p>
      {{ $t("new_account_2fa.help2") }}
    </p>
    <p>
      {{ $t("new_account_2fa.help3") }}
    </p>
    <div class="p-fluid">
      <div class="p-field mb-2">
        <label for="account1">{{ $t("new_account_2fa.2fa_provider") }}</label>
        <Suspense>
          <Select2FAServer v-model="state.server"></Select2FAServer>
          <template #fallback> {{ $t("general.loading") }} </template>
        </Suspense>
      </div>
      <div class="p-field mb-2">
        <label for="account1">{{ $t("new_account_2fa.hot_account") }}</label>
        <SelectAccount v-model="state.account1"></SelectAccount>
      </div>
      <div class="p-field mb-2">
        <label for="account2">{{ $t("new_account_2fa.cold_account") }}</label>
        <SelectAccount v-model="state.account2"></SelectAccount>
      </div>
      <button
        class="btn btn-primary my-2"
        @click="arc14Request"
        :disabled="
          !state.account1 || !state.account2 || state.account1 == state.account2
        "
      >
        {{ $t("new_account_2fa.request_qr_code") }}
      </button>
      <div v-if="state.auth2FAResp && state.auth2FAResp.qrCodeSetupImageUrl">
        <h2>{{ $t("new_account_2fa.scan_qr") }}</h2>
        <img
          :src="state.auth2FAResp.qrCodeSetupImageUrl"
          width="200"
          height="200"
        />
        <h3>{{ $t("new_account_2fa.manual_entry_key") }}</h3>
        <code>{{ state.auth2FAResp.manualEntryKey }}</code>
        <h3>{{ $t("new_account_2fa.confirm_2fa") }}</h3>
        <p>{{ $t("new_account_2fa.confirm_help") }}</p>
        <div class="p-field mb-2">
          <label for="name">{{ $t("accounts.account_name") }}</label>
          <InputText itemid="name" v-model="state.name" />
        </div>
        <div class="p-field mb-2">
          <label for="txtCode">{{ $t("accounts.2fa_code") }}</label>
          <InputMask itemid="txtCode" v-model="state.txtCode" mask="999-999" />
        </div>
        <button class="btn btn-primary my-2" @click="confirmRequest">
          {{ $t("new_account_2fa.save_button") }}
        </button>
      </div>
    </div>
  </MainLayout>
</template>
