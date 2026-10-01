<template>
  <div v-if="showSwapTo" class="field grid">
    <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
    <div class="col-12 md:col-10">
      <Button
        :label="t('swap.folks_lend.swap_to_fusdc')"
        severity="secondary"
        data-testid="folks-swap-to-fusdc-button"
        @click="emit('swap-to', BigInt(FOLKS_USDC_POOL.fAssetId))"
      />
    </div>
  </div>
  <div v-if="visible" class="my-3" data-testid="folks-fusdc-optin">
    <Message severity="info">
      {{ t("swap.folks_lend.optin_hint") }}
    </Message>
    <Message severity="error" v-if="lacksAlgo">
      {{ t("swap.folks_lend.insufficient_algo", { asset: "fUSDC" }) }}
    </Message>
    <Button
      :disabled="processing || lacksAlgo"
      :loading="processing"
      :label="t('swap.folks_lend.optin_button')"
      data-testid="folks-fusdc-optin-button"
      @click="optIn"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import { useStore } from "@/store";
import { useFolksLendAccount } from "@/composables/useFolksLendAccount";
import {
  assertFolksLendTxnsSafe,
  buildOptInTxn,
  FOLKS_USDC_POOL,
  hasAlgoForOptIn,
  isFolksLendNetwork,
} from "@/scripts/folksLend/transactions";

const props = defineProps<{
  /** The asset currently selected as the swap source. */
  asset: bigint | null;
  /** The asset currently selected as the swap destination. */
  toAsset: bigint | null;
}>();
const emit = defineEmits<{
  /** The opt-in is confirmed and the reloaded account holds the asset. */
  (e: "opted-in", assetId: bigint): void;
  /** The user asked to swap the selected source (USDC) into this asset. */
  (e: "swap-to", assetId: bigint): void;
}>();

const { t } = useI18n();
const store = useStore();
const { sender, accountData, holdings, balanceOf, reloadAccount, signSendConfirm } =
  useFolksLendAccount();
const processing = ref(false);
// Account for which the opt-in is already confirmed on-chain. The prompt stays
// hidden for it even if the holdings refresh failed, so it can never be
// submitted twice.
const confirmedFor = ref<string | null>(null);

// Only decided once the account's holdings are loaded - missing data must not
// be mistaken for "not opted in".
const visible = computed(
  () =>
    isFolksLendNetwork(store.state.config.env) &&
    props.asset === BigInt(FOLKS_USDC_POOL.assetId) &&
    accountData.value !== undefined &&
    confirmedFor.value !== sender.value &&
    balanceOf(FOLKS_USDC_POOL.fAssetId) === undefined,
);
// Shortcut under the source asset: USDC is the source, fUSDC is held (opted
// in) but not yet the destination.
const showSwapTo = computed(
  () =>
    isFolksLendNetwork(store.state.config.env) &&
    props.asset === BigInt(FOLKS_USDC_POOL.assetId) &&
    accountData.value !== undefined &&
    balanceOf(FOLKS_USDC_POOL.fAssetId) !== undefined &&
    props.toAsset !== BigInt(FOLKS_USDC_POOL.fAssetId),
);
const lacksAlgo = computed(
  () =>
    accountData.value !== undefined &&
    !hasAlgoForOptIn(
      BigInt(accountData.value.amount ?? 0),
      holdings.value.length,
    ),
);

const optIn = async () => {
  if (processing.value) return;
  processing.value = true;
  // The account can change in the router while we await signing/confirmation.
  const from = sender.value;
  try {
    await store.dispatch("wallet/prolong");
    const suggestedParams: algosdk.SuggestedParams = await store.dispatch(
      "algod/getTransactionParams",
    );
    const tx = buildOptInTxn(from, FOLKS_USDC_POOL.fAssetId, suggestedParams);
    assertFolksLendTxnsSafe([tx], from);
    const result = await signSendConfirm(from, [tx]);
    if (!result) return; // the signer already surfaced the error toast
    if (!result.confirmed) {
      store.dispatch("toast/openError", t("swap.folks_lend.not_confirmed"));
      return;
    }
    confirmedFor.value = from;
    store.dispatch("toast/openSuccess", t("swap.folks_lend.optin_done"));
    // Tell the page only once the reloaded account really holds fUSDC, so it
    // never selects a destination asset that is not in its list. A failed
    // refresh is not a failed opt-in - the prompt stays hidden (see
    // confirmedFor) and the holdings catch up on the next reload.
    const refreshed = await reloadAccount(from);
    if (
      refreshed &&
      from === sender.value &&
      balanceOf(FOLKS_USDC_POOL.fAssetId) !== undefined
    ) {
      emit("opted-in", BigInt(FOLKS_USDC_POOL.fAssetId));
    }
  } catch (e) {
    store.dispatch("toast/openError", (e as Error).message);
  } finally {
    processing.value = false;
  }
};
</script>
