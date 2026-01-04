<template>
  <MainLayout>
    <div class="w-full max-w-6 mb-4">
      <Button
        label="Back"
        icon="pi pi-arrow-left"
        text
        @click="$router.go(-1)"
      />
    </div>

    <div class="grid">
      <div class="col-12" v-if="transaction">
        <div
          class="flex flex-column md:flex-row md:align-items-center justify-content-between mb-4 gap-3"
        >
          <h1 class="m-0 text-3xl font-bold">{{ $t("transaction.title") }}</h1>
          <div class="flex align-items-center gap-2">
            <Badge
              :value="transaction.confirmedRound ? 'Confirmed' : 'Pending'"
              :severity="transaction.confirmedRound ? 'success' : 'warning'"
              size="large"
            />
            <span class="text-500">{{
              filters.formatDateTime(transaction.roundTime)
            }}</span>
          </div>
        </div>

        <!-- Main Summary Card -->
        <Card class="mb-4 shadow-2">
          <template #content>
            <div class="grid p-fluid align-items-center">
              <!-- Sender -->
              <div class="col-12 md:col-5 text-center md:text-left">
                <span
                  class="text-500 text-sm uppercase font-semibold block mb-2"
                  >{{ $t("transaction.sender") }}</span
                >
                <div
                  class="flex align-items-center justify-content-center md:justify-content-start gap-2"
                >
                  <Avatar
                    icon="pi pi-user"
                    shape="circle"
                    class="surface-200 text-700"
                  />
                  <div class="flex flex-column align-items-start">
                    <router-link
                      :to="'/account/' + transaction.sender"
                      class="text-primary font-bold no-underline hover:underline text-lg"
                    >
                      {{ formatAddress(transaction.sender) }}
                    </router-link>
                    <Button
                      icon="pi pi-copy"
                      class="p-0 h-2rem w-2rem"
                      text
                      rounded
                      v-tooltip="'Copy Address'"
                      @click="copyToClipboard(transaction.sender)"
                    />
                  </div>
                </div>
              </div>

              <!-- Direction Arrow & Amount -->
              <div
                class="col-12 md:col-2 flex flex-column align-items-center justify-content-center py-4 md:py-0"
              >
                <div v-if="amount" class="text-xl font-bold text-primary mb-2">
                  {{ amount }}
                </div>
                <div
                  class="surface-100 border-circle p-2 flex align-items-center justify-content-center"
                  style="width: 40px; height: 40px"
                >
                  <i
                    class="pi pi-arrow-right text-xl text-500 hidden md:block"
                  ></i>
                  <i class="pi pi-arrow-down text-xl text-500 md:hidden"></i>
                </div>
                <div class="mt-2 text-sm text-500 uppercase font-semibold">
                  {{ getTransactionTypeLabel(transaction.txType ?? "Unknown") }}
                </div>
              </div>

              <!-- Receiver -->
              <div class="col-12 md:col-5 text-center md:text-right">
                <span
                  class="text-500 text-sm uppercase font-semibold block mb-2"
                  >{{ $t("transaction.receiver") }}</span
                >
                <div
                  v-if="receiver"
                  class="flex align-items-center justify-content-center md:justify-content-end gap-2"
                >
                  <div class="flex flex-column align-items-end">
                    <router-link
                      :to="'/account/' + receiver"
                      class="text-primary font-bold no-underline hover:underline text-lg"
                    >
                      {{ formatAddress(receiver) }}
                    </router-link>
                    <Button
                      icon="pi pi-copy"
                      class="p-0 h-2rem w-2rem"
                      text
                      rounded
                      v-tooltip="'Copy Address'"
                      @click="copyToClipboard(receiver)"
                    />
                  </div>
                  <Avatar
                    icon="pi pi-wallet"
                    shape="circle"
                    class="surface-200 text-700"
                  />
                </div>
                <div v-else class="text-500 italic">N/A</div>
              </div>
            </div>

            <div class="surface-border border-top-1 my-3"></div>

            <!-- Key Stats -->
            <div class="grid text-center md:text-left">
              <div class="col-6 md:col-3">
                <div class="text-500 text-sm mb-1">
                  {{ $t("transaction.fee") }}
                </div>
                <div class="font-medium">
                  {{ filters.formatCurrency(transaction.fee) }}
                </div>
              </div>
              <div class="col-6 md:col-3">
                <div class="text-500 text-sm mb-1">
                  {{ $t("transaction.confirmed_round") }}
                </div>
                <div class="font-medium">
                  {{ transaction.confirmedRound }}
                </div>
              </div>
              <div class="col-12 md:col-6">
                <div class="text-500 text-sm mb-1">
                  {{ $t("transaction.tr_id") }}
                </div>
                <div
                  class="flex align-items-center justify-content-center md:justify-content-start gap-2"
                >
                  <span
                    class="font-mono text-sm text-overflow-ellipsis overflow-hidden white-space-nowrap"
                    style="max-width: 100%"
                    >{{ transaction.id }}</span
                  >
                  <Button
                    v-if="transaction?.id"
                    icon="pi pi-copy"
                    text
                    rounded
                    size="small"
                    @click="copyToClipboard(transaction.id)"
                  />
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Note Section -->
        <Panel
          v-if="transaction.note"
          :header="$t('transaction.note')"
          toggleable
          class="mb-4 shadow-2"
        >
          <div class="flex flex-column gap-3">
            <div v-if="decodedNote">
              <span class="text-500 text-sm block mb-1">{{
                $t("transaction.note_decoded")
              }}</span>
              <div
                class="p-3 surface-50 border-round font-mono text-900"
                style="word-break: break-all"
              >
                {{ decodedNote }}
              </div>
            </div>
            <div>
              <span class="text-500 text-sm block mb-1">{{
                $t("transaction.note_raw")
              }}</span>
              <div
                class="p-3 surface-50 border-round font-mono text-700 text-sm"
                style="word-break: break-all"
              >
                {{ rawNote }}
              </div>
            </div>
          </div>
        </Panel>

        <!-- Asset Config Section -->
        <Panel
          v-if="transaction.assetConfigTransaction"
          :header="$t('transaction.asset_name')"
          toggleable
          class="mb-4 shadow-2"
        >
          <div class="grid">
            <div
              class="col-12 md:col-6 lg:col-4"
              v-for="(value, key) in assetParams"
              :key="key"
            >
              <div class="mb-2">
                <span class="text-500 text-sm block capitalize">{{
                  (key as any).replace(/-/g, " ")
                }}</span>
                <span class="font-medium word-break-all">{{ value }}</span>
              </div>
            </div>
          </div>
        </Panel>

        <!-- Raw Data Accordion -->
        <Accordion class="shadow-2">
          <AccordionTab header="Raw Transaction Data">
            <JsonViewer
              :value="transaction"
              :expand-depth="1"
              copyable
              boxed
              sort
              theme="jv-light"
            />
          </AccordionTab>
        </Accordion>
      </div>
    </div>
  </MainLayout>
</template>

<script lang="ts" setup>
import {
  type ComponentPublicInstance,
  computed,
  getCurrentInstance,
  ref,
  watch,
} from "vue";
import { useStore } from "../store";
import MainLayout from "../layouts/Main.vue";
import type { StoredAsset } from "../store/indexer";
import copy from "copy-to-clipboard";
import { useToast } from "primevue/usetoast";
import algosdk from "algosdk";
import { Buffer } from "buffer";

type AssetViewModel = {
  assetId: bigint;
  name: string;
  decimals: number;
};

type Filters = {
  formatCurrencyBigInt: (
    value?: number | bigint,
    currency?: string,
    minimumFractionDigits?: number,
    multiply?: boolean,
    language?: string | string[]
  ) => string;
  formatCurrency: (
    value?: number | bigint,
    currency?: string,
    minimumFractionDigits?: number,
    multiply?: boolean,
    language?: string | string[]
  ) => string;
  formatDateTime: (
    value?: number,
    separator?: string,
    showSeconds?: boolean,
    locale?: string,
    alwaysShowDate?: boolean
  ) => string;
  formatPercent: (value?: number) => string;
};

const instance = getCurrentInstance();
const proxy = instance?.proxy as
  | (ComponentPublicInstance & { $filters?: Filters })
  | undefined;
if (!proxy?.$filters) {
  throw new Error("Global filters are not available");
}
const filters = proxy.$filters;
const toast = useToast();

const DEFAULT_ASSET: AssetViewModel = {
  assetId: 0n,
  name: "ALGO",
  decimals: 6,
};

const assetObj = ref<AssetViewModel>({ ...DEFAULT_ASSET });
const store = useStore();

const transaction = computed<algosdk.indexerModels.Transaction | undefined>(
  () => store.state.wallet.transaction
);

const resetAsset = () => {
  assetObj.value = { ...DEFAULT_ASSET };
};

const applyAssetResult = (asset?: StoredAsset) => {
  if (!asset) {
    resetAsset();
    return;
  }
  assetObj.value = {
    assetId: asset.assetId,
    name: asset.name ?? DEFAULT_ASSET.name,
    decimals: asset.decimals ?? DEFAULT_ASSET.decimals,
  };
};

const loadAsset = async () => {
  if (!transaction.value) {
    resetAsset();
    return;
  }
  const assetTransfer = transaction.value.assetTransferTransaction;
  const assetId = assetTransfer?.assetId;

  if (!assetId) {
    resetAsset();
    return;
  }

  try {
    const asset = (await store.dispatch("indexer/getAsset", {
      assetIndex: assetId,
    })) as StoredAsset | undefined;
    applyAssetResult(asset);
  } catch (error) {
    console.error("loadAsset", error);
    resetAsset();
  }
};

const isBase64 = (raw?: any): boolean => {
  if (!raw) return false;
  if (typeof raw !== "string") return false;
  const value = raw.trim();
  if (!value) return false;
  try {
    return btoa(atob(value)) === value;
  } catch {
    return false;
  }
};

const fromB64 = (value: string): string => atob(value);

const copyToClipboard = (text: string) => {
  copy(text);
  toast.add({
    severity: "info",
    summary: "Copied",
    detail: "Copied to clipboard",
    life: 2000,
  });
};

const formatAddress = (address: string) => {
  if (!address) return "";
  return (
    address.substring(0, 6) + "..." + address.substring(address.length - 6)
  );
};

const decodedNote = computed(() => {
  const note = transaction.value?.note;
  if (!note) return null;
  if (note instanceof Uint8Array) {
    return new TextDecoder().decode(note);
  }
  if (typeof note === "string" && isBase64(note)) {
    return fromB64(note);
  }
  return null;
});

const rawNote = computed(() => {
  const note = transaction.value?.note;
  if (!note) return null;
  if (note instanceof Uint8Array) {
    return Buffer.from(note).toString("base64");
  }
  return note;
});

const receiver = computed(() => {
  if (!transaction.value) return null;
  if (transaction.value.paymentTransaction)
    return transaction.value.paymentTransaction.receiver;
  if (transaction.value.assetTransferTransaction)
    return transaction.value.assetTransferTransaction.receiver;
  return null;
});

const amount = computed(() => {
  if (!transaction.value) return null;
  if (transaction.value.paymentTransaction) {
    return filters.formatCurrency(transaction.value.paymentTransaction.amount);
  }
  if (transaction.value.assetTransferTransaction) {
    return filters.formatCurrency(
      transaction.value.assetTransferTransaction.amount,
      assetObj.value.name,
      assetObj.value.decimals
    );
  }
  return null;
});

const assetParams = computed(() => {
  return transaction.value?.assetConfigTransaction?.params || {};
});

const getTransactionTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    pay: "Payment",
    axfer: "Asset Transfer",
    acfg: "Asset Configuration",
    afrz: "Asset Freeze",
    keyreg: "Key Registration",
    appl: "Application Call",
  };
  return types[type] || type?.toUpperCase() || "Unknown";
};

watch(
  transaction,
  () => {
    void loadAsset();
  },
  { immediate: true }
);
</script>
