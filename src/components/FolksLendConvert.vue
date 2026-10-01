<template>
  <Card v-if="available" class="mt-3" data-testid="folks-lend">
    <template #title>{{ t("swap.folks_lend.title") }}</template>
    <template #content>
      <p>{{ t("swap.folks_lend.description") }}</p>
      <div class="field grid">
        <div class="col-12">
          <SelectButton
            v-model="direction"
            :options="directionOptions"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
            data-testid="folks-lend-direction"
          />
        </div>
      </div>
      <div class="field grid">
        <label for="folks-lend-amount" class="col-12 mb-2 md:col-2 md:mb-0">
          {{ t("swap.folks_lend.amount") }}
        </label>
        <div class="col-12 md:col-10">
          <InputGroup>
            <InputNumber
              inputId="folks-lend-amount"
              v-model="amount"
              :min="0"
              :max="maxAmount"
              :maxFractionDigits="DECIMALS"
              class="w-full"
            />
            <InputGroupAddon>{{ fromUnit }}</InputGroupAddon>
            <Button severity="secondary" @click="amount = maxAmount">{{
              t("pay.set_max")
            }}</Button>
          </InputGroup>
        </div>
      </div>
      <div class="field grid">
        <label class="col-12 mb-2 md:col-2 md:mb-0">
          {{ t("swap.folks_lend.receive") }}
        </label>
        <div class="col-12 md:col-10" data-testid="folks-lend-receive">
          {{ receiveText }}
        </div>
      </div>
      <div class="field grid" v-if="pool">
        <label class="col-12 mb-2 md:col-2 md:mb-0">
          {{ t("swap.folks_lend.rate") }}
        </label>
        <div class="col-12 md:col-10" data-testid="folks-lend-rate">
          1 fUSDC = {{ rateText }} USDC · {{ t("swap.folks_lend.apy") }}
          {{ apyText }}%
        </div>
      </div>
      <Message severity="error" v-if="rateError">
        {{ t("swap.folks_lend.rate_error") }}
      </Message>
      <Message severity="info" v-if="needsOptIn">
        {{ t("swap.folks_lend.opt_in_note", { asset: toUnit }) }}
      </Message>
      <Message severity="error" v-if="lacksAlgoForOptIn">
        {{ t("swap.folks_lend.insufficient_algo", { asset: toUnit }) }}
      </Message>
      <Message severity="error" v-if="insufficient">
        {{ t("swap.folks_lend.insufficient", { asset: fromUnit }) }}
      </Message>
      <Message severity="success" v-if="lastTxId">
        {{ t("swap.folks_lend.success", { txid: lastTxId }) }}
      </Message>
      <Button
        :label="submitLabel"
        :disabled="!canSubmit"
        :loading="processing"
        data-testid="folks-lend-submit"
        @click="submit"
      />
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import SelectButton from "primevue/selectbutton";
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

const direction = ref<FolksLendDirection>("deposit");
const amount = ref(0);
const pool = ref<FolksPoolRate | null>(null);
const rateError = ref(false);
const processing = ref(false);
const lastTxId = ref("");

const directionOptions = computed(() => [
  { value: "deposit", label: t("swap.folks_lend.mode_deposit") },
  { value: "withdraw", label: t("swap.folks_lend.mode_withdraw") },
]);

const available = computed(() => isFolksLendNetwork(store.state.config.env));
const usdcBalance = computed(() => balanceOf(FOLKS_USDC_POOL.assetId) ?? 0n);
const fBalanceRaw = computed(() => balanceOf(FOLKS_USDC_POOL.fAssetId));
const fBalance = computed(() => fBalanceRaw.value ?? 0n);

// The asset the account still has to opt in to for this direction (fUSDC
// before a deposit, USDC before a withdrawal). Only decided once the
// account's holdings are actually loaded - missing data must not be mistaken
// for "not opted in".
const optInAssetId = computed<number | undefined>(() => {
  if (accountData.value === undefined) return undefined;
  if (direction.value === "deposit") {
    return fBalanceRaw.value === undefined
      ? FOLKS_USDC_POOL.fAssetId
      : undefined;
  }
  return balanceOf(FOLKS_USDC_POOL.assetId) === undefined
    ? FOLKS_USDC_POOL.assetId
    : undefined;
});
const needsOptIn = computed(() => optInAssetId.value !== undefined);

const lacksAlgoForOptIn = computed(
  () =>
    needsOptIn.value &&
    accountData.value !== undefined &&
    !hasAlgoForOptIn(BigInt(accountData.value.amount ?? 0), holdings.value.length),
);
const fromUnit = computed(() =>
  direction.value === "deposit" ? "USDC" : "fUSDC",
);
const toUnit = computed(() =>
  direction.value === "deposit" ? "fUSDC" : "USDC",
);
const balance = computed(() =>
  direction.value === "deposit" ? usdcBalance.value : fBalance.value,
);
const maxAmount = computed(() => fromBaseUnits(balance.value, DECIMALS));

const amountBase = computed(() => toBaseUnits(amount.value, DECIMALS));
const insufficient = computed(() => amountBase.value > balance.value);
const receivedBase = computed(() =>
  pool.value && amountBase.value > 0n
    ? calcFolksLendReceived(
        direction.value,
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
  direction.value === "deposit"
    ? t("swap.folks_lend.submit_deposit")
    : t("swap.folks_lend.submit_withdraw"),
);
const canSubmit = computed(
  () =>
    !processing.value &&
    accountData.value !== undefined &&
    !!pool.value &&
    amountBase.value > 0n &&
    receivedBase.value > 0n &&
    !insufficient.value &&
    !lacksAlgoForOptIn.value,
);

const loadRate = async () => {
  rateError.value = false;
  try {
    const algod: algosdk.Algodv2 = await store.dispatch("algod/getAlgod");
    pool.value = await fetchFolksPoolRate(algod);
  } catch (e) {
    console.error("Unable to load Folks Finance pool info", e);
    pool.value = null;
    rateError.value = true;
  }
};

const submit = async () => {
  if (!canSubmit.value) return;
  processing.value = true;
  lastTxId.value = "";
  // The account can change in the router while we await signing/confirmation.
  const from = sender.value;
  try {
    await store.dispatch("wallet/prolong");
    // Re-read the rate right before building so the withdrawal payout we
    // request can never exceed what the pool will actually pay.
    await loadRate();
    if (!pool.value) return;
    const suggestedParams: algosdk.SuggestedParams = await store.dispatch(
      "algod/getTransactionParams",
    );
    const txns = buildFolksLendTxns({
      direction: direction.value,
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
      amount.value = 0;
    } else {
      // Submitted, but no confirmation (still pending or rejected) - tell the
      // user to check before retrying.
      store.dispatch("toast/openError", t("swap.folks_lend.not_confirmed"));
    }
    // The conversion is already confirmed - a failed refresh must not be
    // reported as a failed conversion.
    await reloadAccount(from);
  } catch (e) {
    store.dispatch("toast/openError", (e as Error).message);
  } finally {
    processing.value = false;
  }
};

watch(direction, () => {
  amount.value = 0;
  lastTxId.value = "";
});
// Also covers switching to Mainnet while this page is already open.
watch(
  available,
  (isAvailable) => {
    if (isAvailable) loadRate();
  },
  { immediate: true },
);
</script>
