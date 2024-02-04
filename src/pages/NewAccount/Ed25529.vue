<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import algosdk from "algosdk";
import QRCodeVue3 from "qrcode-vue3";

const state = reactive({
  lastError: "",
  page: "newaccount",
  w: "",
  a: "",
  showQR: false,
  guess: "",
  challenge: false,
  r: 1,
  s: false,
  addr: "",
  name: "",
});

const reset = async () => {
  state.name = "";
  state.lastError = "";
  state.showQR = false;
  state.guess = "";
  state.r = 1;
  state.page = "newaccount";
  state.s = false;
  state.w = "";
  state.addr = "";

  await store.dispatch("wallet/prolong");
  router.push({ name: "Accounts" });
};

const { t } = useI18n(); // use as global scope

const store = useStore();
const router = useRouter();

const createAccount = async () => {
  try {
    state.page = "newaccount";
    let account = algosdk.generateAccount();
    state.a = account.addr;
    state.w = algosdk.secretKeyToMnemonic(account.sk);
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to create account", error, err);
    await store.dispatch("toast/openError", error);
  }
};

const makeRandom = () => {
  state.guess = "";
  state.challenge = true;
  //this.r = Math.floor(Math.random() * 25) + 1;
  state.r = 1;
};

async function confirmCreate() {
  try {
    const words = state.w.split(" ");
    if (words[state.r - 1] == state.guess.trim()) {
      await store.dispatch("wallet/addPrivateAccount", {
        mn: state.w,
        name: state.name,
      });
      router.push({ name: "Accounts" });
    } else {
      await store.dispatch("toast/openError", "Invalid word");
    }

    router.push({ name: "Accounts" });
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to create account", error, err);
    await store.dispatch("toast/openError", error);
  }
}
onMounted(async () => {
  await store.dispatch("wallet/prolong");
  await createAccount();
});
</script>
<template>
  <MainLayout>
    <h1>{{ $t("newacc.create_basic") }}</h1>
    <div v-if="state.challenge">
      <div class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0">
          New account challange
        </label>
        <div class="col-12 md:col-10">
          {{ state.addr }}
        </div>
      </div>
      <div class="field grid">
        <label for="guess" class="col-12 mb-2 md:col-2 md:mb-0">
          {{ $t("newacc.position_question") }} {{ state.r }}?
        </label>
        <div class="col-12 md:col-10">
          <InputText id="guess" v-model="state.guess" class="w-full" />
        </div>
      </div>
      <div class="field grid">
        <label for="name" class="col-12 mb-2 md:col-2 md:mb-0">
          {{ $t("newacc.name") }}
        </label>
        <div class="col-12 md:col-10">
          <InputText id="name" v-model="state.name" class="w-full" />
        </div>
      </div>
      <div class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
        <div class="col-12 md:col-10">
          <Button class="m-1" @click="confirmCreate">
            {{ $t("newacc.create_account") }}
          </Button>
          <Button class="m-1" @click="state.challenge = false">
            {{ $t("global.go_back") }}
          </Button>
        </div>
      </div>
    </div>
    <div v-if="!state.challenge && state.page == 'newaccount'">
      <p>
        {{ $t("newacc.create_account_help") }}
      </p>
      <p>
        {{ $t("newacc.mnemonic_help") }}
      </p>
      <Password
        v-model="state.w"
        inputClass="w-full my-1 w-100"
        class="w-full"
        :feedback="false"
        :toggle-mask="true"
      />
      <InputText v-model="state.a" class="w-full my-1" disabled />
      <Button
        severity="secondary"
        v-if="!state.showQR"
        @click="state.showQR = true"
        class="m-1"
      >
        {{ $t("newacc.show_qr_code") }}
      </Button>
      <QRCodeVue3
        v-if="state.showQR"
        :width="500"
        :height="500"
        :value="state.w"
        :corners-square-options="{ type: 'square', color: '#333' }"
        :corners-dot-options="{
          type: 'square',
          color: '#333',
          gradient: {
            type: 'linear',
            rotation: 0,
            colorStops: [
              { offset: 0, color: '#333' },
              { offset: 1, color: '#000' },
            ],
          },
        }"
        :dots-options="{
          type: 'square',
          color: '#333',
          gradient: {
            type: 'linear',
            rotation: 0,
            colorStops: [
              { offset: 0, color: '#333' },
              { offset: 1, color: '#000' },
            ],
          },
        }"
      />

      <Button class="m-1" @click="makeRandom">
        {{ $t("newacc.start_challenge") }}
      </Button>
      <Button severity="secondary" class="m-1" @click="createAccount">
        {{ $t("newacc.create_new") }}
      </Button>
      <Button severity="secondary" class="m-1" @click="reset">
        {{ $t("newacc.drop_phrase") }}
      </Button>
    </div>
  </MainLayout>
</template>
