<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { onMounted, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import algosdk from "algosdk";
import QRCodeVue3 from "qrcode-vue3";
import { RootState } from "@/store";

const state = reactive({
  lastError: "",
  page: "newaccount",
  w: "",
  words: [] as string[],
  a: "",
  showQR: false,
  guess: "",
  challenge: false,
  r: 1,
  s: false,
  addr: "",
  name: "",
  card1Fliped: false,
  card2Fliped: false,
  card3Fliped: false,
  card4Fliped: false,
  card5Fliped: false,
  card1FlipedBefore: false,
  card2FlipedBefore: false,
  card3FlipedBefore: false,
  card4FlipedBefore: false,
  card5FlipedBefore: false,
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

const store = useStore<RootState>();
const router = useRouter();

const createAccount = async () => {
  try {
    state.page = "newaccount";
    let account = algosdk.generateAccount();
    state.a = account.addr.toString();
    state.w = algosdk.secretKeyToMnemonic(account.sk);
    state.words = state.w.split(" ");
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to create account", error, err);
    await store.dispatch("toast/openError", error);
  }
};

const makeRandom = () => {
  state.guess = "";
  state.challenge = true;
  state.r = Math.floor(Math.random() * 25) + 1;
  //state.r = 1;
};

async function skipChallange() {
  try {
    if (
      await store.dispatch("wallet/addPrivateAccount", {
        mn: state.w,
        name: state.name,
      })
    ) {
      router.push("/account/" + state.a);
    }
  } catch (err: any) {
    const error = err.message ?? err;
    console.error("failed to create account", error, err);
    await store.dispatch("toast/openError", error);
  }
}

async function confirmCreate() {
  try {
    if (state.words[state.r - 1] == state.guess.trim()) {
      if (
        await store.dispatch("wallet/addPrivateAccount", {
          mn: state.w,
          name: state.name,
        })
      ) {
        router.push("/account/" + state.a);
      }
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
    <h1>{{ t("newacc.create_basic") }}</h1>

    <Card>
      <template #content>
        <div v-if="state.challenge">
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0">
              {{ t("newacc.new_account_challange") }}
            </label>
            <div class="col-12 md:col-10">
              {{ state.addr }}
            </div>
          </div>
          <div class="field grid">
            <label for="guess" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ t("newacc.position_question") }} {{ state.r }}?
            </label>
            <div class="col-12 md:col-10">
              <InputText id="guess" v-model="state.guess" class="w-full" />
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
              <Button class="m-1" @click="confirmCreate">
                {{ t("newacc.create_account") }}
              </Button>
              <Button class="m-1" @click="state.challenge = false">
                {{ t("global.go_back") }}
              </Button>
            </div>
          </div>
        </div>
        <div v-if="!state.challenge && state.page == 'newaccount'">
          <p>
            {{ t("newacc.create_account_help") }}
          </p>
          <p>
            {{ t("newacc.mnemonic_help") }}
          </p>
          <div class="field grid">
            <label for="name" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ t("new_account_shamir.mnemonic") }}
            </label>
            <div class="col-12 md:col-10">
              <Password
                v-model="state.w"
                inputClass="w-full my-1 w-100"
                class="w-full"
                :feedback="false"
                :toggle-mask="true"
              />
              <div class="grid mt-2">
                <div class="col">
                  <Button
                    class="w-full h-10rem m-2 text-left"
                    :severity="
                      !state.card1FlipedBefore ? 'primary' : 'secondary'
                    "
                    @click="
                      state.card1Fliped = !state.card1Fliped;
                      state.card1FlipedBefore = true;
                    "
                  >
                    <div v-if="!state.card1Fliped">
                      {{ t("newacc.click_to_show_positions") }} 1
                      {{ t("newacc.to") }} 5
                    </div>
                    <div v-else>
                      <div>1: {{ state.words[0] }}</div>
                      <div>2: {{ state.words[1] }}</div>
                      <div>3: {{ state.words[2] }}</div>
                      <div>4: {{ state.words[3] }}</div>
                      <div>5: {{ state.words[4] }}</div>
                    </div>
                  </Button>
                </div>
                <div class="col">
                  <Button
                    class="w-full h-10rem m-2 text-left"
                    :severity="
                      !state.card2FlipedBefore ? 'primary' : 'secondary'
                    "
                    @click="
                      state.card2Fliped = !state.card2Fliped;
                      state.card2FlipedBefore = true;
                    "
                  >
                    <div v-if="!state.card2Fliped">
                      {{ t("newacc.click_to_show_positions") }} 6
                      {{ t("newacc.to") }} 10
                    </div>
                    <div v-else>
                      <div>6: {{ state.words[5] }}</div>
                      <div>7: {{ state.words[6] }}</div>
                      <div>8: {{ state.words[7] }}</div>
                      <div>9: {{ state.words[8] }}</div>
                      <div>10: {{ state.words[9] }}</div>
                    </div>
                  </Button>
                </div>
                <div class="col">
                  <Button
                    class="w-full h-10rem m-2 text-left"
                    :severity="
                      !state.card3FlipedBefore ? 'primary' : 'secondary'
                    "
                    @click="
                      state.card3Fliped = !state.card3Fliped;
                      state.card3FlipedBefore = true;
                    "
                  >
                    <div v-if="!state.card3Fliped">
                      {{ t("newacc.click_to_show_positions") }} 11
                      {{ t("newacc.to") }} 15
                    </div>
                    <div v-else>
                      <div>11: {{ state.words[10] }}</div>
                      <div>12: {{ state.words[11] }}</div>
                      <div>13: {{ state.words[12] }}</div>
                      <div>14: {{ state.words[13] }}</div>
                      <div>15: {{ state.words[14] }}</div>
                    </div>
                  </Button>
                </div>
                <div class="col">
                  <Button
                    class="w-full h-10rem m-2 text-left"
                    :severity="
                      !state.card4FlipedBefore ? 'primary' : 'secondary'
                    "
                    @click="
                      state.card4Fliped = !state.card4Fliped;
                      state.card4FlipedBefore = true;
                    "
                  >
                    <div v-if="!state.card4Fliped">
                      {{ t("newacc.click_to_show_positions") }} 16
                      {{ t("newacc.to") }} 20
                    </div>
                    <div v-else>
                      <div>16: {{ state.words[15] }}</div>
                      <div>17: {{ state.words[16] }}</div>
                      <div>18: {{ state.words[17] }}</div>
                      <div>19: {{ state.words[18] }}</div>
                      <div>20: {{ state.words[19] }}</div>
                    </div>
                  </Button>
                </div>
                <div class="col">
                  <Button
                    class="w-full h-10rem m-2 text-left"
                    :severity="
                      !state.card5FlipedBefore ? 'primary' : 'secondary'
                    "
                    @click="
                      state.card5Fliped = !state.card5Fliped;
                      state.card5FlipedBefore = true;
                    "
                  >
                    <div v-if="!state.card5Fliped">
                      {{ t("newacc.click_to_show_positions") }} 21
                      {{ t("newacc.to") }} 25
                    </div>
                    <div v-else>
                      <div>21: {{ state.words[20] }}</div>
                      <div>22: {{ state.words[21] }}</div>
                      <div>23: {{ state.words[22] }}</div>
                      <div>24: {{ state.words[23] }}</div>
                      <div>25: {{ state.words[24] }}</div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div class="field grid">
            <label for="name" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ t("newacc.name") }}
            </label>
            <div class="col-12 md:col-10">
              <InputText id="name" v-model="state.name" class="w-full" />
            </div>
          </div>
          <InputText v-model="state.a" class="w-full my-1" disabled />
          <Button
            severity="secondary"
            v-if="!state.showQR"
            @click="state.showQR = true"
            class="m-1"
          >
            {{ t("newacc.show_qr_code") }}
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

          <Button
            class="m-1"
            @click="makeRandom"
            id="start_challenge"
            :disabled="!state.name"
          >
            {{ t("newacc.start_challenge") }}
          </Button>
          <Button
            class="m-1"
            severity="secondary"
            @click="skipChallange"
            id="skip_challange"
            :disabled="!state.name"
          >
            {{ t("newacc.skip_challange") }}
          </Button>
          <Button
            severity="secondary"
            class="m-1"
            @click="createAccount"
            id="create_new"
          >
            {{ t("newacc.create_new") }}
          </Button>
          <Button severity="secondary" class="m-1" @click="reset" id="reset">
            {{ t("newacc.drop_phrase") }}
          </Button>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>
