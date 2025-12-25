<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { onMounted, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { RootState } from "@/store";
import algosdk from "algosdk";
import QRCodeVue3 from "qrcode-vue3";

import Worker from "../../workers/vanity.ts?worker";
import moment from "moment";

type VanityPage = "vanity" | "newaccount";

interface VanityWorkerAccount {
  addr?: string;
  sk?: Uint8Array | number[];
}

type VanityWorkerMessage = VanityWorkerAccount | number;

interface VanityState {
  lastError: string;
  addr: string;
  name: string;
  page: VanityPage;
  w: string;
  a: string;
  showQR: boolean;
  guess: string;
  challenge: boolean;
  r: number;
  vanityStart: string;
  vanityMid: string;
  vanityEnd: string;
  vanityRunning: boolean;
  vanityCount: number;
  vanityThreads: Worker[];
  vanityWorkers: number;
  vanityStarted: moment.Moment;
  vanityTime: string;
  vanityRPS: number;
}

const store = useStore<RootState>();
const router = useRouter();
const { t } = useI18n();

const state = reactive<VanityState>({
  lastError: "",
  addr: "",
  name: "",
  page: "vanity",
  w: "",
  a: "",
  showQR: false,
  guess: "",
  challenge: false,
  r: 1,
  vanityStart: "",
  vanityMid: "",
  vanityEnd: "",
  vanityRunning: false,
  vanityCount: 0,
  vanityThreads: [],
  vanityWorkers: 8,
  vanityStarted: moment(),
  vanityTime: "",
  vanityRPS: 0,
});

const reset = async () => {
  state.name = "";
  state.lastError = "";
  state.showQR = false;
  state.guess = "";
  state.r = 1;
  state.page = "vanity";
  state.w = "";
  state.addr = "";

  state.vanityRunning = false;
  state.vanityCount = 0;
  state.vanityStarted = moment();

  await store.dispatch("wallet/prolong");
  router.push({ name: "Accounts" });
};

const createAccount = async () => {
  try {
    state.page = "newaccount";
    let account = algosdk.generateAccount();
    state.a = account.addr.toString();
    state.w = algosdk.secretKeyToMnemonic(account.sk);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
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
      if (
        await store.dispatch("wallet/addPrivateAccount", {
          mn: state.w,
          name: state.name,
        })
      ) {
        router.push({ name: "Accounts" });
      }
    } else {
      await store.dispatch("toast/openError", "Invalid word");
    }

    router.push({ name: "Accounts" });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("failed to create account", error, err);
    await store.dispatch("toast/openError", error);
  }
}
onMounted(async () => {
  await store.dispatch("wallet/prolong");
});
const createVanityStopClick = async () => {
  state.vanityRunning = false;

  for (const worker of state.vanityThreads) {
    worker.terminate();
  }
};

const createVanityStartClick = async () => {
  try {
    state.vanityCount = 0;
    state.vanityRunning = true;
    state.vanityStarted = moment();
    for (const worker of state.vanityThreads) {
      worker.terminate();
    }
    state.vanityThreads = [];
    for (let i = 0; i < state.vanityWorkers; i++) {
      const worker = new Worker();

      worker.addEventListener(
        "message",
        async (e: MessageEvent<VanityWorkerMessage>) => {
          const payload = e.data;
          if (
            payload &&
            typeof payload === "object" &&
            "addr" in payload &&
            payload.addr
          ) {
            state.vanityRunning = false;
            state.a = payload.addr;
            const secretKey =
              payload.sk instanceof Uint8Array
                ? payload.sk
                : new Uint8Array(payload.sk ?? []);
            state.w = algosdk.secretKeyToMnemonic(secretKey);
          } else {
            state.vanityCount += typeof payload === "number" ? payload : 0;
          }

          if (state.vanityRunning) {
            worker.postMessage({
              vanityStart: state.vanityStart,
              vanityMid: state.vanityMid,
              vanityEnd: state.vanityEnd,
            });
            await store.dispatch("wallet/prolong");
          } else {
            for (const workerInstance of state.vanityThreads) {
              workerInstance.terminate();
            }
          }
          const duration = moment.duration(moment().diff(state.vanityStarted));
          const miliseconds = parseInt(duration.valueOf().toString());
          state.vanityTime = moment.utc(miliseconds).format("HH:mm:ss");

          state.vanityRPS =
            miliseconds > 0
              ? Math.round((state.vanityCount / miliseconds) * 1000000) / 1000
              : 0;
          //.subtract(moment(this.vanityStarted))
        }
      );
      worker.postMessage({
        vanityStart: state.vanityStart,
        vanityMid: state.vanityMid,
        vanityEnd: state.vanityEnd,
      });
      state.vanityThreads.push(worker);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("failed to create account", error, err);
    await store.dispatch("toast/openError", error);
  }
};

const useVanityStartClick = () => {
  state.page = "newaccount";
};
</script>
<template>
  <MainLayout>
    <h1>{{ t("newacc.create_vanity") }}</h1>

    <Card>
      <template #content>
        <div v-if="state.page == 'vanity'">
          <div class="field grid">
            <label for="startsWith" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ t("newacc.vanity_start") }}
            </label>
            <div class="col-12 md:col-10">
              <InputText
                id="startsWith"
                v-model="state.vanityStart"
                class="w-full"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="contains" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ t("newacc.vanity_mid") }}
            </label>
            <div class="col-12 md:col-10">
              <InputText
                id="contains"
                v-model="state.vanityMid"
                class="w-full"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="endsWith" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ t("newacc.vanity_end") }}
            </label>
            <div class="col-12 md:col-10">
              <InputText
                id="endsWith"
                v-model="state.vanityEnd"
                class="w-full"
              />
            </div>
          </div>
          <div class="field grid">
            <label for="workersCount" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ t("newacc.vanity_workers") }}
            </label>
            <div class="col-12 md:col-10">
              <InputNumber
                showButtons
                inputId="workersCount"
                v-model="state.vanityWorkers"
                class="w-full"
                inputClass="w-full"
                :min="1"
                :max="100"
                :step="1"
              />
            </div>
          </div>
          <div class="field grid" v-if="state.vanityCount">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
              {{ t("newacc.vanity_count") }} {{ state.vanityCount }}
              {{ state.vanityTime }} ({{ state.vanityRPS }}/s)
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
              <Message severity="success" v-if="state.a" :closable="false">
                {{ state.a }}
              </Message>
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
              <Button
                v-if="!state.vanityRunning && state.a"
                class="my-1"
                @click="useVanityStartClick"
              >
                {{ t("newacc.vanity_use") }}
              </Button>
              <Button
                v-if="!state.vanityRunning"
                class="my-1 ml-1"
                :severity="state.a ? 'secondary' : 'primary'"
                @click="createVanityStartClick"
              >
                {{ t("newacc.vanity_button_start") }}
              </Button>
              <Button
                v-if="state.vanityRunning"
                class="my-1 ml-1"
                @click="createVanityStopClick"
              >
                {{ t("newacc.vanity_button_stop") }}
              </Button>
              <Button severity="secondary" class="m-1" @click="reset">
                {{ t("global.go_back") }}
              </Button>
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
              <Message
                severity="warn"
                v-if="state.vanityRunning"
                :closable="false"
              >
                Vanity search is in progress
              </Message>
            </div>
          </div>
        </div>
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
              {{ t("newacc.position_question") }} {{ state.r }}?
            </label>
            <div class="col-12 md:col-10">
              <InputText id="guess" v-model="state.guess" class="w-full" />
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

          <Button class="m-1" @click="makeRandom">
            {{ t("newacc.start_challenge") }}
          </Button>
          <Button severity="secondary" class="m-1" @click="createAccount">
            {{ t("newacc.create_new") }}
          </Button>
          <Button severity="secondary" class="m-1" @click="reset">
            {{ t("newacc.drop_phrase") }}
          </Button>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>
