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
import { useRoute } from "vue-router";
import algosdk from "algosdk";
import SelectButton from "primevue/selectbutton";
import { useStore } from "@/store";
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
  isFolksLendNetwork,
  type FolksPoolRate,
} from "@/scripts/folksLend/transactions";

const DECIMALS = 6;

const { t } = useI18n();
const store = useStore();
const route = useRoute();

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
const sender = computed(() => String(route.params.account));

const accountData = computed(
  () =>
    store.state.wallet.privateAccounts.find((a) => a.addr === sender.value)
      ?.data?.[store.state.config.env],
);
const holdings = computed(() => accountData.value?.assets ?? []);

const balanceOf = (assetId: number): bigint | undefined => {
  const holding = holdings.value.find((a) => Number(a.assetId) === assetId);
  return holding === undefined ? undefined : BigInt(holding.amount);
};

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

// Conservative estimate (same basis as the Swap page: 0.1 ALGO base + 0.1 per
// held asset; apps only raise the real minimum, so this never blocks wrongly):
// an opt-in must leave room for one more 0.1 ALGO reservation plus the fees.
const OPT_IN_FEES_MICROALGO = 10_000n;
const lacksAlgoForOptIn = computed(() => {
  if (!needsOptIn.value || accountData.value === undefined) return false;
  const minBalance = 100_000n * BigInt(holdings.value.length + 1);
  const needed = minBalance + 100_000n + OPT_IN_FEES_MICROALGO;
  return BigInt(accountData.value.amount ?? 0) < needed;
});
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

const reloadAccount = async () => {
  const info = await store.dispatch("indexer/accountInformation", {
    addr: sender.value,
  });
  if (info) await store.dispatch("wallet/updateAccount", { info });
};

const submit = async () => {
  if (!canSubmit.value) return;
  processing.value = true;
  lastTxId.value = "";
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
      sender: sender.value,
      amount: amountBase.value,
      optInAssetId: optInAssetId.value,
      suggestedParams,
    });
    assertFolksLendTxnsSafe(txns, sender.value);
    const signed: Uint8Array[] = [];
    for (const tx of txns) {
      const stx: Uint8Array | undefined = await store.dispatch(
        "signer/signTransaction",
        { from: sender.value, tx },
      );
      if (!stx) return; // the signer already surfaced the error toast
      signed.push(stx);
    }
    const res: algosdk.modelsv2.PostTransactionsResponse =
      await store.dispatch("algod/sendRawTransaction", { signedTxn: signed });
    const confirmation = await store.dispatch("algod/waitForConfirmation", {
      txId: res.txid,
      timeout: 4,
    });
    if (confirmation) {
      lastTxId.value = res.txid;
      amount.value = 0;
    } else {
      // Submitted, but no confirmation (still pending or rejected) - tell the
      // user to check before retrying.
      store.dispatch("toast/openError", t("swap.folks_lend.not_confirmed"));
    }
    // The conversion is already confirmed - a failed refresh must not be
    // reported as a failed conversion.
    await reloadAccount().catch((e: unknown) =>
      console.error("Unable to refresh the account after the conversion", e),
    );
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
