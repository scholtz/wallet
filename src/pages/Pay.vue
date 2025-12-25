<template>
  <main-layout>
    <div v-if="!route.params.account">
      <h1>{{ t("pay.select_account_for_payment") }}</h1>

      <Card>
        <template #content>
          <SelectAccount v-model="payFromDirect" class="w-full"></SelectAccount>
        </template>
      </Card>
    </div>
    <div v-if="account">
      <form v-if="page == 'design'" @submit="previewPaymentClick">
        <h1 v-if="!isRekey">
          {{ t("pay.title") }} <span v-if="account">{{ account.name }}</span>
        </h1>
        <h1 v-if="isRekey">
          {{ t("pay.rekey_title") }}
          <span v-if="account">{{ account.name }}</span>
        </h1>

        <Card>
          <template #content>
            <Message severity="error" v-if="isRekey" class="my-2">
              {{ t("pay.rekey_warning") }}
            </Message>
            <p>{{ t("pay.selected_account") }}: {{ account.addr }}</p>
            <div v-if="isMultisig && !subpage">
              <h2>{{ t("pay.multisig_account") }}</h2>
              <Button class="my-2" @click="subpage = 'proposal'">
                {{ t("pay.create_proposal") }}
              </Button>
              <Button class="m-2" @click="subpage = 'sign'">
                {{ t("pay.sign_proposal") }}
              </Button>
            </div>
            <div v-if="subpage == 'sign'" class="grid">
              <div class="col-12">
                <div class="field grid">
                  <label
                    for="rawSignedTxnInput"
                    class="col-12 mb-2 md:col-2 md:mb-0 vertical-align-top h-full"
                  >
                    {{ t("pay.signature_from_friend") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <Textarea
                      id="rawSignedTxnInput"
                      v-model="rawSignedTxnInput"
                      class="w-full"
                      rows="8"
                    />
                  </div>
                </div>
                <div class="field grid">
                  <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
                  <div class="col-12 md:col-10">
                    <Button class="my-2" @click="loadMultisig">
                      {{ t("pay.load_multisig_data") }}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="showDesignScreen" class="grid">
              <div :class="scan ? 'col-8' : 'col-12'">
                <div v-if="route.params.toAccount">
                  <InputText
                    v-if="!payTo"
                    id="payTo1"
                    :modelValue="toSingleParam(route.params.toAccount)"
                    disabled
                    class="w-full"
                  />
                  <InputText
                    v-else
                    id="payTo2"
                    v-model="payTo"
                    disabled
                    class="w-full"
                  />
                </div>
                <div v-else>
                  <div v-if="!isRekey" class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0">
                      {{ t("pay.pay_to") }}
                    </label>
                    <div class="col-12 md:col-10">
                      <TabView class="w-full" header-class="mr-2">
                        <TabPanel
                          :header="t('pay.pay_to_wallet')"
                          headerClass="mr-2"
                        >
                          <SelectAccount
                            v-model="payTo"
                            class="w-full"
                          ></SelectAccount>
                        </TabPanel>
                        <TabPanel :header="t('pay.pay_to_other')">
                          <InputText
                            id="payTo"
                            v-model="payTo"
                            class="w-full"
                          />
                          <div>
                            <Button
                              size="small"
                              class="m-2"
                              @click="toggleCamera"
                            >
                              {{ t("pay.toggle_camera") }}
                            </Button>
                            <p>
                              {{ t("pay.store_other_help") }}
                            </p>
                          </div>
                        </TabPanel>
                      </TabView>
                    </div>
                  </div>
                  <Message
                    severity="error"
                    v-if="forcedAssetNotLoaded"
                    class="my-2"
                  >
                    {{ t("pay.asset_failed_to_load") }}
                  </Message>
                </div>
                <div class="field grid" v-if="isRekey">
                  <label class="col-12 mb-2 md:col-2 md:mb-0">
                    {{ t("pay.rekey_to") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <TabView>
                      <TabPanel
                        :header="t('pay.rekey_to_wallet_account')"
                        class="mr-2"
                      >
                        <SelectAccount
                          v-model="rekeyTo"
                          class="w-full"
                        ></SelectAccount>
                      </TabPanel>
                      <TabPanel :header="t('pay.rekey_to_external_account')">
                        <InputText
                          id="rekeyTo"
                          v-model="rekeyTo"
                          class="w-full"
                        />
                        <div>
                          <Button
                            size="small"
                            class="m-2"
                            @click="toggleCamera"
                          >
                            {{ t("pay.toggle_camera") }}
                          </Button>
                          <p>
                            {{ t("pay.store_other_help") }}
                          </p>
                        </div>
                      </TabPanel>
                    </TabView>
                  </div>
                </div>
                <div>
                  <div
                    class="field grid"
                    v-if="forceAsset && assetObj && assetObj.name"
                  >
                    <label for="asset" class="col-12 mb-2 md:col-2 md:mb-0">
                      {{ t("pay.asset") }}
                    </label>
                    <div class="col-12 md:col-10">
                      <InputText
                        v-model="assetObj.name"
                        class="w-full"
                        disabled
                      />
                    </div>
                  </div>
                  <div class="field grid" v-else>
                    <label for="asset" class="col-12 mb-2 md:col-2 md:mb-0">
                      {{ t("pay.asset") }}
                    </label>

                    <div class="col-12 md:col-10">
                      <Dropdown
                        inputId="asset"
                        v-model="asset"
                        filter
                        :options="assets"
                        optionLabel="label"
                        optionValue="assetId"
                        :placeholder="t('pay.asset')"
                        class="w-full"
                        inputClass="w-full"
                      >
                      </Dropdown>
                    </div>
                  </div>
                </div>
                <Message
                  severity="error"
                  v-if="payamountGtMaxAmount"
                  class="my-2"
                >
                  {{ t("pay.asset_too_small_balance") }}
                </Message>
                <div v-if="!isRekey" class="field grid">
                  <label for="payamount" class="col-12 mb-2 md:col-2 md:mb-0">
                    {{ t("pay.amount") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <InputGroup>
                      <InputNumber
                        itemId="payamount"
                        v-model="payamount"
                        :min="0"
                        :max="maxAmount"
                        :step="stepAmount"
                        :maxFractionDigits="decimals"
                        showButtons
                        class="w-full"
                      />
                      <InputGroupAddon v-if="assetUnit">
                        {{ assetUnit }}
                      </InputGroupAddon>
                      <Button
                        severity="secondary"
                        class="col-2"
                        @click="setMaxAmount"
                      >
                        {{ t("pay.set_max") }}
                      </Button>
                    </InputGroup>
                  </div>
                </div>
                <div class="field grid">
                  <label for="fee" class="col-12 mb-2 md:col-2 md:mb-0">
                    {{ t("pay.fee") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <InputGroup>
                      <InputNumber
                        inputId="fee"
                        v-model="fee"
                        :min="0.001"
                        :max="1"
                        :step="0.000001"
                        :maxFractionDigits="6"
                        class="w-full"
                        showButtons
                      />
                      <InputGroupAddon>
                        {{ tokenSymbol }}
                      </InputGroupAddon>
                    </InputGroup>
                  </div>
                </div>
                <div class="field grid">
                  <label for="paynote" class="col-12 mb-2 md:col-2 md:mb-0">
                    {{ t("pay.note") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <InputText id="paynote" v-model="paynote" class="w-full" />
                  </div>
                </div>

                <div class="field grid" v-if="noteIsB64">
                  <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
                  <div class="col-12 md:col-10">
                    <Checkbox
                      inputId="paynoteB64"
                      v-model="paynoteB64"
                      class="mr-2"
                    />
                    <label class="form-check-label" for="paynoteB64">
                      {{ t("pay.note_is_b64") }}
                    </label>
                  </div>
                </div>

                <div class="field grid">
                  <label for="env" class="col-12 mb-2 md:col-2 md:mb-0">
                    {{ t("pay.environment") }}
                  </label>
                  <div class="col-12 md:col-10">
                    <InputText
                      id="env"
                      :value="envName"
                      class="w-full"
                      disabled
                    />
                  </div>
                </div>
                <div class="field grid">
                  <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
                  <div class="col-12 md:col-10">
                    <Button
                      :disabled="isNotValid"
                      class="my-2"
                      @click="previewPaymentClick"
                    >
                      {{ t("pay.review_payment") }}
                    </Button>
                    <Button
                      v-if="isMultisig"
                      severity="secondary"
                      class="m-2"
                      value="Cancel"
                      @click="subpage = ''"
                    >
                      {{ t("global.cancel") }}
                    </Button>
                    <Button
                      v-if="!isMultisig"
                      severity="secondary"
                      class="m-2"
                      value="Cancel"
                      @click="router.push('/accounts')"
                    >
                      {{ t("global.cancel") }}
                    </Button>
                  </div>
                </div>
              </div>

              <div v-if="scan" class="col-4">
                <QrcodeStream @decode="onDecodeQR" />
              </div>
            </div>
          </template>
        </Card>
      </form>
    </div>
  </main-layout>
</template>

<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  onMounted,
  reactive,
  toRefs,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { QrcodeStream } from "qrcode-reader-vue3";
import aprotocol from "../shared/algorand-protocol-parse";
import MainLayout from "../layouts/Main.vue";
import algosdk from "algosdk";
import type { Transaction } from "algosdk";
import { algo, AlgorandClient } from "@algorandfoundation/algokit-utils";
import SelectAccount from "../components/SelectAccount.vue";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import { getArc200Client } from "arc200-client";
import { useStore } from "@/store";
import { Buffer } from "buffer";
import type { WalletAccount, IAccountData } from "@/store/wallet";
import { ExtendedStoredAsset, StoredAsset } from "@/store/indexer";
import { BoxReference } from "@algorandfoundation/algokit-utils/types/app-manager";

type AccountNetworkData = IAccountData;

type MultisigDecoded = ReturnType<
  typeof algosdk.decodeSignedTransaction
> | null;
type DecodedTxn = any;
type AlgoTransaction =
  | ReturnType<typeof algosdk.decodeUnsignedTransaction>
  | Transaction;

interface PayState {
  payFromDirect: string;
  genericaccount: boolean;
  genericaccountRekey: boolean;
  payamount: number;
  fee: number;
  payTo: string;
  rekeyTo: string | undefined;
  paynote: string;
  paynoteB64: boolean;
  page: string;
  tx: string | AlgoTransaction | null;
  processing: boolean;
  error: string | unknown;
  confirmation: Record<string, unknown> | null;
  confirmedRound: bigint | null;
  subpage: string;
  txn: DecodedTxn;
  rawSignedTxn: string | null;
  rawSignedTxnFriend: string | null;
  rawSignedTxnInput: string | null;
  signMultisigWith: string[];
  multisigDecoded: MultisigDecoded;
  assets: ExtendedStoredAsset[];
  asset: string | number;
  assetObj: ExtendedStoredAsset | undefined;
  scan: boolean;
  forceAsset: boolean;
  txtCode: string;
  accountFor2FARealm: string;
  accountFor2FAAuthToken: string;
  showFormSend: boolean;
  showFormCombine: boolean;
  note: Uint8Array | null;
}

const store = useStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const instance = getCurrentInstance();
type CurrencyFormatter = (
  amount: number | bigint,
  symbol: string,
  decimals: number
) => string;

type GlobalFilters = {
  formatCurrency?: CurrencyFormatter;
};

const filters = instance?.appContext.config.globalProperties.$filters as
  | GlobalFilters
  | undefined;
const formatCurrency = (
  amount: number | bigint,
  symbol: string,
  decimalsCount: number
): string => {
  if (typeof filters?.formatCurrency === "function") {
    return filters.formatCurrency(amount, symbol, decimalsCount);
  }
  return amount.toString();
};

const toErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const toSingleParam = (
  value: string | string[] | undefined
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const requirePayFrom = (): string => {
  if (payFrom.value) return payFrom.value;
  throw new Error(t("pay.select_account_for_payment"));
};

const state = reactive<PayState>({
  payFromDirect: "",
  genericaccount: false,
  genericaccountRekey: false,
  payamount: 0,
  fee: 0.001,
  payTo: "",
  rekeyTo: "",
  paynote: "",
  paynoteB64: false,
  page: "design",
  tx: null,
  processing: false,
  error: "",
  confirmation: null,
  confirmedRound: null,
  subpage: "",
  txn: null,
  rawSignedTxn: null,
  rawSignedTxnFriend: null,
  rawSignedTxnInput: null,
  signMultisigWith: [],
  multisigDecoded: null,
  assets: [],
  asset: "",
  assetObj: undefined,
  scan: false,
  forceAsset: false,
  txtCode: "",
  accountFor2FARealm: "",
  accountFor2FAAuthToken: "",
  showFormSend: false,
  showFormCombine: false,
  note: null,
});

const {
  payFromDirect,
  payamount,
  fee,
  payTo,
  rekeyTo,
  paynote,
  paynoteB64,
  page,
  subpage,
  rawSignedTxnInput,
  assets,
  asset,
  assetObj,
  scan,
  forceAsset,
} = toRefs(state);

const setNoRedirect = () => store.dispatch("config/setNoRedirect");
const prolong = () => store.dispatch("wallet/prolong");
const preparePayment = (payload: Record<string, unknown>) =>
  store.dispatch("algod/preparePayment", payload);
const lastActiveAccount = (payload: { addr: string }) =>
  store.dispatch("wallet/lastActiveAccount", payload);
const getAsset = (payload: {
  assetIndex: bigint;
}): Promise<StoredAsset | undefined> =>
  store.dispatch("indexer/getAsset", payload);
const setEnv = (payload: { env: string }) =>
  store.dispatch("config/setEnv", payload);
const openError = (payload: string) =>
  store.dispatch("toast/openError", payload);
const signerCreateMultisigTransaction = (payload: Record<string, unknown>) =>
  store.dispatch("signer/createMultisigTransaction", payload);
const getRealm = (payload: Record<string, unknown>) =>
  store.dispatch("fa2/getRealm", payload);
const resetError = () => store.dispatch("toast/resetError");
const getAlgod = () => store.dispatch("algod/getAlgod");
const getIndexer = () => store.dispatch("indexer/getIndexer");
const signerToSignArray = (payload: Record<string, unknown>) =>
  store.dispatch("signer/toSignArray", payload);

const tokenSymbol = computed(() => store.state.config.tokenSymbol);
const envName = computed(() => store.state.config.env);
const walletAccounts = computed<WalletAccount[]>(
  () => store.state.wallet.privateAccounts || []
);
const assetData = computed<ExtendedStoredAsset | undefined>(() => {
  const assetId = state.asset;
  return state.assets.find(
    (entry) => String(entry.assetId) === String(assetId)
  );
});

const numericSelectedAssetId = computed(() => {
  const rawId = assetData.value?.assetId ?? state.asset;
  if (rawId === undefined || rawId === null || rawId === "") {
    return undefined;
  }
  const numericId = Number(rawId);
  return Number.isNaN(numericId) ? undefined : numericId;
});

const nonNativeAssetId = computed(() => {
  if (!assetData.value) return undefined;
  if (assetData.value.type === "Native") return undefined;
  return numericSelectedAssetId.value;
});
const decimals = computed(() => {
  if (assetData.value) {
    return assetData.value.decimals;
  }
  const assetObjDecimals = state.assetObj?.decimals ?? 6;
  if (typeof assetObjDecimals === "number") {
    return assetObjDecimals;
  }
  return 6;
});
const decimalsPower = computed(() => Math.pow(10, decimals.value ?? 6));
const amountLong = computed(() =>
  Math.round(state.payamount * decimalsPower.value)
);
const feeLong = computed(() => state.fee * Math.pow(10, 6));
const payFrom = computed(() => {
  const accountParam = toSingleParam(
    route.params.account as string | string[] | undefined
  );
  return accountParam ?? state.payFromDirect;
});
const account = computed(() =>
  walletAccounts.value.find((a) => a.addr == payFrom.value)
);
const accountData = computed<AccountNetworkData | null>(
  () => account.value?.data?.[envName.value] ?? null
);
const rekeyedToInfo = computed(() => {
  if (!accountData.value) return undefined;
  return walletAccounts.value.find(
    (a) => a.addr == accountData.value?.rekeyedTo
  );
});
const rekeyedMultisigParams = computed(() => {
  if (!accountData.value?.rekeyedTo) return undefined;
  const rekeyedInfo = walletAccounts.value.find(
    (a) => a.addr == accountData.value?.rekeyedTo
  );
  return rekeyedInfo?.params;
});
const multisigParams = computed(() => {
  if (rekeyedToInfo.value) return rekeyedMultisigParams.value;
  return account.value?.params;
});
const isMultisig = computed(() => !!multisigParams.value);
const accountFor2FA = computed(() => {
  const params = multisigParams.value;
  if (!params?.addrs) return undefined;
  return walletAccounts.value.find(
    (a): a is WalletAccount & { addr: string } =>
      typeof a.addr === "string" &&
      params.addrs.includes(a.addr) &&
      a.type == "2faApi"
  );
});
const accountFor2FAAddr = computed(() => accountFor2FA.value?.addr ?? "");
const accountFor2FAProvider = computed(
  () => accountFor2FA.value?.twoFactorAuthProvider ?? ""
);
const showDesignScreen = computed(
  () => !isMultisig.value || (isMultisig.value && state.subpage == "proposal")
);
const isRekey = computed(() => {
  if (state.multisigDecoded?.txn && state.multisigDecoded.txn.rekeyTo) {
    return true;
  }
  const typeParam = toSingleParam(
    route.params.type as string | string[] | undefined
  );
  return typeParam === "rekey";
});
const maxAmount = computed(() => {
  if (!accountData.value) return 0;
  if (!assetData.value) return 0;
  if (assetData.value.type == "ARC200" || assetData.value.type == "ASA") {
    return (
      Number(assetData.value.amount) / 10 ** Number(assetData.value.decimals)
    );
  }
  const accountAmount = Number(accountData.value.amount ?? 0);
  let ret = accountAmount / 1000000 - 0.1;
  ret -= state.fee;
  const optedAssets = accountData.value["assets"] || [];
  if (optedAssets.length > 0) {
    ret -= optedAssets.length * 0.1;
  }
  return ret;
});
const payamountGtMaxAmount = computed(() => state.payamount > maxAmount.value);
const forcedAssetNotLoaded = computed(
  () => state.forceAsset && (!state.assetObj || !state.assetObj.name)
);
const stepAmount = computed(() => {
  if (!decimals.value) return 1;
  return Math.pow(10, -1 * decimals.value);
});
const noteIsB64 = computed(() => {
  if (!state.paynote) return false;
  return isBase64(state.paynote);
});
const assetUnit = computed(() => {
  if (!state.assetObj) return "";
  return state.assetObj.unitName || state.assetObj.name || "";
});
const isAuth = computed(() => store.state.wallet.isOpen);
const isNotValid = computed(() => {
  if (!state.payTo) return true;
  if (isRekey.value && !state.rekeyTo) return true;
  return false;
});

watch(payFromDirect, (value) => {
  if (value) {
    lastActiveAccount({ addr: value });
  }
});

watch(account, () => {
  void makeAssets();
});

watch(asset, async (assetValue) => {
  const numericAssetId = BigInt(assetValue);
  if (!Number.isNaN(numericAssetId) && numericAssetId > 0) {
    const fetched = await getAsset({ assetIndex: numericAssetId });
    state.assetObj = fetched;
  } else {
    state.assetObj = {
      assetId: 0n,
      name: tokenSymbol.value,
      unitName: tokenSymbol.value,
      decimals: 6,
      type: "Native",
      amount: undefined,
      label: tokenSymbol.value,
    };
  }
  state.payamount = 0;
  parseToAccount();
});

watch(isAuth, (auth) => {
  if (
    auth &&
    store.state.wallet.privateAccounts &&
    store.state.wallet.privateAccounts.length === 1
  ) {
    state.payFromDirect = store.state.wallet.privateAccounts[0].addr || "";
  }
});

onMounted(async () => {
  if (!payFrom.value) {
    await setNoRedirect();
  }
  await resetError();
  state.payTo = store.state.wallet.lastPayTo || "";

  const assetParam = toSingleParam(
    route.params.asset as string | string[] | undefined
  );
  if (assetParam) {
    state.asset = assetParam;
  }

  parseToAccount();
  const toAccountDirect = toSingleParam(
    route.params.toAccountDirect as string | string[] | undefined
  );
  if (toAccountDirect) {
    state.payTo = toAccountDirect;
  }
  if (route.name === "PayFromWalletConnect" && store.state.signer?.toSign) {
    try {
      state.txn = store.state.signer.toSign as DecodedTxn;

      if (state.txn?.to) {
        state.payTo = algosdk.encodeAddress(state.txn.to.publicKey);
      }
      if (state.txn?.from) {
        state.payFromDirect = algosdk.encodeAddress(state.txn.from.publicKey);
      }

      const senderAddr = requirePayFrom();
      const rawSignedTxnData = await signerCreateMultisigTransaction({
        txn: state.txn,
        from: senderAddr,
      });
      const encodedTxn = arrayBufferToBase64(rawSignedTxnData);
      state.rawSignedTxn = encodedTxn;
      state.rawSignedTxnInput = encodedTxn;

      state.multisigDecoded = algosdk.decodeSignedTransaction(
        base64ToArrayBuffer(state.rawSignedTxnInput)
      );
      state.note = state.txn?.note ?? null;
      if (state.txn?.assetIndex !== undefined) {
        state.asset = state.txn.assetIndex;
      }
      state.page = "review";

      const b64Url = base642base64url(encodedTxn);
      router.push(`/sign/${senderAddr}/` + b64Url);
    } catch (err) {
      console.error("Input is not valid base64-url format ", err);
    }
  }
  const rawSignedTxnParam = toSingleParam(
    route.params.rawSignedTxnInput as string | string[] | undefined
  );
  if (rawSignedTxnParam) {
    try {
      const senderAddr = requirePayFrom();
      const b64 = base64url2base64(rawSignedTxnParam);
      const uint8buffer = base64ToArrayBuffer(b64);

      state.txn = algosdk.decodeUnsignedTransaction(uint8buffer);
      if (state.txn?.to) {
        state.payTo = algosdk.encodeAddress(state.txn.to.publicKey);
      }
      state.note = state.txn?.note ?? null;
      if (state.txn?.assetIndex !== undefined) {
        state.asset = state.txn.assetIndex;
      }
      state.page = "review";
      router.push(`/sign/${senderAddr}/` + base642base64url(rawSignedTxnParam));
    } catch (err) {
      console.error("Input is not valid base64-url format ", err);
    }
  }
  const accountParam = toSingleParam(
    route.params.account as string | string[] | undefined
  );
  if (accountParam) {
    await lastActiveAccount({ addr: accountParam });
  }
  await makeAssets();

  if (
    store.state.wallet.privateAccounts &&
    store.state.wallet.privateAccounts.length === 1
  ) {
    state.payFromDirect = store.state.wallet.privateAccounts[0].addr || "";
  }

  if (isRekey.value && accountData.value?.addr) {
    state.payTo = accountData.value.addr;
  }
  if (state.payTo && !state.payFromDirect) {
    state.payFromDirect = state.payTo;
  }

  if (accountFor2FAProvider.value) {
    try {
      state.accountFor2FARealm = await getRealm({
        twoFactorAuthProvider: accountFor2FAProvider.value,
      });
      loadAuthToken();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("failed to request realm", errMsg, err);
      await openError(errMsg);
    }
  }
});

const isBase64 = (str: string) => {
  try {
    const decoded1 = Buffer.from(str, "base64").toString("utf8");
    const encoded2 = Buffer.from(decoded1, "binary").toString("base64");
    return str == encoded2;
  } catch {
    return false;
  }
};

const makeAssets = async () => {
  state.assets = [];
  if (accountData.value) {
    const nativeAmount = BigInt(accountData.value.amount ?? 0);
    const balance = formatCurrency(nativeAmount, tokenSymbol.value, 6);
    state.assets.push({
      assetId: 0n,
      amount: nativeAmount,
      name: tokenSymbol.value,
      decimals: 6,
      unitName: tokenSymbol.value,
      type: "Native",
      label: `${tokenSymbol.value} (Native token) Balance: ${balance}`,
    });
  } else {
    const balance = formatCurrency(0, tokenSymbol.value, 6);
    state.assets.push({
      assetId: 0n,
      amount: 0n,
      name: tokenSymbol.value,
      decimals: 6,
      unitName: tokenSymbol.value,
      type: "Native",
      label: `${tokenSymbol.value} (Native token) Balance: ${balance}`,
    });
  }
  if (isRekey.value) return;
  if (accountData.value) {
    const asaList = accountData.value.assets || [];
    for (const accountAsset of asaList) {
      try {
        const assetInfo = await getAsset({
          assetIndex: BigInt(accountAsset.assetId),
        });
        if (assetInfo) {
          const balance = formatCurrency(
            Number(accountAsset["amount"] ?? 0),
            assetInfo.unitName ? assetInfo.unitName : assetInfo.name ?? "",
            assetInfo.decimals ?? 6
          );
          state.assets.push({
            assetId: BigInt(accountAsset.assetId),
            amount: BigInt(accountAsset["amount"] ?? 0),
            name: assetInfo.name ?? "",
            decimals: assetInfo.decimals ?? 6,
            unitName: assetInfo.unitName ?? "",
            type: "ASA",
            label: `${assetInfo.name} (ASA ${accountAsset.assetId}) Balance: ${balance}`,
          });
        } else {
          console.error("Asset not loaded", accountAsset.assetId);
        }
      } catch (err) {
        console.error("Asset load failed", accountAsset.assetId, err);
      }
    }

    if (accountData.value.arc200) {
      for (const accountAsset of Object.values(accountData.value.arc200)) {
        const balance = formatCurrency(
          Number(accountAsset.balance ?? 0),
          accountAsset.symbol ? accountAsset.symbol : accountAsset.name,
          Number(accountAsset.decimals ?? 0)
        );
        state.assets.push({
          assetId: BigInt(accountAsset.arc200id),
          amount: BigInt(accountAsset.balance ?? 0),
          name: accountAsset.name,
          decimals: Number(accountAsset.decimals ?? 0),
          unitName: accountAsset.symbol,
          type: "ARC200",
          label: `${accountAsset.name} (ARC200 ${accountAsset.arc200id}) Balance: ${balance}`,
        });
      }
    }
  }

  const toAccountParam = toSingleParam(
    route.params.toAccount as string | string[] | undefined
  );
  if (toAccountParam) {
    parseToAccount(toAccountParam);
  }
};

const parseToAccount = (encodedValue?: string) => {
  const encoded =
    encodedValue ??
    toSingleParam(route.params.toAccount as string | string[] | undefined);
  if (!encoded) return;
  const parsed = aprotocol.parseAlgorandProtocolParameters(encoded);
  if (!parsed) return;
  state.payTo = (parsed.payTo || "").replace(/[^\w\s]/gi, "");
  if (parsed.payamountbase !== undefined) {
    state.payamount = Number(parsed.payamountbase) / decimalsPower.value;
  }
  if (parsed.asset) {
    state.asset = parsed.asset;
    state.forceAsset = true;
  }
  if (parsed.paynote) {
    state.paynote = parsed.paynote;
  }
  if (parsed.fee) {
    state.fee = Number(parsed.fee);
  }
  if (parsed.network && parsed.network != envName.value) {
    setEnv({ env: parsed.network });
  }
};

const previewPaymentClick = async (e: Event | undefined) => {
  try {
    const assetMeta = state.assets.find(
      (a) => BigInt(a.assetId) == BigInt(state.asset)
    );
    if (!assetMeta) {
      console.error("no asset selected");
      return;
    }
    if (assetMeta.type == "ASA") {
      await redirectToASAPayment();
    }
    if (assetMeta.type == "Native") {
      await redirectToNativePayment();
    }
    if (assetMeta.type == "ARC200") {
      await redirectToARC200Payment();
    }
    state.error = "";
    state.confirmedRound = null;
    state.tx = null;

    state.processing = false;
    prolong();
    e?.preventDefault();
  } catch (err) {
    console.error("previewPaymentClick.error", err);
    await openError(toErrorMessage(err));
  }
};

const redirectToASAPayment = async () => {
  try {
    const enc = new TextEncoder();
    let noteEnc = enc.encode(state.paynote);
    const assetId = nonNativeAssetId.value;
    if (assetId === undefined) {
      throw new Error("Asset id is required for ASA payments");
    }
    const senderAddr = requirePayFrom();
    const txData = await preparePayment({
      payTo: state.payTo,
      payFrom: senderAddr,
      amount: amountLong.value,
      noteEnc,
      fee: feeLong.value,
      asset: assetId,
      reKeyTo: state.rekeyTo ? state.rekeyTo : undefined,
    });
    const encodedTx = algosdk.encodeUnsignedTransaction(txData);
    const b64 = Buffer.from(encodedTx).toString("base64");
    const b64Url = base642base64url(b64);
    router.push(`/sign/${senderAddr}/` + b64Url);
  } catch (err) {
    console.error("redirectToASAPayment.error", err);
    await openError(toErrorMessage(err));
  }
};

const redirectToNativePayment = async () => {
  try {
    const enc = new TextEncoder();
    let noteEnc = enc.encode(state.paynote);
    const senderAddr = requirePayFrom();
    const txData = await preparePayment({
      payTo: state.payTo,
      payFrom: senderAddr,
      amount: amountLong.value,
      noteEnc,
      fee: feeLong.value,
      asset: undefined,
      reKeyTo: state.rekeyTo ? state.rekeyTo : undefined,
    });
    const encodedTx = algosdk.encodeUnsignedTransaction(txData);
    const b64 = Buffer.from(encodedTx).toString("base64");
    const b64Url = base642base64url(b64);
    router.push(`/sign/${senderAddr}/` + b64Url);
  } catch (err) {
    console.error("redirectToNativePayment.error", err);
    await openError(toErrorMessage(err));
  }
};

const accountIsOptedInToArc200Asset = async (addr: string) => {
  const indexerClient = await getIndexer();
  const fromDecoded = algosdk.decodeAddress(addr);
  const boxName = new Uint8Array(
    Buffer.concat([Buffer.from([0x00]), Buffer.from(fromDecoded.publicKey)])
  );
  const appId = numericSelectedAssetId.value;
  if (!appId) {
    return false;
  }
  try {
    await indexerClient.lookupApplicationBoxByIDandName(appId, boxName).do();
    return true;
  } catch (exc) {
    const excMsg = toErrorMessage(exc);
    if (excMsg.includes("no application boxes found")) {
      return false;
    }
    console.error(exc);
    throw exc;
  }
};

const redirectToARC200Payment = async () => {
  try {
    const algod = await getAlgod();
    const appId = numericSelectedAssetId.value;
    if (appId === undefined || !Number.isFinite(appId) || appId <= 0) {
      throw new Error("Invalid ARC200 application id");
    }
    const senderAddr = requirePayFrom();
    const algorandClient = AlgorandClient.fromClients({ algod });
    const client = getArc200Client({
      algorand: algorandClient,
      appId: BigInt(appId),
      appName: undefined,
      approvalSourceMap: undefined,
      clearSourceMap: undefined,
      defaultSender: senderAddr,
      defaultSigner: undefined,
    });
    var boxFromDirect: BoxReference = {
      // : algosdk.BoxReference
      appId: BigInt(appId),
      name: new Uint8Array(
        Buffer.from(algosdk.decodeAddress(senderAddr).publicKey)
      ),
    };
    var boxFrom: BoxReference = {
      // : algosdk.BoxReference
      appId: BigInt(appId),
      name: new Uint8Array(
        Buffer.concat([
          Buffer.from([0x00]),
          Buffer.from(algosdk.decodeAddress(senderAddr).publicKey),
        ])
      ), // data box
    };
    var boxTo: BoxReference = {
      // : algosdk.BoxReference
      appId: BigInt(appId),
      name: new Uint8Array(
        Buffer.concat([
          Buffer.from([0x00]),
          Buffer.from(algosdk.decodeAddress(state.payTo).publicKey),
        ])
      ), // data box
    };
    var boxFromBalance: BoxReference = {
      // : algosdk.BoxReference
      appId: BigInt(appId),
      name: new Uint8Array(
        Buffer.concat([
          Buffer.from("balances", "ascii"),
          Buffer.from(algosdk.decodeAddress(senderAddr).publicKey),
        ])
      ), // data box
    };
    var boxToBalance: BoxReference = {
      // : algosdk.BoxReference
      appId: BigInt(appId),
      name: new Uint8Array(
        Buffer.concat([
          Buffer.from("balances", "ascii"),
          Buffer.from(algosdk.decodeAddress(state.payTo).publicKey),
        ])
      ), // data box
    };
    var boxFromAddrText: BoxReference = {
      // : algosdk.BoxReference
      appId: BigInt(appId),
      name: new Uint8Array(Buffer.from(state.payTo, "ascii")), // box as the address encoded as text
    };
    const compose = await client.createTransaction.arc200Transfer({
      args: {
        to: state.payTo,
        value: BigInt(amountLong.value),
      },
      boxReferences: [
        boxFromDirect,
        boxFromBalance,
        boxFrom,
        boxTo,
        boxToBalance,
        boxFromAddrText,
      ],
    });

    const enc = new TextEncoder();
    const noteEnc = enc.encode("g");
    const optedIn = await accountIsOptedInToArc200Asset(state.payTo);
    if (!optedIn) {
      const payTx = await preparePayment({
        payTo: algosdk.getApplicationAddress(appId),
        payFrom: senderAddr,
        amount: 28500,
        noteEnc,
        fee: undefined,
        asset: undefined,
        reKeyTo: undefined,
      });
      const txsToSign = [payTx, ...compose.transactions];
      algosdk.assignGroupID(txsToSign);
      await signerToSignArray({ txs: txsToSign });
      await router.push("/signAll");
    } else {
      const firstTxn = compose.transactions[0];
      if (!firstTxn) {
        throw new Error("No ARC200 transaction available to sign");
      }
      state.tx = firstTxn;
      const encoded = base642base64url(
        Buffer.from(algosdk.encodeUnsignedTransaction(firstTxn)).toString(
          "base64"
        )
      );
      router.push(`/sign/${senderAddr}/${encoded}`);
    }
  } catch (err) {
    console.error("redirectToARC200Payment.error", err);
    await openError(toErrorMessage(err));
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const base64url2base64 = (input: string) => {
  let output = input.replaceAll(/-/g, "+").replaceAll(/_/g, "/");
  const pad = output.length % 4;
  if (pad) {
    if (pad === 1) {
      throw new Error(
        "InvalidLengthError: Input base64url string is the wrong length to determine padding"
      );
    }
    output += "=".repeat(4 - pad);
  }
  return output;
};

const base642base64url = (input: string) =>
  input.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const loadMultisig = (e: Event | undefined) => {
  prolong();
  if (e) {
    e.preventDefault();
  }
  if (!state.rawSignedTxnInput) return;
  const senderAddr = requirePayFrom();
  state.multisigDecoded = algosdk.decodeSignedTransaction(
    base64ToArrayBuffer(state.rawSignedTxnInput)
  );
  state.txn = state.multisigDecoded.txn;
  state.rawSignedTxn = state.rawSignedTxnInput;

  router.push(
    `/sign/${senderAddr}/` + base642base64url(state.rawSignedTxnInput)
  );

  state.page = "review";
  if (
    state.multisigDecoded?.msig &&
    typeof state.multisigDecoded!.msig.thr === "string"
  ) {
    state.multisigDecoded!.msig.thr = parseInt(state.multisigDecoded!.msig.thr);
  }
};
const toggleCamera = (e: Event | undefined) => {
  e?.preventDefault();
  state.scan = !state.scan;
  if (state.scan) {
    state.payTo = "";
  }
};

const isEncoded = (uri = "") => uri !== decodeURIComponent(uri);

const onDecodeQR = (result: string) => {
  if (state.scan && result) {
    if (
      result.startsWith("algorand://") ||
      result.startsWith("web+algorand://")
    ) {
      let parsed = result.replace("web+algorand://", "");
      parsed = parsed.replace("algorand://", "");
      const qIndex = parsed.indexOf("?");
      if (qIndex < 0) {
        state.payTo = parsed.replace(/[^\w\s]/gi, "");
      } else {
        state.payTo = parsed.substring(0, qIndex).replace(/[^\w\s]/gi, "");
        const params = parsed.substring(qIndex + 1).split("&");

        let noteValue: string | undefined;
        let noteB64: string | undefined;
        let amountValue: string | undefined;
        let decimalsValue: number | undefined;
        let assetValue: string | undefined;
        let feeValue: string | undefined;

        for (const param of params) {
          const eqIndex = param.indexOf("=");
          if (eqIndex > 0) {
            const paramName = param.substring(0, eqIndex);
            const paramValue = param.substring(eqIndex + 1);
            switch (paramName) {
              case "note":
              case "xnote":
              case "label":
                noteValue = paramValue;
                break;
              case "noteB64":
                noteB64 = paramValue;
                break;
              case "amount":
                amountValue = paramValue;
                break;
              case "asset":
                assetValue = paramValue;
                break;
              case "fee":
                feeValue = paramValue;
                break;
              case "decimals":
                decimalsValue = Number(paramValue);
                break;
            }
          }
        }

        state.paynote = noteValue ?? "";
        if (state.paynote && isEncoded(state.paynote)) {
          state.paynote = decodeURIComponent(state.paynote);
        }

        state.paynoteB64 = !!noteB64;
        if (
          decimalsValue !== undefined &&
          Number.isFinite(decimalsValue) &&
          decimalsValue >= 0
        ) {
          if (amountValue) {
            const parsedAmount = Number(amountValue);
            if (!Number.isNaN(parsedAmount)) {
              state.payamount = parsedAmount / Math.pow(10, decimalsValue);
            }
          }
          if (feeValue) {
            const parsedFee = Number(feeValue);
            if (!Number.isNaN(parsedFee)) {
              state.fee = parsedFee / Math.pow(10, decimalsValue);
            }
          }
        } else {
          if (amountValue) {
            const parsedAmount = Number(amountValue);
            if (!Number.isNaN(parsedAmount)) {
              state.payamount = parsedAmount;
            }
          }
          if (feeValue) {
            const parsedFee = Number(feeValue);
            if (!Number.isNaN(parsedFee)) {
              state.fee = parsedFee;
            }
          }
        }
        if (assetValue) {
          const parsedAsset = Number(assetValue);
          state.asset = Number.isNaN(parsedAsset) ? assetValue : parsedAsset;
        }
      }
    } else {
      state.payTo = result.replace(/[^\w\s]/gi, "");
    }
  }
  if (state.payTo) {
    state.scan = false;
  }
};

const setMaxAmount = (e: Event | undefined) => {
  e?.preventDefault();
  state.payamount = maxAmount.value;
};

const loadAuthToken = () => {
  if (!state.accountFor2FARealm) return false;
  const arc14State = store.state.arc14.address2chain2realm2token;
  if (!arc14State) return false;
  const envTokens = arc14State[envName.value];
  if (!envTokens) return false;
  const addrTokens = envTokens[accountFor2FAAddr.value];
  if (!addrTokens) return false;
  const token = addrTokens[state.accountFor2FARealm];
  if (!token) return false;
  state.accountFor2FAAuthToken = token;
  return true;
};
</script>
