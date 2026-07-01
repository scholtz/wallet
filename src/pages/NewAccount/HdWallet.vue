<script setup lang="ts">
import MainLayout from "../../layouts/Main.vue";
import { computed, onMounted, reactive } from "vue";
import { useI18n } from "vue-i18n";
import Password from "primevue/password";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import InputSwitch from "primevue/inputswitch";
import { QrcodeStream } from "qrcode-reader-vue3";
import QRCodeVue3 from "qrcode-vue3";
import copy from "copy-to-clipboard";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { RootState } from "@/store";
import {
  generateHdMnemonic,
  isValidHdMnemonic,
} from "@/scripts/encoding/hdWallet";

type HdWalletMode = "create" | "import";

interface HdWalletState {
  mode: HdWalletMode;
  mnemonic: string;
  name: string;
  accountIndex: number;
  confirmedBackup: boolean;
  showQR: boolean;
  scanMnemonic: boolean;
  lastError: string;
  cardFliped: boolean[];
  cardFlipedBefore: boolean[];
}

const WORDS_PER_CARD = 6;

const { t } = useI18n();
const store = useStore<RootState>();
const router = useRouter();

const state = reactive<HdWalletState>({
  mode: "create",
  mnemonic: "",
  name: "",
  accountIndex: 0,
  confirmedBackup: false,
  showQR: false,
  scanMnemonic: false,
  lastError: "",
  cardFliped: [],
  cardFlipedBefore: [],
});

const words = computed(() => state.mnemonic.trim().split(/\s+/).filter(Boolean));

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
  () => words.value.length > 0 && isValidHdMnemonic(state.mnemonic)
);

const canCreate = computed(() => {
  if (!state.name || !mnemonicIsValid.value) {
    return false;
  }
  return state.mode === "import" || state.confirmedBackup;
});

function resetCards() {
  const groupCount = Math.ceil(words.value.length / WORDS_PER_CARD);
  state.cardFliped = new Array(groupCount).fill(false);
  state.cardFlipedBefore = new Array(groupCount).fill(false);
}

function setMode(mode: HdWalletMode) {
  state.mode = mode;
  state.confirmedBackup = false;
  state.lastError = "";
  if (mode === "create") {
    state.mnemonic = generateHdMnemonic();
  } else {
    state.mnemonic = "";
  }
  resetCards();
}

async function copyToClipboard() {
  if (copy(state.mnemonic)) {
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
    const addr = await store.dispatch("wallet/addHdWalletAccount", {
      name: state.name,
      mnemonic: state.mode === "import" ? state.mnemonic : undefined,
      accountIndex: state.accountIndex,
    });
    router.push("/account/" + addr);
  } catch (err: any) {
    state.lastError = err.message ?? err;
    console.error("failed to create hd wallet account", err);
  }
}

onMounted(async () => {
  await store.dispatch("wallet/prolong");
  state.mnemonic = generateHdMnemonic();
  resetCards();
});
</script>
<template>
  <MainLayout>
    <h1>{{ t("hdaccount.title") }}</h1>

    <Card>
      <template #content>
        <div v-if="state.lastError">
          <Message severity="error">
            {{ t("new_account_pass.last_error") }}: {{ state.lastError }}
          </Message>
        </div>
        <p>{{ t("hdaccount.description") }}</p>

        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t("hdaccount.mode") }}
          </label>
          <div class="col-12 md:col-10">
            <Button
              class="m-1"
              :severity="state.mode == 'create' ? 'primary' : 'secondary'"
              @click="setMode('create')"
            >
              {{ t("hdaccount.mode_create") }}
            </Button>
            <Button
              class="m-1"
              :severity="state.mode == 'import' ? 'primary' : 'secondary'"
              @click="setMode('import')"
            >
              {{ t("hdaccount.mode_import") }}
            </Button>
          </div>
        </div>

        <div v-if="state.mode == 'create'">
          <Message severity="warn">
            {{ t("hdaccount.backup_warning") }}
          </Message>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0">
              {{ t("hdaccount.master_mnemonic") }}
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
              {{ t("hdaccount.confirm_backup") }}
            </label>
            <div class="col-12 md:col-10">
              <InputSwitch
                inputId="confirmedBackup"
                v-model="state.confirmedBackup"
              />
            </div>
          </div>
        </div>

        <div v-else class="grid">
          <div :class="state.scanMnemonic ? 'col-8' : 'col-12'">
            <div class="field grid">
              <label for="mn" class="col-12 mb-2 md:col-2 md:mb-0">
                {{ t("hdaccount.write_mnemonic") }}
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
          <div v-if="state.scanMnemonic" class="col-4">
            <QrcodeStream @decode="onDecodeQRMnemonic" />
          </div>
        </div>

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
            <p>{{ t("hdaccount.account_index_help") }}</p>
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
              id="create_hd_account"
            >
              {{ t("newacc.create_account") }}
            </Button>
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>
