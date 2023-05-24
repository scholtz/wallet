<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { reactive } from "vue";
import { useI18n } from "vue-i18n";
import Password from "primevue/password";

const state = reactive({
  lastError: "",
  email: "",
  password: "",
});

const { t } = useI18n(); // use as global scope
</script>
<template>
  <MainLayout>
    <h1>Email and password account</h1>
    <div v-if="state.lastError">
      <div class="alert alert-danger">
        {{ $t("new_account_pass.last_error") }}: {{ state.lastError }}
      </div>
    </div>
    <p>
      Hash of combination of your email and your password will generate seed
      bytes for your first algorand account. We will store to the secure storage
      only the email. With each transaction you will be asked to write your
      first account password, so please use the same security with it as you use
      for your mnemonic. You can change the password or email only by rekeying
      to another account.
    </p>
    <div class="form-group">
      <label for="email">Email</label>
      <InputText id="email" v-model="state.email" />
    </div>
    <div class="form-group">
      <label for="pass">Password</label>
      <Password id="pass" v-model="state.password" />
    </div>
  </MainLayout>
</template>
