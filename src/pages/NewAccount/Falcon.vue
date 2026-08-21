<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { computed, onMounted, reactive } from "vue";
import { useI18n } from "vue-i18n";
import Password from "primevue/password";
import InputText from "primevue/inputtext";
import ToggleSwitch from "primevue/toggleswitch";
import { QrcodeStream } from "qrcode-reader-vue3";
import QRCodeVue3 from "qrcode-vue3";
import copy from "copy-to-clipboard";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { RootState } from "@/store";
import {
  generateFalconMnemonic,
  isValidFalconMnemonic,
} from "@/scripts/encoding/falcon";
import { getErrorMessage } from "@/scripts/errors";

type FalconMode = "create" | "import";

interface FalconState {
  mode: FalconMode;
  mnemonic: string;
  name: string;
  confirmedBackup: boolean;
  showQR: boolean;
  scanMnemonic: boolean;
  creating: boolean;
  lastError: string;
  cardFliped: boolean[];
  cardFlipedBefore: boolean[];
}

const WORDS_PER_CARD = 5;

const { t } = useI18n();
const store = useStore<RootState>();
const router = useRouter();

const state = reactive<FalconState>({
  mode: "create",
  mnemonic: "",
  name: "",
  confirmedBackup: false,
  showQR: false,
  scanMnemonic: false,
  creating: false,
  lastError: "",
  cardFliped: [],
  cardFlipedBefore: [],
});

const words = computed(() =>
  state.mnemonic.trim().split(/\s+/).filter(Boolean)
);

const wordGroups = computed(() => {
  const groups: string[][] = [];
  for (let i = 0; i < words.value.length; i += WORDS_PER_CARD) {
    groups.push(words.value.slice(i, i + WORDS_PER_CARD));
  }
  return groups;
});

function toggleCard(index: number) {
  state.cardFliped[index] = !state.cardFliped[index];
  state.cardFlipedBefore[index] = true;
}

const mnemonicIsValid = computed(
  () => words.value.length > 0 && isValidFalconMnemonic(state.mnemonic)
);

const canCreate = computed(() => {
  if (!state.name || !mnemonicIsValid.value || state.creating) {
    return false;
  }
  return state.mode === "import" || state.confirmedBackup;
});

function resetCards() {
  const groupCount = Math.ceil(words.value.length / WORDS_PER_CARD);
  state.cardFliped = new Array(groupCount).fill(false);
  state.cardFlipedBefore = new Array(groupCount).fill(false);
}

function setMode(mode: FalconMode) {
  state.mode = mode;
  state.confirmedBackup = false;
  state.lastError = "";
  if (mode === "create") {
    state.mnemonic = generateFalconMnemonic();
  } else {
    state.mnemonic = "";
  }
  resetCards();
}

async function copyToClipboard() {
  if (await copy(state.mnemonic)) {
    await store.dispatch("toast/openSuccess", "Mnemonic copied to clipboard");
  }
}

const onDecodeQRMnemonic = (result: string) => {
  if (result) {
    state.mnemonic = result;
  }
};

async function createAccount() {
  try {
    state.lastError = "";
    state.creating = true;
    const addr = await store.dispatch("wallet/addFalconAccount", {
      name: state.name,
      mnemonic: state.mnemonic,
      backedUp: state.mode === "import" ? true : state.confirmedBackup,
    });
    router.push("/account/" + addr);
  } catch (err: unknown) {
    state.lastError = getErrorMessage(err);
    console.error("failed to create falcon account", err);
  } finally {
    state.creating = false;
  }
}

onMounted(async () => {
  await store.dispatch("wallet/prolong");
  state.mnemonic = generateFalconMnemonic();
  resetCards();
});
</script>
<template>
  <MainLayout>
    <h1>{{ t("falconaccount.title") }}</h1>

    <Card>
      <template #content>
        <div v-if="state.lastError">
          <Message severity="error">
            {{ t("new_account_pass.last_error") }}: {{ state.lastError }}
          </Message>
        </div>
        <p>{{ t("falconaccount.description") }}</p>

        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("falconaccount.mode") }}
          </label>
          <div class="col-12 md:col-10">
            <Button
              class="m-1"
              :severity="state.mode == 'create' ? 'primary' : 'secondary'"
              @click="setMode('create')"
            >
              {{ t("falconaccount.mode_create") }}
            </Button>
            <Button
              class="m-1"
              :severity="state.mode == 'import' ? 'primary' : 'secondary'"
              @click="setMode('import')"
            >
              {{ t("falconaccount.mode_import") }}
            </Button>
          </div>
        </div>

        <div v-if="state.mode == 'create'">
          <Message severity="warn">
            {{ t("falconaccount.backup_warning") }}
          </Message>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0">
              {{ t("falconaccount.mnemonic") }}
            </label>
            <div class="col-12 md:col-10">
              <div class="grid mt-2">
                <div
                  class="col"
                  v-for="(group, groupIndex) in wordGroups"
                  :key="groupIndex"
                >
                  <Button
                    class="w-full h-10rem m-2 text-left"
                    :severity="
                      !state.cardFlipedBefore[groupIndex]
                        ? 'primary'
                        : 'secondary'
                    "
                    @click="toggleCard(groupIndex)"
                  >
                    <div v-if="!state.cardFliped[groupIndex]">
                      {{ t("newacc.click_to_show_positions") }}
                      {{ groupIndex * WORDS_PER_CARD + 1 }}
                      {{ t("newacc.to") }}
                      {{ groupIndex * WORDS_PER_CARD + group.length }}
                    </div>
                    <div v-else>
                      <div v-for="(word, wordIndex) in group" :key="wordIndex">
                        {{ groupIndex * WORDS_PER_CARD + wordIndex + 1 }}:
                        {{ word }}
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
              <Button
                severity="secondary"
                size="small"
                class="m-1"
                :title="t('account_export.toggle_qr')"
                @click="copyToClipboard"
              >
                <i class="pi pi-copy" />
              </Button>
              <Button
                severity="secondary"
                size="small"
                class="m-1"
                @click="state.showQR = !state.showQR"
              >
                {{ t("account_export.toggle_qr") }}
              </Button>
              <QRCodeVue3
                v-if="state.showQR"
                imgclass="qr-code"
                :width="400"
                :height="400"
                :value="state.mnemonic"
                :qr-options="{ errorCorrectionLevel: 'H' }"
                :key="state.mnemonic"
              />
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0" for="confirmedBackup">
              {{ t("falconaccount.confirm_backup") }}
            </label>
            <div class="col-12 md:col-10">
              <ToggleSwitch
                inputId="confirmedBackup"
                v-model="state.confirmedBackup"
              />
            </div>
          </div>
        </div>

        <div v-else class="grid">
          <div :class="state.scanMnemonic ? 'col-12 md:col-8' : 'col-12'">
            <div class="field grid">
              <label for="mn" class="col-12 mb-2 md:col-2 md:mb-0">
                {{ t("falconaccount.write_mnemonic") }}
              </label>
              <div class="col-12 md:col-10">
                <Password
                  inputId="mn"
                  v-model="state.mnemonic"
                  inputClass="w-full"
                  class="w-full"
                  :feedback="false"
                  toggleMask
                  autocomplete="off"
                />
              </div>
            </div>
            <div class="field grid">
              <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
              <div class="col-12 md:col-10">
                <Button
                  severity="secondary"
                  v-if="!state.scanMnemonic"
                  class="m-1"
                  @click="state.scanMnemonic = true"
                >
                  {{ t("newacc.scan") }}
                </Button>
                <Button
                  severity="secondary"
                  v-if="state.scanMnemonic"
                  class="m-1"
                  @click="state.scanMnemonic = false"
                >
                  {{ t("global.stop_camera") }}
                </Button>
              </div>
            </div>
          </div>
          <div v-if="state.scanMnemonic" class="col-12 md:col-4">
            <QrcodeStream @decode="onDecodeQRMnemonic" />
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
              @click="createAccount"
              :disabled="!canCreate"
              :loading="state.creating"
              id="create_falcon_account"
            >
              {{ t("newacc.create_account") }}
            </Button>
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>
