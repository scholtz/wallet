<template>
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
import { useRoute } from "vue-router";
import algosdk from "algosdk";
import { useStore } from "@/store";
import {
  buildOptInTxn,
  FOLKS_USDC_POOL,
  hasAlgoForOptIn,
  isFolksLendNetwork,
} from "@/scripts/folksLend/transactions";

const props = defineProps<{
  /** The asset currently selected as the swap source. */
  asset: bigint | null;
}>();
const emit = defineEmits<{
  /** The opt-in is confirmed and the account has been reloaded. */
  (e: "opted-in", assetId: bigint): void;
}>();

const { t } = useI18n();
const store = useStore();
const route = useRoute();
const processing = ref(false);

const sender = computed(() => String(route.params.account));
const accountData = computed(
  () =>
    store.state.wallet.privateAccounts.find((a) => a.addr === sender.value)
      ?.data?.[store.state.config.env],
);
const holdings = computed(() => accountData.value?.assets ?? []);

// Only decided once the account's holdings are loaded - missing data must not
// be mistaken for "not opted in".
const visible = computed(
  () =>
    isFolksLendNetwork(store.state.config.env) &&
    props.asset === BigInt(FOLKS_USDC_POOL.assetId) &&
    accountData.value !== undefined &&
    !holdings.value.some(
      (a) => Number(a.assetId) === FOLKS_USDC_POOL.fAssetId,
    ),
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
  try {
    await store.dispatch("wallet/prolong");
    const suggestedParams: algosdk.SuggestedParams = await store.dispatch(
      "algod/getTransactionParams",
    );
    const tx = buildOptInTxn(
      sender.value,
      FOLKS_USDC_POOL.fAssetId,
      suggestedParams,
    );
    const signed: Uint8Array | undefined = await store.dispatch(
      "signer/signTransaction",
      { from: sender.value, tx },
    );
    if (!signed) return; // the signer already surfaced the error toast
    const res: algosdk.modelsv2.PostTransactionsResponse = await store.dispatch(
      "algod/sendRawTransaction",
      { signedTxn: signed },
    );
    const confirmation = await store.dispatch("algod/waitForConfirmation", {
      txId: res.txid,
      timeout: 4,
    });
    if (!confirmation) {
      store.dispatch("toast/openError", t("swap.folks_lend.not_confirmed"));
      return;
    }
    const info = await store.dispatch("indexer/accountInformation", {
      addr: sender.value,
    });
    if (info) await store.dispatch("wallet/updateAccount", { info });
    store.dispatch("toast/openSuccess", t("swap.folks_lend.optin_done"));
    // The balance is reloaded - the parent can now offer fUSDC as destination.
    emit("opted-in", BigInt(FOLKS_USDC_POOL.fAssetId));
  } catch (e) {
    store.dispatch("toast/openError", (e as Error).message);
  } finally {
    processing.value = false;
  }
};
</script>
