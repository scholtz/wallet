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

// Raw USDC sitting in the account earns nothing - Folks lending is Mainnet only.
const show = computed(
  () =>
    isFolksLendNetwork(store.state.config.env) &&
    accountData.value !== undefined &&
    usdcBalance.value > 0n,
);
const amountText = computed(() =>
  fromBaseUnits(usdcBalance.value, 6).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  }),
);

// Route: /swap/:account/:toAsset/:fromAsset - preselects USDC -> fUSDC.
const openSwap = () =>
  router.push(
    `/swap/${sender.value}/${FOLKS_USDC_POOL.fAssetId}/${FOLKS_USDC_POOL.assetId}`,
  );
</script>
