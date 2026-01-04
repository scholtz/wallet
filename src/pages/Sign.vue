<template>
  <main-layout>
    <div v-if="!$route.params.account">
      <h1>{{ $t("pay.select_account_for_payment") }}</h1>

      <Card>
        <template #content>
          <SelectAccount v-model="payFromDirect" class="w-full"></SelectAccount>
        </template>
      </Card>
    </div>
    <div v-if="account">
      <form v-if="page == 'review'" @submit="signTxClick">
        <h1>{{ $t("pay.review_payment") }}</h1>
        <Card v-if="fatal">
          <template #content>
            {{ fatal }}
          </template>
        </Card>
        <Card v-else>
          <template #content>
            <p>{{ $t("pay.review_payment_help") }}</p>
            <div class="grid">
              <div class="col">
                <div v-if="!multisigTxn" class="w-100">
                  <div class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.from_account") }}
                    </label>

                    <div class="col-12 md:col-10">{{ payFrom }}</div>
                  </div>
                  <div class="field grid" v-if="malformedAddress">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                    </label>
                    <div class="col-12 md:col-10">
                      <Message severity="error">
                        {{ $t("pay.pay_to_address_malformed") }}
                      </Message>
                    </div>
                  </div>
                  <div class="field grid" v-if="txn && txn.type">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.tx_type") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ txn.type }}
                    </div>
                  </div>
                  <div class="field grid" v-if="payTo">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.pay_to") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ payTo }}
                    </div>
                  </div>
                  <div
                    class="field grid"
                    v-if="txn?.type == 'keyreg' && !txn.voteFirst"
                  >
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                    </label>
                    <div class="col-12 md:col-10">
                      Tx to unregister from the participation
                    </div>
                  </div>
                  <div
                    class="field grid"
                    v-if="txn?.type == 'keyreg' && txn?.voteFirst"
                  >
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      First participation round
                    </label>
                    <div class="col-12 md:col-10">
                      {{ txn.voteFirst }}
                    </div>
                  </div>
                  <div
                    class="field grid"
                    v-if="txn?.type == 'keyreg' && txn?.voteLast"
                  >
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      Last participation round
                    </label>
                    <div class="col-12 md:col-10">
                      {{ txn.voteLast }}
                    </div>
                  </div>
                  <div class="field grid" v-if="paynote">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.note") }}
                    </label>
                    <div class="col-12 md:col-10" v-if="paynote.length < 50">
                      {{ paynote }}
                    </div>
                    <div class="col-12 md:col-10" v-else>
                      <JsonViewer :value="paynote" copyable boxed sort />
                    </div>
                  </div>
                  <div class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.environment") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ $store.state.config.env }}
                    </div>
                  </div>
                  <div
                    class="field grid"
                    v-if="
                      assetObj &&
                      txn &&
                      (txn.type == 'pay' || txn.type == 'axfer')
                    "
                  >
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("optin.assetId") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ assetObj.assetId ? assetObj.assetId : "Algo" }}
                    </div>
                  </div>
                  <div
                    class="field grid"
                    v-if="
                      amountLong > 0 ||
                      (txn &&
                        txn.type &&
                        (txn.type == 'pay' || txn.type == 'axfer'))
                    "
                  >
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.amount") }}
                    </label>
                    <div class="col-12 md:col-10" v-if="assetObj">
                      {{
                        $filters.formatCurrency(
                          amountLong,
                          assetObj.name,
                          assetObj.decimals
                        )
                      }}
                    </div>
                    <div class="col-12 md:col-10" v-else>
                      {{ $filters.formatCurrency(amountLong) }}
                    </div>
                  </div>
                  <div class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.fee") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ $filters.formatCurrency(feeLong) }}
                    </div>
                  </div>
                  <div class="field grid" v-if="!asset">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.total") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ $filters.formatCurrency(amountLong + feeLong) }}
                    </div>
                  </div>
                  <div class="field grid" v-if="rekeyTo">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.rekey_to") }}
                    </label>
                    <div class="col-12 md:col-10">
                      <Message severity="error">
                        {{ rekeyTo }}
                      </Message>
                    </div>
                  </div>
                </div>

                <div v-if="multisigTxn">
                  <h2>{{ $t("pay.transaction_details") }}</h2>
                  <div class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.type") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ multisigTxn?.type }}
                    </div>
                  </div>
                  <div class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.name") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ multisigTxn?.name }}
                    </div>
                  </div>
                  <div class="field grid" v-if="multisigTxn?.amount">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.amount") }}
                    </label>
                    <div class="col-12 md:col-10" v-if="assetObj">
                      {{
                        $filters.formatCurrency(
                          normalizeNumeric(multisigTxn?.amount),
                          assetObj.name,
                          assetObj.decimals
                        )
                      }}
                    </div>
                    <div class="col-12 md:col-10" v-else>
                      {{
                        $filters.formatCurrency(
                          normalizeNumeric(multisigTxn?.amount)
                        )
                      }}
                    </div>
                  </div>
                  <div class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.fee") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{
                        $filters.formatCurrency(
                          normalizeNumeric(multisigTxn?.fee)
                        )
                      }}
                    </div>
                  </div>
                  <div class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.first_round") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{
                        multisigTxn?.firstRound ?? multisigTxn?.firstValid ?? ""
                      }}
                    </div>
                  </div>
                  <div class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.last_round") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{
                        multisigTxn?.lastRound ?? multisigTxn?.lastValid ?? ""
                      }}
                    </div>
                  </div>
                  <div class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.genesis") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ multisigTxn?.genesisID }}
                    </div>
                  </div>
                  <div class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.note") }}
                    </label>
                    <div class="col-12 md:col-10" v-if="multisigTxn?.note">
                      {{ msigNote }}
                    </div>
                  </div>
                  <div class="field grid">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.tag") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ multisigTxn?.tag }}
                    </div>
                  </div>
                  <div class="field grid" v-if="multisigTxn?.from?.publicKey">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.from_account") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ encodeAddress(multisigTxn?.from?.publicKey) }}
                    </div>
                  </div>
                  <div
                    class="field grid"
                    v-if="multisigTxn?.reKeyTo?.publicKey"
                  >
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.rekey_to") }}
                    </label>
                    <div class="col-12 md:col-10">
                      <Message severity="error">
                        {{ encodeAddress(multisigTxn?.reKeyTo?.publicKey) }}
                      </Message>
                    </div>
                  </div>
                  <div class="field grid" v-if="multisigTxn?.to?.publicKey">
                    <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold">
                      {{ $t("pay.to_account") }}
                    </label>
                    <div class="col-12 md:col-10">
                      {{ encodeAddress(multisigTxn?.to?.publicKey) }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="col" v-if="multisigDecoded?.msig">
                <h2>{{ $t("pay.signatures") }} {{ showSignaturesCount }}</h2>
                <div
                  class="field grid"
                  v-for="sig in multisigSubsig"
                  :key="encodeAddress(sig.pk)"
                >
                  <label class="col-12 mb-2 md:col-2 md:mb-0">
                    <AlgorandAddress :address="encodeAddress(sig.pk)" />
                  </label>
                  <div class="col-12 md:col-10">
                    <Badge
                      severity="success"
                      v-if="sig.s"
                      :value="$t('pay.signed')"
                    />
                    <Badge
                      severity="danger"
                      v-if="!sig.s"
                      :value="$t('pay.not_signed')"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div class="field grid">
              <label class="col-12 mb-2 md:col-2 md:mb-0 font-bold"></label>
              <div class="col-12 md:col-10">
                <Button
                  v-if="!isMultisig"
                  :disabled="
                    processing || isRawSignedTxnSigned || !!confirmedRound
                  "
                  :severity="isRawSignedTxnSigned ? 'secondary' : 'primary'"
                  @click="signTxClick"
                  class="m-2"
                >
                  Sign transaction
                </Button>
                <Button
                  v-if="!isMultisig"
                  @click="submitSignedClick"
                  :disabled="
                    processing || !isRawSignedTxnSigned || !!confirmedRound
                  "
                  :severity="
                    isRawSignedTxnSigned && !confirmedRound
                      ? 'primary'
                      : 'secondary'
                  "
                  class="m-2"
                >
                  Send tx to the network
                  <ProgressSpinner
                    v-if="processing"
                    style="width: 1em; height: 1em"
                    strokeWidth="10"
                    class="ml-2"
                  />
                </Button>
                <Button
                  v-if="
                    !isMultisig && $store.state.signer.returnTo == 'SignAll'
                  "
                  :severity="
                    isRawSignedTxnSigned && confirmedRound
                      ? 'primary'
                      : 'secondary'
                  "
                  class="m-2"
                  :disabled="!isRawSignedTxnSigned"
                  @click="retToSignAll"
                >
                  Return to multi tx signature
                </Button>
                <Button
                  v-if="
                    !isMultisig &&
                    $store.state.signer.returnTo == 'ScheduledPayments'
                  "
                  class="m-2"
                  :severity="
                    isRawSignedTxnSigned && confirmedRound
                      ? 'primary'
                      : 'secondary'
                  "
                  :disabled="!isRawSignedTxnSigned"
                  @click="retToScheduledPayments"
                >
                  Return to scheduled payment management
                </Button>
                <span v-if="!isRawSignedTxnSigned">
                  <Button
                    v-if="isMultisig"
                    @click="payPaymentClick"
                    class="m-2"
                  >
                    {{ $t("pay.create_multisig_proposal") }}
                  </Button>
                </span>
              </div>
            </div>

            <div
              v-if="
                isMultisig &&
                txn &&
                accountFor2FA &&
                !isSignedByAccountFor2FAAddr
              "
            >
              <h2>{{ $t("pay.2fa_code") }}</h2>
              <div v-if="accountFor2FAAuthToken">
                <div>
                  <InputMask
                    itemid="txtCode"
                    v-model="txtCode"
                    mask="999-999"
                  />
                </div>
                <div>
                  <Button
                    class="my-2"
                    :disabled="!txtCode || txtCode.indexOf('_') >= 0"
                    @click="sign2FAClick"
                  >
                    {{ $t("pay.sign") }}
                  </Button>
                </div>
              </div>
              <div v-else>
                <Button class="my-2" @click="authorizePrimaryAccountClick">
                  {{ $t("pay.sign_arc14_request") }}
                </Button>
              </div>
            </div>

            <div v-if="isMultisig && multisigTxn">
              <div
                v-if="accountsFromMultisig && accountsFromMultisig.length > 0"
              >
                <h2>{{ $t("pay.sign_with") }}</h2>
                <MultiSelect
                  v-model="signMultisigWith"
                  class="w-full"
                  :options="accountsFromMultisig"
                  optionLabel="name"
                  optionValue="addr"
                >
                  <template #optiongroup="slotProps">
                    <div class="flex align-items-center">
                      {{
                        slotProps.option.name + "  - " + slotProps.option.addr
                      }}
                    </div>
                  </template>
                </MultiSelect>
                <Button
                  class="my-2"
                  :disabled="signMultisigWith.length == 0"
                  @click="signMultisig"
                >
                  {{ $t("pay.sign") }}
                </Button>
              </div>
              <div v-if="isSignedByAny && showFormSend">
                <h2>{{ $t("pay.send_to_other_signators") }}</h2>
                <Textarea
                  v-if="rawSignedTxn"
                  v-model="rawSignedTxn"
                  class="w-full my-2"
                  rows="4"
                />
              </div>
              <div v-if="showFormCombine">
                <h2 v-if="rawSignedTxn">{{ $t("pay.combine_title") }}:</h2>
                <Textarea
                  v-if="rawSignedTxn"
                  v-model="rawSignedTxnFriend"
                  class="w-full my-2"
                  rows="4"
                />
                <Button
                  v-if="rawSignedTxnFriend"
                  class="m-2"
                  :disabled="!rawSignedTxn && !rawSignedTxnInput"
                  @click="combineSignatures"
                >
                  {{ $t("pay.combine_action") }}
                </Button>
              </div>
              <Button
                v-if="
                  $route.name != 'PayFromWalletConnect' &&
                  $store.state.signer.returnTo != 'Arc14Participation'
                "
                class="m-2"
                :disabled="!thresholdMet"
                @click="sendMultisig"
              >
                {{ $t("pay.send_to_network") }}
              </Button>
              <Button
                v-if="$route.name == 'PayFromWalletConnect'"
                class="m-2"
                :disabled="!thresholdMet"
                @click="retToWalletConnect"
              >
                {{ $t("pay.return_to_wc") }}
              </Button>
              <Button
                v-if="$store.state.signer.returnTo == 'SignAll'"
                class="m-2"
                :disabled="!thresholdMet"
                @click="retToSignAll"
              >
                Return to multi tx signature
              </Button>
              <Button
                v-if="$store.state.signer.returnTo == 'ScheduledPayments'"
                class="m-2"
                :disabled="!thresholdMet"
                @click="retToScheduledPayments"
              >
                Return to scheduled payment management
              </Button>
              <Button
                v-if="$store.state.signer.returnTo == 'Arc14Participation'"
                class="m-2"
                :disabled="!thresholdMet"
                @click="retToArc14Participation"
              >
                Return to the account
              </Button>
              <Button
                v-if="isSignedByAny"
                severity="secondary"
                class="m-2"
                @click="toggleShowFormSend"
              >
                {{ $t("pay.toggle_send_to_others_form") }}
              </Button>
              <Button
                severity="secondary"
                class="m-2"
                @click="toggleShowFormCombine"
              >
                {{ $t("pay.toggle_combine_with_others_form") }}
              </Button>
            </div>

            <Message severity="info" v-if="!tx && processing" class="my-2">
              <ProgressSpinner
                style="width: 1em; height: 1em"
                strokeWidth="5"
              />

              {{ $t("pay.state_sending") }}
            </Message>
            <Message severity="info" v-if="tx && !confirmedRound" class="my-2">
              <ProgressSpinner
                style="width: 1em; height: 1em"
                strokeWidth="5"
              />

              {{ $t("pay.state_sent") }} {{ tx }}.
              {{ $t("pay.state_waiting_confirm") }}
            </Message>
            <Message severity="success" v-if="confirmedRound" class="my-2">
              {{ $t("pay.state_confirmed") }} <b>{{ confirmedRound }}</b
              >. {{ $t("pay.transaction") }}: {{ tx }}.
            </Message>
            <Message severity="error" v-if="error" class="my-2">
              {{ $t("pay.error") }}: {{ error }}
            </Message>
            <Message
              severity="error"
              v-if="$store.state.toast.lastError"
              class="my-2"
            >
              {{ $t("global.last_error") }}: {{ $store.state.toast.lastError }}
            </Message>

            <JsonViewer
              v-if="
                txn &&
                $store &&
                $store.state &&
                $store.state.config &&
                $store.state.config.dev
              "
              :value="txn"
              copyable
              boxed
              sort
            />
          </template>
        </Card>
      </form>
    </div>
  </main-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, getCurrentInstance } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";
import aprotocol, {
  AlgorandProtocolParameters,
} from "../shared/algorand-protocol-parse";
import MainLayout from "../layouts/Main.vue";
import InputMask from "primevue/inputmask";
import { JsonViewer } from "vue3-json-viewer";
import SelectAccount from "../components/SelectAccount.vue";
import AlgorandAddress from "../components/AlgorandAddress.vue";
import MultiSelect from "primevue/multiselect";
import algosdk from "algosdk";
import type { ExtendedStoredAsset, StoredAsset } from "@/store/indexer";
import type {
  AccountAssetHolding,
  IAccountData,
  WalletAccount,
} from "@/store/wallet";
import type { PreparePaymentPayload } from "@/store/algod";

const store = useStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const $t = t;
const $store = store;
const $route = route;
const instance = getCurrentInstance();
if (!instance) {
  throw new Error("Failed to resolve current Vue instance in Sign.vue");
}
const $filters = instance.appContext.config.globalProperties
  .$filters as GlobalFilters;

type TransactionPublicKey = {
  publicKey?: Uint8Array;
};

type TwoFactorWalletAccount = WalletAccount & {
  primaryAccount?: string;
  twoFactorAuthProvider?: string;
  recoveryAccount?: string;
};

type GlobalFilters = {
  formatCurrency: (
    value: number | string,
    symbol?: string,
    decimals?: number
  ) => string;
  [key: string]: (...args: any[]) => unknown;
};

type LooseTransaction = algosdk.Transaction & {
  amount?: number | string | bigint;
  name?: string;
  tag?: string;
  firstRound?: number | string | bigint;
  lastRound?: number | string | bigint;
  voteFirst?: number | string | bigint;
  voteLast?: number | string | bigint;
  from?: TransactionPublicKey;
  to?: TransactionPublicKey;
  reKeyTo?: TransactionPublicKey;
};

type DecodedSignedTransaction = ReturnType<
  typeof algosdk.decodeSignedTransaction
>;

const toSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const payFromDirect = ref("");
const payamount = ref(0);
const fee = ref(0.001);
const payTo = ref("");
const rekeyTo = ref("");
const paynote = ref("");
const paynoteB64 = ref(false);
const page = ref("review");
const tx = ref<string | null>(null);
const processing = ref(false);
const error = ref<string | undefined>("");
const confirmedRound = ref<bigint | null>(null);
const txn = ref<LooseTransaction | null>(null);
const rawSignedTxn = ref<string | null>(null);
const rawSignedTxnFriend = ref<string | null>(null);
const rawSignedTxnInput = ref<string | null>(null);
const signMultisigWith = ref<string[]>([]);
const multisigDecoded = ref<DecodedSignedTransaction | null>(null);
const assets = ref<ExtendedStoredAsset[]>([]);
const asset = ref<bigint | undefined>(undefined);
const assetObj = ref<ExtendedStoredAsset>({
  assetId: 0n,
  name: store.state.config.tokenSymbol,
  unitName: store.state.config.tokenSymbol,
  decimals: 6,
  type: "Native",
  amount: 0n,
  label: store.state.config.tokenSymbol,
});
const scan = ref(false);
const forceAsset = ref(false);
const txtCode = ref("");
const accountFor2FARealm = ref("");
const accountFor2FAAuthToken = ref("");
const showFormSend = ref(false);
const showFormCombine = ref(false);
const fatal = ref("");
const b64decode = ref<AlgorandProtocolParameters | null>(null);
const note = ref("");

const walletAccounts = computed<WalletAccount[]>(
  () => store.state.wallet.privateAccounts
);
const envName = computed(() => store.state.config.env);
const tokenSymbol = computed(() => store.state.config.tokenSymbol);

const payFrom = computed(() => {
  const accountParam = toSingleParam(
    route.params.account as string | string[] | undefined
  );
  return accountParam ?? payFromDirect.value;
});
const account = computed(() =>
  walletAccounts.value.find((a) => a.addr == payFrom.value)
);
const accountData = computed<IAccountData | undefined>(() => {
  const currentAccount = account.value;
  if (!currentAccount?.data) return undefined;
  return currentAccount.data[envName.value];
});
const rekeyedToInfo = computed(() => {
  const data = accountData.value;
  if (!data?.rekeyedTo) return undefined;
  return walletAccounts.value.find((a) => a.addr == data.rekeyedTo);
});
const rekeyedMultisigParams = computed(() => {
  const data = accountData.value;
  if (!data?.rekeyedTo) return undefined;
  const info = walletAccounts.value.find((a) => a.addr == data.rekeyedTo);
  return info?.params;
});
const multisigParams = computed<algosdk.MultisigMetadata | undefined>(() => {
  if (rekeyedToInfo.value) {
    return rekeyedMultisigParams.value;
  }
  return account.value?.params;
});
const multisigTxn = computed<LooseTransaction | null>(() => {
  const txValue = multisigDecoded.value?.txn;
  return txValue ? (txValue as LooseTransaction) : null;
});
const multisigSubsig = computed(
  () => multisigDecoded.value?.msig?.subsig ?? []
);
const isMultisig = computed(() => !!multisigParams.value);
const accountsFromMultisig = computed(() => {
  const params = multisigParams.value;
  if (!params?.addrs) return [];
  const eligible = walletAccounts.value.filter(
    (a) => params.addrs.includes(a.addr) && (!!a.sk || a.type == "ledger")
  );
  const subsig = multisigDecoded.value?.msig?.subsig;
  if (!subsig) {
    return eligible;
  }
  return eligible.filter((entry) =>
    subsig.some((sig) => entry.addr == algosdk.encodeAddress(sig.pk) && !sig.s)
  );
});
const accountFor2FA = computed<TwoFactorWalletAccount | undefined>(() => {
  const params = multisigParams.value;
  if (!params?.addrs) return undefined;
  return walletAccounts.value.find(
    (a) => params.addrs.includes(a.addr) && a.type == "2faApi"
  ) as TwoFactorWalletAccount | undefined;
});
const accountFor2FAAddr = computed(() => accountFor2FA.value?.addr ?? "");
const accountFor2FAAddrPrimary = computed(
  () => accountFor2FA.value?.primaryAccount ?? ""
);
const accountFor2FAProvider = computed(
  () => accountFor2FA.value?.twoFactorAuthProvider ?? ""
);
const isSignedByAccountFor2FAAddr = computed(() => {
  if (!accountFor2FAAddr.value) return false;
  const subsig = multisigDecoded.value?.msig?.subsig;
  if (!subsig) return false;
  const sig = subsig.find(
    (entry) => algosdk.encodeAddress(entry.pk) === accountFor2FAAddr.value
  );
  return !!sig?.s;
});
const decimalsPower = computed(() => {
  const decimals = assetObj.value?.decimals ?? 6;
  return Math.pow(10, decimals);
});
const amountLong = computed(() =>
  Math.round(payamount.value * decimalsPower.value)
);
const feeLong = computed(() => fee.value * 1_000_000);
const isRekey = computed(() => {
  if (multisigDecoded.value?.txn?.rekeyTo) {
    return true;
  }
  const typeParam = toSingleParam(
    route.params.type as string | string[] | undefined
  );
  return typeParam === "rekey";
});
const selectedAssetFromAccount = computed(() => {
  const data = accountData.value;
  if (!data?.assets) return undefined;
  return Object.values(data.assets).find(
    (entry: AccountAssetHolding) => entry.assetId == BigInt(asset.value ?? 0n)
  );
});
const maxAmount = computed(() => {
  const data = accountData.value;
  if (!data) return 0;
  if (Number(asset.value) > 0) {
    if (!selectedAssetFromAccount.value) return 0;
    return (
      Number((selectedAssetFromAccount.value as any).amount ?? 0) /
      decimalsPower.value
    );
  }
  let ret = Number(data.amount ?? 0) / 1_000_000 - 0.1;
  ret -= fee.value;
  if (data.assets && Object.values(data.assets).length > 0) {
    ret -= Object.values(data.assets).length * 0.1;
  }
  return ret;
});
const isAuth = computed(() => store.state.wallet.isOpen);
const malformedAddress = computed(() => {
  const exemptTypes = ["appl", "keyreg", "acfg"];
  if (
    multisigDecoded.value?.txn?.type &&
    exemptTypes.includes(multisigDecoded.value.txn.type)
  ) {
    return false;
  }
  if (txn.value?.type && exemptTypes.includes(txn.value.type)) {
    return false;
  }
  return !payTo.value || !algosdk.isValidAddress(payTo.value);
});
const showSignaturesCount = computed(() => {
  const signed =
    multisigDecoded.value?.msig?.subsig?.filter((s) => !!s.s).length ?? 0;
  const threshold = multisigDecoded.value?.msig?.thr ?? 0;
  return `${signed} / ${threshold}`;
});
const isSignedByAny = computed(() => {
  const subsig = multisigDecoded.value?.msig?.subsig;
  if (!subsig) return false;
  return subsig.filter((s) => !!s.s).length > 0;
});
const thresholdMet = computed(() => {
  const subsig = multisigDecoded.value?.msig?.subsig;
  if (!subsig) return false;
  const threshold = multisigDecoded.value?.msig?.thr ?? 0;
  return subsig.filter((s) => !!s.s).length >= threshold;
});
const isRawSignedTxnSigned = computed(
  () => !!rawSignedTxn.value && rawSignedTxn.value.length > 0
);
const msigNote = computed(() => {
  const txValue = multisigDecoded.value?.txn;
  if (!txValue?.note) return "";
  return Buffer.from(txValue.note).toString("utf8");
});

const setNoRedirectAction = (payload?: unknown) =>
  store.dispatch("config/setNoRedirect", payload);
const prolongAction = () => store.dispatch("wallet/prolong");
const makePaymentAction = (payload: Record<string, unknown>) =>
  store.dispatch("algod/makePayment", payload);
const waitForConfirmationAction = (payload: {
  txId: string;
  timeout: number;
}): Promise<algosdk.modelsv2.PendingTransactionResponse | undefined> =>
  store.dispatch("algod/waitForConfirmation", payload);
const preparePaymentAction = (payload: PreparePaymentPayload) =>
  store.dispatch("algod/preparePayment", payload);
const lastActiveAccountAction = (payload: { addr: string }) =>
  store.dispatch("wallet/lastActiveAccount", payload);
const sendRawTransactionAction = (payload: {
  signedTxn: Uint8Array;
}): Promise<algosdk.modelsv2.PostTransactionsResponse> =>
  store.dispatch("algod/sendRawTransaction", payload);
const updateAccountAction = (payload: { info: WalletAccount }) =>
  store.dispatch("wallet/updateAccount", payload);
const getAssetAction = (payload: {
  assetIndex: bigint;
}): Promise<StoredAsset | undefined> =>
  store.dispatch("indexer/getAsset", payload);
const setEnvAction = (payload: { env: string }) =>
  store.dispatch("config/setEnv", payload);
const openSuccessAction = (message: string) =>
  store.dispatch("toast/openSuccess", message);
const openErrorAction = (message: string) =>
  store.dispatch("toast/openError", message);
const signerSignMultisigAction = (payload: {
  msigTx: Uint8Array;
  signator: string;
  txn: LooseTransaction | null;
}) => store.dispatch("signer/signMultisig", payload);
const signerCreateMultisigTransactionAction = (payload: {
  txn: LooseTransaction | null;
  from: string;
}) => store.dispatch("signer/createMultisigTransaction", payload);
const signerSetSignedAction = (payload: { signed: Uint8Array }) =>
  store.dispatch("signer/setSigned", payload);
const signTransactionAction = (payload: {
  from: string;
  signator: string;
  tx: LooseTransaction | null;
}) => store.dispatch("signer/signTransaction", payload);
const signAuthTxAction = (payload: { account: string; realm: string }) =>
  store.dispatch("arc14/signAuthTx", payload);
const getRealmAction = (payload: { twoFactorAuthProvider: string }) =>
  store.dispatch("fa2/getRealm", payload);
const signTwoFactorAction = (payload: {
  rawSignedTxnInput: string | null;
  secondaryAccount?: string;
  txtCode: string;
  authToken: string;
  twoFactorAuthProvider: string;
}) => store.dispatch("fa2/signTwoFactor", payload);
const resetErrorAction = () => store.dispatch("toast/resetError");
const storeArc14AuthAction = (payload: {
  chain: string;
  addr: string;
  realm: string;
  token: string;
}) => store.dispatch("arc14/storeArc14Auth", payload);
const returnToAction = (payload: string) =>
  store.dispatch("signer/returnTo", payload);

const arrayBufferToBase64 = (buffer: Uint8Array | ArrayBufferLike) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): Uint8Array => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const base64url2base64 = (input: string) => {
  let normalized = input.replaceAll(/-/g, "+").replaceAll(/_/g, "/");
  const pad = normalized.length % 4;
  if (pad) {
    if (pad === 1) {
      throw new Error(
        "InvalidLengthError: Input base64url string is the wrong length to determine padding"
      );
    }
    normalized += "=".repeat(4 - pad);
  }
  return normalized;
};

const base642base64url = (input: string) =>
  input.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const encodeAddress = (value?: Uint8Array) =>
  value ? algosdk.encodeAddress(value) : "";

const normalizeNumeric = (
  value?: number | string | bigint | null,
  fallback = 0
) => {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return Number(value);
};

const makeAssets = async () => {
  assets.value = [];
  const pushNativeAsset = (amount: bigint) => {
    assets.value.push({
      assetId: BigInt(0),
      amount,
      name: tokenSymbol.value,
      decimals: 6,
      unitName: tokenSymbol.value,
      type: "Native",
    });
  };
  if (accountData.value) {
    const nativeAmount = BigInt(accountData.value.amount ?? 0);
    pushNativeAsset(nativeAmount);
  } else {
    pushNativeAsset(0n);
  }
  if (isRekey.value) {
    return;
  }
  const data = accountData.value;
  if (data) {
    if (data.assets) {
      for (const accountDataAsset of Object.values(data.assets)) {
        const assetIndex = accountDataAsset.assetId;
        try {
          const fetchedAsset = (await getAssetAction({
            assetIndex: BigInt(assetIndex),
          })) as ExtendedStoredAsset | undefined;
          if (fetchedAsset) {
            const normalizedAmount = BigInt(accountDataAsset["amount"] ?? 0);
            assets.value.push({
              assetId: BigInt(accountDataAsset.assetId),
              amount: normalizedAmount,
              name: fetchedAsset.name,
              decimals: fetchedAsset.decimals,
              unitName: fetchedAsset.unitName,
              type: "ASA",
            });
          } else {
            console.error("Asset not loaded", accountDataAsset.assetId);
          }
        } catch (err) {
          console.error("Asset load failed", accountDataAsset.assetId, err);
        }
      }
    }
    if (data.arc200) {
      for (const accountAsset of Object.values(data.arc200)) {
        assets.value.push({
          assetId: BigInt(accountAsset.arc200id),
          amount: BigInt(accountAsset.balance),
          name: accountAsset.name,
          decimals: Number(accountAsset.decimals),
          unitName: accountAsset.symbol,
          type: "ARC200",
        });
      }
    }
  }
  if (route.params.toAccount) {
    parseToAccount();
  }
};

const reset = () => {
  error.value = "";
  confirmedRound.value = null;
  processing.value = true;
  page.value = "review";
  signMultisigWith.value = [];
  rawSignedTxn.value = null;
  rawSignedTxnInput.value = null;
};

const parseToAccount = () => {
  const encoded = toSingleParam(
    route.params.toAccount as string | string[] | undefined
  );
  if (!encoded) return;
  b64decode.value = aprotocol.parseAlgorandProtocolParameters(encoded);
  if (!b64decode.value) return;
  if (b64decode.value.payTo) {
    payTo.value = b64decode.value.payTo.replace(/[^\w\s]/gi, "");
  }
  if (b64decode.value.payamountbase !== undefined) {
    payamount.value =
      Number(b64decode.value.payamountbase) / decimalsPower.value;
  }
  if (b64decode.value.asset) {
    asset.value = BigInt(b64decode.value.asset);
    forceAsset.value = true;
  }
  if (b64decode.value.paynote) {
    paynote.value = b64decode.value.paynote;
  }
  if (b64decode.value.fee) {
    fee.value = Number(b64decode.value.fee);
  }
  if (b64decode.value.network && b64decode.value.network !== envName.value) {
    setEnvAction({ env: b64decode.value.network });
  }
};

const previewPaymentClick = (e?: Event) => {
  page.value = "review";
  error.value = "";
  confirmedRound.value = null;
  processing.value = false;
  prolongAction();
  e?.preventDefault();
};

const payMultisig = async () => {
  prolongAction();
  const enc = new TextEncoder();
  const noteEnc = enc.encode(paynote.value);
  if (!txn.value) {
    const data: PreparePaymentPayload = {
      payTo: payTo.value,
      payFrom: payFrom.value,
      amount: amountLong.value,
      noteEnc,
      fee: 1000,
      asset: assetObj.value.assetId,
    } as PreparePaymentPayload;
    if (rekeyTo.value) {
      data.reKeyTo = rekeyTo.value;
    }
    txn.value = (await preparePaymentAction(data)) as LooseTransaction;
  }
  if (!multisigParams.value || !txn.value) return;
  const rawSignedTxnBytes = algosdk.createMultisigTransaction(
    txn.value as algosdk.Transaction,
    multisigParams.value
  );
  rawSignedTxn.value = arrayBufferToBase64(rawSignedTxnBytes);
  rawSignedTxnInput.value = rawSignedTxn.value;
  multisigDecoded.value = algosdk.decodeSignedTransaction(
    base64ToArrayBuffer(rawSignedTxnInput.value)
  );
};

const signMultisig = async (e?: Event) => {
  prolongAction();
  e?.preventDefault();
  let rawSignedTxnBytes: Uint8Array | null = rawSignedTxnInput.value
    ? base64ToArrayBuffer(rawSignedTxnInput.value)
    : null;
  const selected = [...signMultisigWith.value];
  const params = multisigParams.value;
  if (params && typeof params.threshold === "string") {
    params.threshold = parseInt(params.threshold, 10);
  }
  if (!rawSignedTxnBytes) {
    rawSignedTxnBytes = (await signerCreateMultisigTransactionAction({
      txn: txn.value as LooseTransaction | null,
      from: payFrom.value,
    })) as Uint8Array;
  }
  if (!rawSignedTxnBytes) {
    throw new Error("Unable to load multisig transaction bytes");
  }
  for (const acc of accountsFromMultisig.value) {
    try {
      if (!acc.addr) continue;
      if (!selected.includes(acc.addr)) {
        continue;
      }
      const newTx = await signerSignMultisigAction({
        msigTx: rawSignedTxnBytes,
        signator: acc.addr,
        txn: txn.value as LooseTransaction | null,
      });
      await addSignature(newTx as string);
    } catch (err: any) {
      console.error("error adding signature", err);
      await openErrorAction(err?.message ?? String(err));
    }
  }
};

const signTxClick = async (e?: Event) => {
  prolongAction();
  e?.preventDefault();
  const signed = (await signTransactionAction({
    from: payFrom.value,
    signator: payFrom.value,
    tx: txn.value as LooseTransaction | null,
  })) as Uint8Array | undefined;
  if (signed) {
    rawSignedTxn.value = arrayBufferToBase64(signed);
  }
};

const submitSignedClick = async () => {
  try {
    processing.value = true;
    prolongAction();
    const signedBytes = new Uint8Array(
      Buffer.from(rawSignedTxn.value ?? "", "base64")
    );
    const result = await sendRawTransactionAction({
      signedTxn: signedBytes,
    });
    tx.value = result?.txid ?? null;
    if (!tx.value) {
      console.error("submitSignedClick failed");
      const message = t("pay.state_error_not_sent") as string;
      error.value = message;
      await openErrorAction(message);
      processing.value = false;
      return;
    }
    const confirmation = await waitForConfirmationAction({
      txId: tx.value,
      timeout: 4,
    });
    console.log("confirmation", confirmation);
    if (!confirmation) {
      const message = t("pay.state_error_not_sent") as string;
      console.error("confirmation not received");
      error.value = message;
      await openErrorAction(message);
      processing.value = false;
      return;
    }
    if (confirmation.confirmedRound) {
      confirmedRound.value = confirmation.confirmedRound;
      processing.value = false;
      if (rekeyTo.value) {
        const info = {
          addr: payFrom.value,
          address: payFrom.value,
          rekeyedTo: rekeyTo.value,
        } as WalletAccount;
        await updateAccountAction({ info });
        await openSuccessAction(
          `Information about rekeying to address ${rekeyTo.value} has been stored`
        );
      }
    }
    if (confirmation.poolError) {
      error.value = confirmation.poolError;
      processing.value = false;
    }
  } catch (err: any) {
    console.error("submitSignedClick.error", err);
    await openErrorAction(err?.message ?? String(err));
    error.value = err?.message ?? String(err);
    processing.value = false;
  }
};

const payPaymentClick = async (e?: Event) => {
  prolongAction();
  e?.preventDefault();
  try {
    if (isMultisig.value) {
      await payMultisig();
      return;
    }
    reset();
    prolongAction();
    const enc = new TextEncoder();
    let noteEnc = enc.encode(paynote.value);
    if (paynoteB64.value) {
      try {
        noteEnc = Uint8Array.from(base64ToArrayBuffer(paynote.value));
      } catch (err) {
        console.error("Error converting note from b64", err);
        noteEnc = enc.encode(paynote.value);
      }
    }
    if (!isRekey.value) {
      rekeyTo.value = "";
    }
    const payload: Record<string, unknown> = {
      payTo: payTo.value,
      payFrom: payFrom.value,
      amount: amountLong.value,
      noteEnc,
      fee: feeLong.value,
      asset: asset.value,
      reKeyTo: rekeyTo.value,
    };
    const sentTx = (await makePaymentAction(payload)) as string | null;
    tx.value = sentTx;
    if (!tx.value) {
      console.error("makePaymentAction failed");
      processing.value = false;
      const message = t("pay.state_error_not_sent") as string;
      error.value = message;
      await openErrorAction(message);
      const search = "should have been authorized by ";
      const lastError = store.state.toast.lastError ?? "";
      if (lastError.includes(search)) {
        const info = lastError.substring(
          lastError.indexOf(search) + search.length
        );
        const rekeyedTo = info.substring(0, info.indexOf(" "));
        if (rekeyedTo) {
          const update = {
            addr: payFrom.value,
            address: payFrom.value,
            rekeyedTo,
          } as WalletAccount;
          await updateAccountAction({ info: update });
          await openSuccessAction(
            `Information about rekeying to address ${rekeyedTo} has been stored`
          );
        }
      }
      return;
    }
    const confirmation = await waitForConfirmationAction({
      txId: tx.value,
      timeout: 4,
    });
    if (!confirmation) {
      const message = t("pay.state_error_not_sent") as string;
      error.value = message;
      processing.value = false;
      return;
    }
    if (confirmation.confirmedRound) {
      confirmedRound.value = confirmation.confirmedRound;
      processing.value = false;
      if (rekeyTo.value) {
        const update = {
          addr: payFrom.value,
          address: payFrom.value,
          rekeyedTo: rekeyTo.value,
        } as WalletAccount;
        await updateAccountAction({ info: update });
        await openSuccessAction(
          `Information about rekeying to address ${rekeyTo.value} has been stored`
        );
      }
    }
    if (confirmation.poolError) {
      error.value = confirmation.poolError;
      processing.value = false;
    }
  } catch (err: any) {
    error.value = err?.message ?? String(err);
  }
};

const loadMultisig = (e?: Event) => {
  prolongAction();
  e?.preventDefault();
  multisigDecoded.value = algosdk.decodeSignedTransaction(
    base64ToArrayBuffer(rawSignedTxnInput.value ?? "")
  );
  txn.value = multisigDecoded.value.txn as LooseTransaction;
  rawSignedTxn.value = rawSignedTxnInput.value;
  page.value = "review";
  if (
    multisigDecoded.value?.msig &&
    typeof multisigDecoded.value.msig.thr === "string"
  ) {
    multisigDecoded.value.msig.thr = parseInt(
      multisigDecoded.value.msig.thr,
      10
    );
  }
};

const sendMultisig = async (e?: Event) => {
  prolongAction();
  error.value = "";
  processing.value = true;
  try {
    e?.preventDefault();
    const signedTxn = base64ToArrayBuffer(rawSignedTxn.value ?? "");
    let message = "";
    try {
      const response = await sendRawTransactionAction({
        signedTxn,
      });
      tx.value = response?.txid ?? null;
    } catch (err: any) {
      message = err?.message ?? String(err);
      await openErrorAction(message);
      console.error(err);
    }
    if (!tx.value) {
      const fallback = t("pay.state_error_not_sent") as string;
      error.value = fallback;
      processing.value = false;
      const search = "should have been authorized by ";
      if (message.includes(search)) {
        const info = message.substring(message.indexOf(search) + search.length);
        const rekeyedTo = info.substring(0, info.indexOf(" "));
        if (rekeyedTo) {
          const update = {
            addr: payFrom.value,
            address: payFrom.value,
            rekeyedTo,
          } as WalletAccount;
          await updateAccountAction({ info: update });
          await openSuccessAction(
            `Information about rekeying to address ${rekeyedTo} has been stored`
          );
        }
      }
      return;
    }
    const confirmation = await waitForConfirmationAction({
      txId: tx.value,
      timeout: 4,
    });
    if (confirmation?.confirmedRound) {
      confirmedRound.value = confirmation.confirmedRound;
      processing.value = false;
    }
    if (confirmation?.poolError) {
      error.value = confirmation.poolError;
      processing.value = false;
    }
  } catch (err: any) {
    error.value = err?.message ?? String(err);
    processing.value = false;
  }
};

const toggleCamera = (e: Event) => {
  e.preventDefault();
  scan.value = !scan.value;
  if (scan.value) {
    payTo.value = "";
  }
};

const test = (e: Event) => {
  e.preventDefault();
  const tests = [
    "015LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U",
    "algorand://025LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?&note=123",
    "algorand://035LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?&note=234&&",
    "algorand://045LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?xnote=345&fee=3&amount=1000&asset=456",
    "algorand://046LXHA5MEDMOJ2ZAITLZWYSU6W25BF2FCXJ5KQRDUB2NT2T7DPAAFYT3U?note=SGVsbG8=&noteB64=1&fee=0.001&amount=1",
  ];
  tests.forEach((value) => onDecodeQR(value));
};

const isEncoded = (uri: string) => {
  const value = uri || "";
  return value !== decodeURIComponent(value);
};

const onDecodeQR = (result: string) => {
  if (scan.value && result) {
    if (
      result.startsWith("algorand://") ||
      result.startsWith("web+algorand://")
    ) {
      let parsed = result.replace("web+algorand://", "");
      parsed = parsed.replace("algorand://", "");
      const qIndex = parsed.indexOf("?");
      if (qIndex < 0) {
        payTo.value = parsed.replace(/[^\w\s]/gi, "");
      } else {
        payTo.value = parsed.substring(0, qIndex).replace(/[^\w\s]/gi, "");
        const params = parsed.substring(qIndex + 1).split("&");
        let noteValue: string | undefined;
        let noteB64Flag: string | undefined;
        let amount: string | undefined;
        let assetValue: string | undefined;
        let feeValue: string | undefined;
        let decimals: string | undefined;
        for (const param of params) {
          const eqIndex = param.indexOf("=");
          if (eqIndex > 0) {
            const name = param.substring(0, eqIndex);
            const value = param.substring(eqIndex + 1);
            switch (name) {
              case "note":
              case "xnote":
              case "label":
                noteValue = value;
                break;
              case "noteB64":
                noteB64Flag = value;
                break;
              case "amount":
                amount = value;
                break;
              case "asset":
                assetValue = value;
                break;
              case "fee":
                feeValue = value;
                break;
              case "decimals":
                decimals = value;
                break;
            }
          }
        }
        if (noteValue) {
          paynote.value = noteValue;
          if (isEncoded(paynote.value)) {
            paynote.value = decodeURIComponent(paynote.value);
          }
        }
        paynoteB64.value = !!noteB64Flag;
        if (decimals !== undefined) {
          if (amount) {
            payamount.value = Number(amount) / Math.pow(10, Number(decimals));
          }
          if (feeValue) {
            fee.value = Number(feeValue) / Math.pow(10, Number(decimals));
          }
        } else {
          if (amount) {
            payamount.value = Number(amount);
          }
          if (feeValue) {
            fee.value = Number(feeValue);
          }
        }
        if (assetValue) {
          asset.value = BigInt(assetValue);
        }
      }
    } else {
      payTo.value = result.replace(/[^\w\s]/gi, "");
    }
  }
  if (payTo.value) {
    scan.value = false;
  }
};

const setMaxAmount = (e: Event) => {
  e.preventDefault();
  payamount.value = maxAmount.value;
};

const addSignature = async (base64Tx: string) => {
  if (!base64Tx) return;
  const tx1 = new Uint8Array(Buffer.from(rawSignedTxn.value ?? "", "base64"));
  const tx2 = new Uint8Array(Buffer.from(base64Tx, "base64"));
  const merged = algosdk.mergeMultisigTransactions([tx1, tx2]);
  rawSignedTxn.value = Buffer.from(merged).toString("base64");
  multisigDecoded.value = algosdk.decodeSignedTransaction(
    base64ToArrayBuffer(rawSignedTxn.value)
  );
  await signerSetSignedAction({ signed: merged });
};

const combineSignatures = async (e?: Event) => {
  prolongAction();
  e?.preventDefault();
  if (!rawSignedTxnFriend.value) return;
  try {
    await addSignature(rawSignedTxnFriend.value);
    showFormCombine.value = false;
  } catch (err: any) {
    await openErrorAction(err?.message ?? String(err));
  }
};

const retToWalletConnect = () => {
  returnToAction("");
  router.push({ name: "Connect" });
};

const retToSignAll = () => {
  returnToAction("");
  router.push({ name: "SignAll" });
};

const retToScheduledPayments = () => {
  returnToAction("");
  router.push({ name: "scheduled-payment" });
};

const retToArc14Participation = async () => {
  if (!multisigDecoded.value?.txn || !rawSignedTxn.value) return;
  const signedAuthTxn = rawSignedTxn.value;
  const authToken = "SigTx " + signedAuthTxn;
  await storeArc14AuthAction({
    chain: envName.value,
    addr: algosdk.encodeAddress(multisigDecoded.value.txn.sender.publicKey),
    realm: Buffer.from(multisigDecoded.value.txn.note ?? []).toString("utf-8"),
    token: authToken,
  });
  returnToAction("");
  router.push({ name: "AccountOverview" });
};

const sign2FAClick = async (e?: Event) => {
  try {
    prolongAction();
    e?.preventDefault();
    const newTx = (await signTwoFactorAction({
      rawSignedTxnInput: rawSignedTxnInput.value,
      secondaryAccount: accountFor2FA.value?.recoveryAccount,
      txtCode: txtCode.value,
      authToken: accountFor2FAAuthToken.value,
      twoFactorAuthProvider: accountFor2FAProvider.value,
    })) as string;
    await addSignature(newTx);
  } catch (err: any) {
    const message = err?.message ?? String(err);
    console.error("failed to sign 2fa tx", message, err);
    await openErrorAction(message);
  }
};

const loadAuthToken = () => {
  if (!accountFor2FARealm.value) return false;
  const map = store.state.arc14.address2chain2realm2token;
  if (!map) return false;
  const envTokens = map[envName.value];
  if (!envTokens) return false;
  const addressTokens = envTokens[accountFor2FAAddr.value];
  if (!addressTokens) return false;
  const token = addressTokens[accountFor2FARealm.value];
  if (!token) return false;
  accountFor2FAAuthToken.value = token;
  return true;
};

const authorizePrimaryAccountClick = async (e?: Event) => {
  prolongAction();
  e?.preventDefault();
  accountFor2FAAuthToken.value = (await signAuthTxAction({
    account: accountFor2FAAddrPrimary.value,
    realm: accountFor2FARealm.value,
  })) as string;
};

const toggleShowFormSend = (e?: Event) => {
  prolongAction();
  e?.preventDefault();
  showFormSend.value = !showFormSend.value;
};

const toggleShowFormCombine = (e?: Event) => {
  prolongAction();
  e?.preventDefault();
  showFormCombine.value = !showFormCombine.value;
};

watch(payFromDirect, (value) => {
  if (value) {
    void lastActiveAccountAction({ addr: value });
  }
});

watch(account, () => {
  void makeAssets();
});

watch(asset, async (assetValue) => {
  const numericAssetId = BigInt(assetValue ?? 0n);
  if (!Number.isNaN(numericAssetId) && numericAssetId > 0n) {
    const fetched = (await getAssetAction({
      assetIndex: numericAssetId,
    })) as StoredAsset | undefined;
    if (fetched) {
      assetObj.value = { ...fetched, amount: undefined };
    }
  }
  payamount.value = 0;
  if (route.params.toAccount) {
    parseToAccount();
  }
});

watch(isAuth, (auth) => {
  if (
    auth &&
    store.state.wallet.privateAccounts &&
    store.state.wallet.privateAccounts.length === 1
  ) {
    payFromDirect.value = store.state.wallet.privateAccounts[0].addr;
  }
});

onMounted(async () => {
  if (!payFrom.value) {
    await setNoRedirectAction();
  }
  await resetErrorAction();
  payTo.value = store.state.wallet.lastPayTo || "";
  if (!route.params.rawSignedTxnInput) {
    await openErrorAction("Payload not found");
    return;
  }
  if (route.params.toAccount) {
    parseToAccount();
  }
  const rawSignedParam = toSingleParam(
    route.params.rawSignedTxnInput as string | string[] | undefined
  );
  if (rawSignedParam) {
    try {
      const b64 = base64url2base64(rawSignedParam);
      rawSignedTxnInput.value = b64;
      const uint8buffer = base64ToArrayBuffer(b64);
      try {
        txn.value = algosdk.decodeUnsignedTransaction(
          uint8buffer
        ) as LooseTransaction;
      } catch (err) {
        try {
          const signed = algosdk.decodeSignedTransaction(uint8buffer);
          rawSignedTxn.value = b64;
          multisigDecoded.value = signed;
          txn.value = signed.txn as LooseTransaction;
        } catch (innerErr) {
          console.error("failed to parse tx", err, innerErr);
        }
      }
      if (txn.value?.payment?.receiver) {
        payTo.value = txn.value.payment.receiver.toString();
        payamount.value =
          Number(txn.value.payment.amount ?? 0) / decimalsPower.value;
      }
      if (txn.value?.assetTransfer?.receiver) {
        payTo.value = txn.value.assetTransfer.receiver.toString();
        asset.value = BigInt(txn.value.assetTransfer.assetIndex ?? 0);
        payamount.value =
          Number(txn.value.assetTransfer.amount ?? 0) / decimalsPower.value;
      } else {
        asset.value = undefined;
      }
      if (txn.value?.note) {
        note.value = Buffer.from(txn.value.note).toString("utf8");
      }
      await makeAssets();
      if (txn.value?.genesisID && txn.value.genesisID !== envName.value) {
        fatal.value = `Genesis id of the tx ${txn.value.genesisID} does not match current network ${envName.value}`;
      }
      page.value = "review";
    } catch (err) {
      console.error("Input is not valid base64-url format ", err);
    }
  }
  const accountParam = toSingleParam(
    route.params.account as string | string[] | undefined
  );
  if (accountParam) {
    await lastActiveAccountAction({ addr: accountParam });
  }
  if (
    store.state.wallet.privateAccounts &&
    store.state.wallet.privateAccounts.length === 1
  ) {
    payFromDirect.value = store.state.wallet.privateAccounts[0].addr;
  }
  if (isRekey.value && account.value?.addr) {
    payTo.value = account.value.addr;
  }
  if (payTo.value && !payFromDirect.value) {
    payFromDirect.value = payTo.value;
  }
  if (accountFor2FAProvider.value) {
    try {
      accountFor2FARealm.value = (await getRealmAction({
        twoFactorAuthProvider: accountFor2FAProvider.value,
      })) as string;
      loadAuthToken();
    } catch (err: any) {
      const message = err?.message ?? String(err);
      console.error("failed to request realm", message, err);
      await openErrorAction(message);
    }
  }
});

defineExpose({
  signTxClick,
  submitSignedClick,
  payPaymentClick,
  payMultisig,
  signMultisig,
  loadMultisig,
  sendMultisig,
  toggleCamera,
  test,
  onDecodeQR,
  setMaxAmount,
  combineSignatures,
  retToWalletConnect,
  retToSignAll,
  retToScheduledPayments,
  retToArc14Participation,
  sign2FAClick,
  authorizePrimaryAccountClick,
  toggleShowFormSend,
  toggleShowFormCombine,
  parseToAccount,
  previewPaymentClick,
  encodeAddress,
  base642base64url,
});
</script>
