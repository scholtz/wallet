<template>
  <main-layout>
    <h1>
      {{ $t("receive.title") }} <span v-if="account">{{ account.name }}</span>
    </h1>

    <Card>
      <template #content>
        <div class="field grid">
          <label for="paynote" class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("receive.note")
          }}</label>
          <div class="col-12 md:col-10">
            <InputText id="paynote" v-model="paynote" class="w-full" />
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <div class="flex align-items-center">
              <Checkbox itemId="paynoteB64" v-model="paynoteB64" binary />
              <label class="form-check-label" for="paynoteB64">
                {{ $t("pay.note_is_b64") }}
              </label>
            </div>
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <Checkbox itemId="noteeditable" v-model="noteeditable" binary />
            <label class="form-check-label" for="noteeditable">
              {{ $t("receive.noteeditable") }}
            </label>
          </div>
        </div>
        <div class="field grid">
          <label for="asset" class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("pay.asset")
          }}</label>
          <div class="col-12 md:col-10">
            <Dropdown
              id="asset"
              :options="assets"
              option-value="assetId"
              option-label="name"
              v-model="asset"
              class="w-full"
            >
              <template #option="slotProps">
                <div v-if="slotProps.option" class="flex align-items-center">
                  <div>
                    {{ slotProps.option.name }} ({{ slotProps.option.assetId }})
                  </div>
                </div>
              </template>
            </Dropdown>
          </div>
        </div>
        <div class="field grid">
          <label for="payamount" class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("receive.amount")
          }}</label>
          <div class="col-12 md:col-10">
            <InputGroup>
              <InputNumber
                inputId="payamount"
                v-model="payamount"
                type="number"
                :min="0.000001"
                :max="999999999"
                :step="0.000001"
                :maxFractionDigits="6"
                class="w-full"
              />
              <InputGroupAddon>{{ assetName }}</InputGroupAddon>
            </InputGroup>
          </div>
        </div>
        <div class="field grid">
          <label for="decimals" class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("receive.decimals")
          }}</label>
          <div class="col-12 md:col-10">
            <InputNumber
              inputId="decimals"
              v-model="decimals"
              disabled
              type="number"
              :min="0"
              :max="18"
              :step="1"
              class="w-full"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="payto" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ $t("receive.address") }}:
            <b>{{ account?.name || "" }}</b>
          </label>
          <div class="col-12 md:col-10">
            <InputText
              v-if="account"
              id="payto"
              v-model="account.addr"
              class="w-full"
              disabled
            />
          </div>
        </div>
        <div class="field grid">
          <label for="label" class="col-12 mb-2 md:col-2 md:mb-0">{{
            $t("receive.label")
          }}</label>
          <div class="col-12 md:col-10">
            <InputText id="label" v-model="label" class="w-full my-2" />
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <QRCodeVue3
              :width="400"
              :height="400"
              :value="qrcode"
              :qr-options="{ errorCorrectionLevel: 'H' }"
              image="/img/algorand-algo-logo-96.png"
            />
          </div>
        </div>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <code>{{ qrcode }}</code>
          </div>
        </div>
      </template>
    </Card>
  </main-layout>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import QRCodeVue3 from "qrcode-vue3";
import MainLayout from "../layouts/Main.vue";
import { useStore } from "../store";
import type { StoredAsset } from "../store/indexer";
import type { WalletAccount, IAccountData } from "../store/wallet";

type AssetOption = {
  assetId: bigint;
  amount?: number | bigint;
  name?: string;
  decimals?: number;
  unitName?: string;
};

type AssetDetails = {
  assetId: bigint;
  name?: string;
  decimals: number;
};

const store = useStore();
const route = useRoute();

const payamount = ref(0);
const paynote = ref("");
const paynoteB64 = ref(false);
const decimals = ref(0);
const label = ref("");
const noteeditable = ref(true);
const assets = ref<AssetOption[]>([]);
const assetObj = ref<AssetDetails>({
  assetId: 0n,
  name: store.state.config.tokenSymbol as string,
  decimals: 6,
});
const asset = ref<bigint | number>(0);

const account = computed<WalletAccount | undefined>(() =>
  store.state.wallet.privateAccounts.find(
    (walletAccount) => walletAccount.addr === (route.params.account as string)
  )
);

const accountData = computed<IAccountData | undefined>(() => {
  const currentAccount = account.value;
  if (!currentAccount?.data) {
    return undefined;
  }
  return currentAccount.data[store.state.config.env];
});

const hasPositiveAmount = (value?: number | bigint): boolean => {
  if (typeof value === "bigint") {
    return value > 0n;
  }
  if (typeof value === "number") {
    return value > 0;
  }
  return false;
};

const qrcode = computed(() => {
  const currentAccount = account.value;
  if (!currentAccount) return "";
  let ret = `algorand://${currentAccount.addr}`;
  if (
    payamount.value > 0 ||
    paynoteB64.value ||
    paynote.value ||
    label.value ||
    asset.value
  ) {
    ret += "?";
  }
  if (payamount.value > 0) {
    if (decimals.value > 0) {
      ret +=
        "&amount=" + Math.round(payamount.value * Math.pow(10, decimals.value));
    } else {
      ret += "&amount=" + payamount.value;
    }
  }
  if (paynoteB64.value) {
    ret += "&noteB64=1";
  }
  if (paynote.value && noteeditable.value) {
    ret += "&note=" + paynote.value;
  }
  if (paynote.value && !noteeditable.value) {
    ret += "&xnote=" + paynote.value;
  }
  if (label.value) {
    ret += "&label=" + label.value;
  }
  if (asset.value && Number(asset.value) > 0) {
    ret += "&asset=" + asset.value;
  }
  return ret;
});

const assetName = computed(() => {
  const selected = assets.value.find((option) => {
    try {
      return BigInt(option.assetId) === BigInt(asset.value ?? 0);
    } catch {
      return false;
    }
  });
  return selected?.name ?? "Algo";
});

const makeAssets = async () => {
  assets.value = [];
  const data = accountData.value;
  if (!data) return;

  if (hasPositiveAmount(data.amount)) {
    assets.value.push({
      assetId: 0n,
      amount: data.amount,
      name: store.state.config.tokenSymbol as string,
      decimals: 6,
      unitName: "",
    });
  }

  if (Array.isArray(data.assets)) {
    for (const accountAsset of data.assets) {
      if (!accountAsset?.assetId) continue;
      const resolved = (await store.dispatch("indexer/getAsset", {
        assetIndex: accountAsset.assetId,
      })) as StoredAsset | undefined;
      if (resolved) {
        assets.value.push({
          assetId: accountAsset.assetId,
          amount: accountAsset.amount,
          name: resolved.name,
          decimals: resolved.decimals,
          unitName: resolved.unitName ?? "",
        });
      }
    }
  }
};

const loadSelectedAsset = async () => {
  if (!asset.value) {
    assetObj.value = {
      assetId: 0n,
      name: store.state.config.tokenSymbol as string,
      decimals: 6,
    };
    decimals.value = assetObj.value.decimals;
    return;
  }

  try {
    const resolved = (await store.dispatch("indexer/getAsset", {
      assetIndex: asset.value,
    })) as StoredAsset | undefined;
    if (resolved) {
      assetObj.value = {
        assetId: resolved.assetId,
        name: resolved.name ?? store.state.config.tokenSymbol,
        decimals: resolved.decimals ?? 0,
      };
      decimals.value = assetObj.value.decimals;
    } else {
      decimals.value = 0;
    }
  } catch (err) {
    console.error("loadSelectedAsset", err);
  }
};

const _arrayBufferToBase64 = (buffer: Uint8Array) => {
  let binary = "";
  const bytes = buffer;
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const _base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

watch(account, () => {
  void makeAssets();
});

watch(asset, () => {
  void loadSelectedAsset();
});

onMounted(() => {
  void makeAssets();
  void loadSelectedAsset();
});
</script>
