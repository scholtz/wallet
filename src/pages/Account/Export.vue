<script setup lang="ts">
import Button from "primevue/button";
import MainLayout from "../../layouts/Main.vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import { reactive } from "vue";
import { JsonViewer } from "vue3-json-viewer";
import { Shamir } from "@spliterati/shamir";
import type { uint8 } from "@spliterati/uint8";
import algosdk from "algosdk";
import { wordlist } from "@scure/bip39/wordlists/english";
import QRCodeVue3 from "qrcode-vue3";
import sha512 from "js-sha512";
import copy from "copy-to-clipboard";
import { RootState } from "@/store";
import { useI18n } from "vue-i18n";

interface AccountWithSecret {
  sk?: number[] | Uint8Array;
  [key: string]: unknown;
}

type ExportStep = "step1" | "mn" | "shamir" | "shamir2";

interface ExportState {
  json: AccountWithSecret | null;
  mn: string;
  sh: Uint8Array[];
  shIndex: number;
  qr: boolean;
  shamirMin: number;
  shamirCount: number;
  state: ExportStep;
  pwd: string;
  pwdChecked: boolean;
}

const { t } = useI18n();
const store = useStore<RootState>();
const route = useRoute();

const state = reactive<ExportState>({
  json: null,
  mn: "",
  sh: [],
  shIndex: -1,
  qr: false,
  shamirMin: 3,
  shamirCount: 5,
  state: "step1",
  pwd: "",
  pwdChecked: false,
});
const toUint8Array = (input: number[] | Uint8Array): Uint8Array => {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
};
const toUint8 = (value: number): uint8 => value as unknown as uint8;
function concatTypedArrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  // a, b TypedArray of same type
  //https://stackoverflow.com/questions/33702838/how-to-append-bytes-multi-bytes-and-buffer-to-arraybuffer-in-javascript
  const c = new Uint8Array(a.length + b.length);
  c.set(a, 0);
  c.set(b, a.length);
  return c;
}
const shamirBackup = async () => {
  try {
    await store.dispatch("wallet/prolong");
    state.json = (await store.dispatch("wallet/getAccount", {
      addr: route.params.account,
    })) as AccountWithSecret;
    if (!state.json?.sk) {
      throw new Error("Private key is not stored for this account");
    }

    const secret = toUint8Array(state.json.sk);
    const shares = Shamir.split(
      secret.subarray(0, 32), // in first 32 bytes is the secret
      toUint8(state.shamirCount),
      toUint8(state.shamirMin)
    );
    state.sh = shares;
    setShamirIndex(0);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("shamir err", error, err);
    await store.dispatch("toast/openError", error);
  }
};
function toUint11Array(buffer8: Uint8Array) {
  //https://github.com/algorand/js-algorand-sdk/blob/7965d1c194186e5c7b8a86756c546f2ec35291cd/src/mnemonic/mnemonic.ts#L12C1-L34C2
  const buffer11: number[] = [];
  let acc = 0;
  let accBits = 0;
  function add(octet: number) {
    acc |= octet << accBits;
    accBits += 8;
    if (accBits >= 11) {
      buffer11.push(acc & 0x7ff);
      acc >>= 11;
      accBits -= 11;
    }
  }
  function flush() {
    if (accBits) {
      buffer11.push(acc);
    }
  }

  buffer8.forEach(add);
  flush();
  return buffer11;
}
function genericHash(arr: Uint8Array) {
  return Uint8Array.from(sha512.sha512_256.array(arr));
}
function computeChecksum(seed: Uint8Array) {
  const hashBuffer = genericHash(seed);
  const uint11Hash = toUint11Array(hashBuffer);
  const words = applyWords(uint11Hash);

  return words[0];
}

function mnemonicFromSeed(seed: Uint8Array) {
  // https://github.com/algorand/js-algorand-sdk/blob/7965d1c194186e5c7b8a86756c546f2ec35291cd/src/mnemonic/mnemonic.ts#L54C17-L54C33
  const seedWithZero = concatTypedArrays(seed, new Uint8Array(1));
  const uint11Hash = toUint11Array(seedWithZero);
  const words = applyWords(uint11Hash);
  const checksumWord = computeChecksum(seed);

  return `${words.join(" ")} ${checksumWord}`;
}
function applyWords(nums: number[]) {
  return nums.map((n) => wordlist[n]);
}

const setShamirIndex = (index: number) => {
  const shard = state.sh.at(index);
  if (!shard) {
    return;
  }
  state.mn = mnemonicFromSeed(shard);
  state.shIndex = index;
  state.state = "shamir2";

  // const mn0Arr = concatTypedArrays(state.sh[index]);

  // var part1 = mn0Arr.subarray(0, 16); // 16 bytes
  // var part2 = mn0Arr.subarray(16, 48); // 24 bytes
  // const mn0_1 = entropyToMnemonic(part1, wordlist);
  // const mn0_2 = entropyToMnemonic(part2, wordlist);
  // const mn0_3 = entropyToMnemonic(part3, wordlist);
  // const mn0 = mn0_1 + " " + mn0_2 + " " + mn0_3;
  // state.mn = mn0;
  // state.shIndex = index;
  // state.state = "shamir2";
};
const algorandMnemonics = async () => {
  try {
    await store.dispatch("wallet/prolong");
    state.json = (await store.dispatch("wallet/getAccount", {
      addr: route.params.account,
    })) as AccountWithSecret;
    if (!state.json?.sk) {
      throw new Error("Private key is not stored for this account");
    }
    const secret = toUint8Array(state.json.sk);
    state.mn = algosdk.secretKeyToMnemonic(new Uint8Array(secret));
    state.shIndex = -1;
    state.state = "mn";
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("shamir err", error, err);
    await store.dispatch("toast/openError", error);
  }
};

const checkPwd = async () => {
  try {
    await store.dispatch("wallet/prolong");
    state.pwdChecked = await store.dispatch("wallet/checkPassword", {
      pass: state.pwd,
    });
    state.pwd = "";
    if (!state.pwdChecked) {
      await store.dispatch("toast/openError", "Wrong password");
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await store.dispatch("toast/openError", error);
  }
};

async function copyToClipboard(text: string) {
  if (copy(text)) {
    await store.dispatch("toast/openSuccess", "Mnemonics copied to clipboard");
  }
}
</script>

<template>
  <MainLayout>
    <h1>{{ t("account_export.header") }}</h1>
    <Card>
      <template #content>
        <p>{{ t("account_export.help") }}</p>
        <div v-if="!state.pwdChecked">
          <div class="field grid">
            <label for="pwd" class="col-12 mb-2 md:col-2 md:mb-0">
              {{ t("account_export.password") }}
            </label>
            <div class="col-12 md:col-10">
              <Password
                v-model="state.pwd"
                inputId="pwd"
                class="w-full"
                :feedback="false"
              ></Password>
            </div>
          </div>
          <div class="field grid">
            <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
            <div class="col-12 md:col-10">
              <Button @click="checkPwd">
                {{ t("account_export.continue") }}
              </Button>
            </div>
          </div>
        </div>
        <div v-else>
          <div class="grid">
            <div class="col">
              <Button
                class="m-2 w-100"
                :severity="state.state == 'step1' ? 'primary' : 'secondary'"
                @click="algorandMnemonics"
                >{{ t("account_export.algo_mnemonic") }}</Button
              >
              <Button
                class="m-2 w-100"
                :severity="state.state == 'step1' ? 'primary' : 'secondary'"
                @click="state.state = 'shamir'"
                >{{ t("account_export.shamir_backup") }}</Button
              >
            </div>
          </div>
          <div v-if="state.state == 'mn'">
            <Button
              class="m-2"
              @click="state.qr = !state.qr"
              severity="secondary"
              >{{ t("account_export.toggle_qr") }}</Button
            >
          </div>
          <div v-if="state.state == 'shamir' || state.state == 'shamir2'">
            <label for="shamirMin"
              >{{ t("account_export.recovery_threshold") }}:</label
            >
            <InputNumber
              inputId="shamirMin"
              class="m-2"
              v-model="state.shamirMin"
              :min="1"
              :max="100"
            ></InputNumber>
            <label for="shamirCount"
              >{{ t("account_export.number_of_mnemonics") }}:</label
            >
            <InputNumber
              inputId="shamirCount"
              class="m-2"
              v-model="state.shamirCount"
              :min="1"
              :max="100"
            ></InputNumber>
            <Button
              class="m-2"
              @click="shamirBackup"
              :severity="state.state == 'shamir' ? 'primary' : 'secondary'"
              >{{ t("account_export.generate_shamir") }}</Button
            >
          </div>
          <div v-if="state.state == 'shamir2'">
            <Button
              class="m-2"
              @click="state.qr = !state.qr"
              severity="secondary"
              >{{ t("account_export.toggle_qr") }}</Button
            >
            <Button
              class="m-2"
              v-if="state.sh && state.shIndex >= 0"
              :disabled="state.shIndex == 0"
              @click="setShamirIndex(state.shIndex - 1)"
              >{{ t("account_export.previous") }}</Button
            >
            <Button
              class="m-2"
              v-if="state.sh && state.shIndex >= 0"
              :disabled="state.shIndex == state.sh.length - 1"
              @click="setShamirIndex(state.shIndex + 1)"
              >{{ t("account_export.next") }}</Button
            >
          </div>
          <div v-if="state.mn" class="m-5">
            <div v-if="state.shIndex >= 0">
              {{ t("account_export.index") }} {{ state.shIndex + 1 }} /
              {{ state.sh.length }}
              <b>{{ t("account_export.shamir_help") }} </b>
            </div>
            <div v-else>
              <div>
                <b>{{ t("account_export.algo_help") }}</b>
              </div>
            </div>
            <Button
              severity="secondary"
              size="small"
              class="m-1"
              title="Copy mnemonic to clipboard"
              @click="copyToClipboard(state.mn)"
            >
              <i class="pi pi-copy" />
            </Button>
            <code>{{ state.mn }}</code>
          </div>
          <div v-if="state.qr" class="m-3">
            <QRCodeVue3
              :width="400"
              :height="400"
              :value="state.mn"
              :qr-options="{ errorCorrectionLevel: 'H' }"
              :key="state.mn"
            />
          </div>
          <div v-if="$store.state.config.dev && state.json">
            <h2>{{ t("account_export.dev_info") }}</h2>
            <JsonViewer :value="state.json" copyable boxed sort />
          </div>
        </div>
      </template>
    </Card>
  </MainLayout>
</template>
