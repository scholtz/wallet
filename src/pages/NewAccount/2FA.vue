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
    <h1>2FA Account</h1>
    <div v-if="state.lastError">
      <div class="alert alert-danger">
        {{ $t("new_account_2fa.last_error") }}: {{ state.lastError }}
      </div>
    </div>
    <p>
      2FA account allows you to create multisig account with 3 accounts setup
      with threshold of 2 required for signature.
    </p>
    <p>
      First account may be password protected account where in the case of the
      hack of your wallet the hacker cannot sign the transactions on your
      behalf. If your 2FA device gets broken, or 2FA service gets down, you can
      rekey your account to another 2FA multisig with your first and second
      account.
    </p>
    <p>
      2FA service is third party service which might be compromised. If hacker
      receives your private key and receives the private key of the 2fa service,
      he may sign transactions on your behalf. By using the 2fa service you
      increase chance that hacker who receive ability to sign transactions with
      your primary or recovery account is not able to sign transactions from
      your multisig account.
    </p>
    <div class="p-fluid">
      <div class="p-field mb-2">
        <label for="account1">2FA provider</label>
        <Suspense>
          <Select2FAServer v-model="state.server"></Select2FAServer>
          <template #fallback> Loading... </template>
        </Suspense>
      </div>
      <div class="p-field mb-2">
        <label for="account1">Hot account</label>
        <SelectAccount v-model="state.account1"></SelectAccount>
      </div>
      <div class="p-field mb-2">
        <label for="account2">Cold storage account</label>
        <SelectAccount v-model="state.account2"></SelectAccount>
      </div>
      <button
        class="btn btn-primary my-2"
        @click="arc14Request"
        :disabled="
          !state.account1 || !state.account2 || state.account1 == state.account2
        "
      >
        Request 2FA QR code
      </button>
      <div v-if="state.auth2FAResp && state.auth2FAResp.qrCodeSetupImageUrl">
        <h2>Please scan the QR code with your 2FA app</h2>
        <img
          :src="state.auth2FAResp.qrCodeSetupImageUrl"
          width="200"
          height="200"
        />
        <h3>Manual entry key</h3>
        <code>{{ state.auth2FAResp.manualEntryKey }}</code>
        <h3>Confirm setup</h3>
        <p>Please write 2FA code from your auth app to confirm the setup</p>
        <div class="p-field mb-2">
          <label for="name">Account name</label>
          <InputText itemid="name" v-model="state.name" />
        </div>
        <div class="p-field mb-2">
          <label for="txtCode">2FA code</label>
          <InputMask itemid="txtCode" v-model="state.txtCode" mask="999-999" />
        </div>
        <button class="btn btn-primary my-2" @click="confirmRequest">
          Save address
        </button>
      </div>
    </div>
  </MainLayout>
</template>
