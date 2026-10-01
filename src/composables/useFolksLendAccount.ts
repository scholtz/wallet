import { computed } from "vue";
import { useRoute } from "vue-router";
import algosdk from "algosdk";
import { useStore } from "@/store";

/**
 * Account lookup, signing and submission shared by the Folks lending UI
 * (the deposit/withdraw card and the fUSDC opt-in prompt), so both handle
 * holdings, errors and refreshes identically.
 */
export function useFolksLendAccount() {
  const store = useStore();
  const route = useRoute();

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

  /** Re-reads the account from the indexer. Returns false if that failed. */
  const reloadAccount = async (addr: string): Promise<boolean> => {
    try {
      const info = await store.dispatch("indexer/accountInformation", { addr });
      if (!info) return false;
      await store.dispatch("wallet/updateAccount", { info });
      return true;
    } catch (e) {
      console.error("Unable to refresh the account", e);
      return false;
    }
  };

  /**
   * Signs every transaction of the (already grouped and validated) list with
   * the account's own signer, submits it and waits for confirmation.
   * Returns undefined when signing was cancelled/failed (the signer already
   * showed its error), otherwise the tx id and whether it got confirmed.
   * Submission errors are thrown.
   */
  const signSendConfirm = async (
    from: string,
    txns: algosdk.Transaction[],
  ): Promise<{ txid: string; confirmed: boolean } | undefined> => {
    const signed: Uint8Array[] = [];
    for (const tx of txns) {
      const stx: Uint8Array | undefined = await store.dispatch(
        "signer/signTransaction",
        { from, tx },
      );
      if (!stx) return undefined;
      signed.push(stx);
    }
    const res: algosdk.modelsv2.PostTransactionsResponse = await store.dispatch(
      "algod/sendRawTransaction",
      { signedTxn: signed },
    );
    const confirmation = await store.dispatch("algod/waitForConfirmation", {
      txId: res.txid,
      timeout: 4,
    });
    return { txid: res.txid, confirmed: !!confirmation };
  };

  return {
    sender,
    accountData,
    holdings,
    balanceOf,
    reloadAccount,
    signSendConfirm,
  };
}
