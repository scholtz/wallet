<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import Password from "primevue/password";
import InputText from "primevue/inputtext";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import InputSwitch from "primevue/inputswitch";
import { passwordStrength } from "check-password-strength";

const state = reactive({
  lastError: "",
  email: "",
  password: "",
  name: "",
  savePassword: true,
  emailIsValid: false,
});

const canCreatePassword = computed(() => {
  return state.emailIsValid && !!state.name && state.password.length >= 16;
});
const { t } = useI18n(); // use as global scope

const store = useStore();
const router = useRouter();

function checkEmailValidity() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  state.emailIsValid = emailRegex.test(state.email);
}

async function createAccount() {
  try {
    await store.dispatch("wallet/addEmailPasswordAccount", {
      name: state.name,
      savePassword: state.savePassword,
      email: state.email,
      password: state.password,
    });

    router.push({ name: "Accounts" });
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to create account", error, err);
    await store.dispatch("toast/openError", error);
  }
}
onMounted(async () => {
  await store.dispatch("wallet/prolong");
});
</script>
<template>
  <MainLayout>
    <h1>{{ $t("arc76account.title") }}</h1>
    <div v-if="state.lastError">
      <Message severity="error">
        {{ $t("new_account_pass.last_error") }}: {{ state.lastError }}
      </Message>
    </div>
    <p>
      {{ $t("arc76account.description") }}
    </p>
    <p>
      {{ $t("arc76account.description2") }}
    </p>
    <Message severity="error" v-if="!state.savePassword">
      {{ $t("arc76account.arc_draft") }}
    </Message>
    <div class="p-fluid">
      <div class="p-field mb-2">
        <label for="email">{{ $t("arc76account.email") }}</label>
        <InputText
          id="email"
          v-model="state.email"
          @keyup="checkEmailValidity"
        />
      </div>
      <div class="p-field mb-2">
        <label for="w">{{ $t("arc76account.select_password") }}</label>
        <Password
          :input-props="{ autocomplete: 'new-password' }"
          inputId="w"
          v-model="state.password"
          :feedback="false"
          :toggle-mask="true"
        />
      </div>
      <div class="p-field mb-2">
        <label>{{ $t("arc76account.save_password_switch") }}</label>
        <div>
          <InputSwitch class="my-2" v-model="state.savePassword" />
        </div>
      </div>

      <p v-if="!state.savePassword">
        {{ $t("arc76account.password_not_stored") }}
      </p>
      <Message severity="error" v-if="!state.savePassword">
        {{ $t("arc76account.gui_not_implemented") }}
      </Message>
      <div class="p-field mb-2">
        <label for="name">{{ $t("accounts.account_name") }}</label>
        <InputText id="name" v-model="state.name" />
      </div>
      <Button
        class="my-2"
        @click="createAccount"
        :disabled="!canCreatePassword"
      >
        {{ $t("newacc.create_account") }}
      </Button>
    </div>
  </MainLayout>
</template>
