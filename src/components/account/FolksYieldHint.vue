<template>
  <Message
    v-if="show"
    severity="info"
    icon="pi pi-percentage"
    class="my-2"
    data-testid="folks-yield-hint"
  >
    <p class="m-0">
      {{ t("acc_overview.folks_yield_message", { amount: amountText }) }}
    </p>
    <Button
      class="mt-2"
      :label="t('acc_overview.folks_yield_button')"
      data-testid="folks-yield-hint-button"
      @click="openSwap"
    />
  </Message>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useStore } from "@/store";
import { useFolksLendAccount } from "@/composables/useFolksLendAccount";
import {
  FOLKS_USDC_POOL,
  isFolksLendNetwork,
} from "@/scripts/folksLend/transactions";
import { fromBaseUnits } from "@/scripts/folksLend/convert";

const { t } = useI18n();
const store = useStore();
const router = useRouter();
const { sender, accountData, balanceOf } = useFolksLendAccount();

const usdcBalance = computed(() => balanceOf(FOLKS_USDC_POOL.assetId) ?? 0n);

// Below one cent it is dust that is not worth a suggestion.
const MIN_HINT_BALANCE = 10_000n;

// Raw USDC sitting in the account earns nothing - Folks lending is Mainnet only.
const show = computed(
  () =>
    isFolksLendNetwork(store.state.config.env) &&
    accountData.value !== undefined &&
    usdcBalance.value >= MIN_HINT_BALANCE,
);
// Floored to cents so the text never claims more (10.999 -> 10.99) or less.
const amountText = computed(() =>
  (Math.floor(fromBaseUnits(usdcBalance.value, 6) * 100) / 100).toLocaleString(
    undefined,
    { minimumFractionDigits: 0, maximumFractionDigits: 2 },
  ),
);

// Route: /swap/:account/:toAsset/:fromAsset. With fUSDC held, USDC -> fUSDC is
// preselected and the lending panel opens. Otherwise only USDC is preselected
// as the source: the swap page then offers the "Opt in to fUSDC" button and
// selects fUSDC as the destination once it is confirmed (fUSDC cannot be
// chosen in the form before the account holds it).
const openSwap = () => {
  const destination =
    balanceOf(FOLKS_USDC_POOL.fAssetId) !== undefined
      ? FOLKS_USDC_POOL.fAssetId
      : 0;
  return router.push(
    `/swap/${sender.value}/${destination}/${FOLKS_USDC_POOL.assetId}`,
  );
};
</script>
