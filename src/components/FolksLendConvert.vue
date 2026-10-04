<template>
  <div class="my-3" data-testid="folks-lend">
    <h2>{{ t("swap.folks_lend.title") }}</h2>
    <p>{{ t("swap.folks_lend.description") }}</p>
    <div class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0">
        {{ t("swap.folks_lend.receive") }}
      </label>
      <div class="col-12 md:col-10" data-testid="folks-lend-receive">
        <strong>{{ receiveText }}</strong>
      </div>
    </div>
    <div class="field grid" v-if="pool">
      <label class="col-12 mb-2 md:col-2 md:mb-0">
        {{ t("swap.folks_lend.rate") }}
      </label>
      <div class="col-12 md:col-10" data-testid="folks-lend-rate">
        1 fUSDC = {{ rateText }} USDC
      </div>
    </div>
    <div class="field grid" v-if="pool">
      <label class="col-12 mb-2 md:col-2 md:mb-0">
        {{ t("swap.folks_lend.apy") }}
      </label>
      <div class="col-12 md:col-10" data-testid="folks-lend-apy">
        {{ apyText }}%
      </div>
    </div>
    <div class="field grid" v-if="messagesShown">
      <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
      <div class="col-12 md:col-10">
        <Message severity="error" v-if="rateError" class="my-1">
          {{ t("swap.folks_lend.rate_error") }}
        </Message>
        <Message severity="info" v-if="needsOptIn" class="my-1">
          {{ t("swap.folks_lend.opt_in_note", { asset: toUnit }) }}
        </Message>
        <Message severity="error" v-if="lacksAlgoForOptIn" class="my-1">
          {{ t("swap.folks_lend.insufficient_algo", { asset: toUnit }) }}
        </Message>
        <Message severity="error" v-if="insufficient" class="my-1">
          {{ t("swap.folks_lend.insufficient", { asset: fromUnit }) }}
        </Message>
        <Message severity="success" v-if="lastTxId" class="my-1">
          {{ t("swap.folks_lend.success", { txid: lastTxId }) }}
        </Message>
      </div>
    </div>
    <!-- Same placement as the "Get quote" row of the regular swap form. -->
    <div class="field grid">
      <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
      <div class="col-12 md:col-10">
        <Button
          class="my-2"
          :label="submitLabel"
          :disabled="!canSubmit"
          :loading="processing"
          data-testid="folks-lend-submit"
          @click="submit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import { useStore } from "@/store";
import { useFolksLendAccount } from "@/composables/useFolksLendAccount";
import {
  calcFolksLendReceived,
  exchangeRate,
  fromBaseUnits,
  toBaseUnits,
  type FolksLendDirection,
} from "@/scripts/folksLend/convert";
import {
  assertFolksLendTxnsSafe,
  buildFolksLendTxns,
  FOLKS_USDC_POOL,
  fetchFolksPoolRate,
  hasAlgoForOptIn,
  isFolksLendNetwork,
  type FolksPoolRate,
} from "@/scripts/folksLend/transactions";

const DECIMALS = 6;

const props = defineProps<{
  /** Implied by the swap form's assets: USDC -> fUSDC deposit, fUSDC -> USDC withdraw. */
  direction: FolksLendDirection;
  /** The amount entered in the swap form, in whole units of the source asset. */
  amount: number;
}>();
const emit = defineEmits<{
  /** The conversion is confirmed - the page can reset its amount. */
  (e: "converted"): void;
}>();

const { t } = useI18n();
const store = useStore();
const {
  sender,
  accountData,
  holdings,
  balanceOf,
  reloadAccount,
  signSendConfirm,
} = useFolksLendAccount();

const pool = ref<FolksPoolRate | null>(null);
const rateError = ref(false);
const processing = ref(false);
const lastTxId = ref("");

const usdcBalance = computed(() => balanceOf(FOLKS_USDC_POOL.assetId) ?? 0n);
const fBalanceRaw = computed(() => balanceOf(FOLKS_USDC_POOL.fAssetId));
const fBalance = computed(() => fBalanceRaw.value ?? 0n);

// The asset the account still has to opt in to for this direction (fUSDC
// before a deposit, USDC before a withdrawal). Only decided once the
// account's holdings are actually loaded - missing data must not be mistaken
// for "not opted in".
const optInAssetId = computed<number | undefined>(() => {
  if (accountData.value === undefined) return undefined;
  if (props.direction === "deposit") {
    return fBalanceRaw.value === undefined
      ? FOLKS_USDC_POOL.fAssetId
      : undefined;
  }
  return balanceOf(FOLKS_USDC_POOL.assetId) === undefined
    ? FOLKS_USDC_POOL.assetId
    : undefined;
});
const needsOptIn = computed(() => optInAssetId.value !== undefined);

const messagesShown = computed(
  () =>
    rateError.value ||
    needsOptIn.value ||
    lacksAlgoForOptIn.value ||
    insufficient.value ||
    !!lastTxId.value,
);

const lacksAlgoForOptIn = computed(
  () =>
    needsOptIn.value &&
    accountData.value !== undefined &&
    !hasAlgoForOptIn(
      BigInt(accountData.value.amount ?? 0),
      holdings.value.length,
    ),
);

const fromUnit = computed(() =>
  props.direction === "deposit" ? "USDC" : "fUSDC",
);
const toUnit = computed(() =>
  props.direction === "deposit" ? "fUSDC" : "USDC",
);
const balance = computed(() =>
  props.direction === "deposit" ? usdcBalance.value : fBalance.value,
);

const amountBase = computed(() => toBaseUnits(props.amount, DECIMALS));
const insufficient = computed(() => amountBase.value > balance.value);
const receivedBase = computed(() =>
  pool.value && amountBase.value > 0n
    ? calcFolksLendReceived(
        props.direction,
        amountBase.value,
        pool.value.depositIndex,
      )
    : 0n,
);
const receiveText = computed(
  () =>
    `${fromBaseUnits(receivedBase.value, DECIMALS).toFixed(DECIMALS)} ${toUnit.value}`,
);
const rateText = computed(() =>
  pool.value ? exchangeRate(pool.value.depositIndex).toFixed(6) : "",
);
const apyText = computed(() =>
  pool.value ? (pool.value.apy * 100).toFixed(2) : "",
);
const submitLabel = computed(() =>
  props.direction === "deposit"
    ? t("swap.folks_lend.submit_deposit")
    : t("swap.folks_lend.submit_withdraw"),
);
const canSubmit = computed(
  () =>
    !processing.value &&
    isFolksLendNetwork(store.state.config.env) &&
    accountData.value !== undefined &&
    !!pool.value &&
    amountBase.value > 0n &&
    receivedBase.value > 0n &&
    !insufficient.value &&
    !lacksAlgoForOptIn.value,
);

// Only the newest request may update the state, so a slow older response
// (timer vs. submit) can never overwrite a newer one.
let rateRequestId = 0;
/**
 * Loads the pool rate. A background refresh that fails keeps the last good
 * rate on screen instead of blanking the estimate on one transient error.
 */
const loadRate = async (background = false) => {
  const requestId = ++rateRequestId;
  if (!background) rateError.value = false;
  try {
    const algod: algosdk.Algodv2 = await store.dispatch("algod/getAlgod");
    const rate = await fetchFolksPoolRate(algod);
    if (requestId !== rateRequestId) return;
    pool.value = rate;
    rateError.value = false;
  } catch (e) {
    console.error("Unable to load Folks Finance pool info", e);
    if (requestId !== rateRequestId) return;
    if (!background || !pool.value) {
      pool.value = null;
      rateError.value = true;
    }
  }
};

const submit = async () => {
  if (!canSubmit.value) return;
  processing.value = true;
  lastTxId.value = "";
  const submittedAmount = props.amount;
  // The account can change in the router while we await signing/confirmation.
  const from = sender.value;
  try {
    await store.dispatch("wallet/prolong");
    // The transactions carry no client-side rate (a deposit sends the USDC
    // amount, a withdrawal asks the pool for a variable payout), so the
    // displayed estimate is informational and needs no refetch here.
    const suggestedParams: algosdk.SuggestedParams = await store.dispatch(
      "algod/getCheckedTransactionParams",
    );
    const txns = buildFolksLendTxns({
      direction: props.direction,
      sender: from,
      amount: amountBase.value,
      optInAssetId: optInAssetId.value,
      suggestedParams,
    });
    assertFolksLendTxnsSafe(txns, from);
    const result = await signSendConfirm(from, txns);
    if (!result) return; // the signer already surfaced the error toast
    if (result.confirmed) {
      lastTxId.value = result.txid;
      // Do not discard an amount the user changed while signing/confirming.
      if (props.amount === submittedAmount) emit("converted");
    } else {
      // Submitted, but no confirmation (still pending or rejected) - tell the
      // user to check before retrying.
      store.dispatch("toast/openError", t("swap.folks_lend.not_confirmed"));
    }
    // reloadAccount never throws, so a failed refresh cannot be mistaken for
    // a failed conversion.
    await reloadAccount(from);
  } catch (e) {
    store.dispatch("toast/openError", (e as Error).message);
  } finally {
    processing.value = false;
  }
};

// A new direction or amount makes the previous result message stale (the
// reset to 0 after a conversion keeps its message).
watch(
  () => props.direction,
  () => {
    lastTxId.value = "";
  },
);
watch(
  () => props.amount,
  (value) => {
    if (value !== 0) lastTxId.value = "";
  },
);

// The pool rate is only needed while this panel is shown. Keep the estimate
// and APY fresh on a long-open page, and retry after a failed load.
const RATE_REFRESH_MS = 60_000;
let rateTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  loadRate();
  rateTimer = setInterval(() => loadRate(true), RATE_REFRESH_MS);
});
onUnmounted(() => {
  if (rateTimer !== undefined) clearInterval(rateTimer);
});
</script>
