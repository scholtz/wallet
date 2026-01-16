// composables/useSwap.ts - Composable for swap functionality
import { ref, computed, Ref } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
import { dexAggregators } from "../scripts/dexAggregators";
import type { SwapContext } from "../scripts/aggregators/types";
import type { Account, SwapStore } from "../types/swap";
import algosdk from "algosdk";
import formatCurrency from "../scripts/numbers/formatCurrency";
import { RootState } from "@/store";
import { ExtendedStoredAsset, StoredAsset } from "@/store/indexer";
import { AccountAssetHolding } from "@/store/wallet";

const normalizeAmount = (value: number | bigint | undefined | null): number => {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return 0;
  return Number(value);
};

export function useSwap() {
  const store = useStore<RootState>();
  const route = useRoute();

  // Reactive state
  const assets: Ref<ExtendedStoredAsset[]> = ref([]);
  const asset: Ref<bigint | null> = ref(null);
  const toAsset: Ref<bigint | null> = ref(null);
  const payamount: Ref<number> = ref(0);
  const fromAssetObj: Ref<StoredAsset | undefined> = ref(undefined);
  const toAssetObj: Ref<StoredAsset | undefined> = ref(undefined);
  const txsDetails: Ref<string> = ref(
    "Select assets, quantity and request quote"
  );
  const hasSK: Ref<boolean | null> = ref(null);
  const processingQuote: Ref<boolean> = ref(false);
  const processingOptin: Ref<boolean> = ref(false);
  const note: Ref<string> = ref("");
  const error: Ref<string> = ref("");
  const slippage: Ref<number> = ref(0.1);
  const fee: Ref<number> = ref(0);
  const loadingAssets: Ref<boolean> = ref(true);

  // Initialize aggregator data dynamically with proper typing
  const aggregatorData: Record<string, Ref<any>> = {};
  dexAggregators.forEach((agg) => {
    aggregatorData[agg.quotesKey] = ref({});
    aggregatorData[agg.txnsKey] = ref(
      agg.txnsKey === "deflexTxs" ? { groupMetadata: [] } : []
    );
    aggregatorData[agg.processingKey] = ref(false);
    aggregatorData[agg.enabledKey] = ref(
      agg.name === "folks" || agg.name === "deflex" || agg.name === "biatec"
    );
  });

  // Computed properties (Independent of context)
  const formInvalid = computed<boolean>(
    () =>
      !(
        asset.value !== null &&
        toAsset.value !== null &&
        payamount.value > 0 &&
        !processingQuote.value
      )
  );

  const account = computed(() =>
    store.state.wallet.privateAccounts.find(
      (a: any) => a.addr == route.params.account
    )
  );

  const accountData = computed(() => {
    if (!account.value) return false;
    if (!account.value.data) return false;
    return account.value.data[store.state.config.env];
  });

  const selectedAssetFromAccount = computed(() =>
    accountData.value
      ? accountData.value.assets?.find(
          (a: AccountAssetHolding) =>
            BigInt(a.assetId) == BigInt(asset.value ?? 0n)
        )
      : undefined
  );

  const fromAssetDecimals = computed<number>(() => {
    let decimals = 6;
    if (fromAssetObj.value && fromAssetObj.value.decimals !== undefined) {
      decimals = fromAssetObj.value.decimals;
    }
    return decimals;
  });

  const decimalsPower = computed<number>(() =>
    Math.pow(10, fromAssetDecimals.value)
  );

  const toAssetDecimals = computed<number>(() => {
    let decimals = 6;
    if (toAssetObj.value && toAssetObj.value.decimals !== undefined) {
      decimals = toAssetObj.value.decimals;
    }
    return decimals;
  });

  const maxAmount = computed<number>(() => {
    if (!account.value) return 0;
    const accountInfo =
      accountData.value && typeof accountData.value === "object"
        ? accountData.value
        : null;
    if (!accountInfo) return 0;

    if (asset.value !== null && asset.value > 0n) {
      const selectedAmount = normalizeAmount(
        selectedAssetFromAccount.value?.amount
      );
      return selectedAmount / decimalsPower.value;
    }

    let ret = normalizeAmount(accountInfo.amount) / 1_000_000 - 0.1;
    ret -= fee.value;
    const assetsLength = accountInfo["assets"]?.length ?? 0;
    if (assetsLength > 0) {
      ret -= assetsLength * 0.1;
    }
    return ret;
  });

  const stepAmount = computed<number>(() =>
    Math.pow(10, -1 * fromAssetDecimals.value)
  );

  const appsToOptIn = computed<number[]>(() => {
    const requiredAppOptIns =
      aggregatorData.deflexQuotes?.value?.requiredAppOptIns ?? [];
    const ret: number[] = [];
    if (!account.value) return [];
    const optedInAppIds =
      "apps-local-state" in account.value
        ? account.value["apps-local-state"].map((state: any) =>
            parseInt(state.id)
          )
        : [];

    for (let i = 0; i < requiredAppOptIns.length; i++) {
      const requiredAppId = requiredAppOptIns[i];
      if (!optedInAppIds.includes(requiredAppId)) {
        ret.push(requiredAppId);
      }
    }
    return ret;
  });

  const requiresOptIn = computed<boolean>(() => appsToOptIn.value.length > 0);

  const unit = computed<string>(() => {
    if (!fromAssetObj.value) return "";
    if (fromAssetObj.value.unitName) return fromAssetObj.value.unitName;
    return fromAssetObj.value.name || "";
  });

  const fromAssetUnit = computed<string>(() => {
    if (!fromAssetObj.value) return "";
    if (fromAssetObj.value.unitName) return fromAssetObj.value.unitName;
    return fromAssetObj.value.name || "";
  });

  const toAssetUnit = computed<string>(() => {
    if (!toAssetObj.value) return "";
    if (toAssetObj.value.unitName) return toAssetObj.value.unitName;
    return toAssetObj.value.name || "";
  });

  const pair = computed<string>(
    () => `${fromAssetUnit.value}/${toAssetUnit.value}`
  );

  const pairReversed = computed<string>(
    () => `${toAssetUnit.value}/${fromAssetUnit.value}`
  );

  // Helper functions (Moved up)
  const checkNetwork = (): string | false => {
    const env = store.state.config.env;
    if (env == "mainnet-v1.0" || env == "mainnet") {
      return "mainnet";
    }
    if (env == "testnet-v1.0" || env == "testnet") {
      return "testnet";
    }
    return false;
  };

  const reloadAccount = async (): Promise<void> => {
    await store
      .dispatch("indexer/accountInformation", {
        addr: route.params.account,
      })
      .then((info: any) => {
        if (info) {
          store.dispatch("wallet/updateAccount", { info });
        }
      });
    const senderSK = await store.dispatch("wallet/getSK", {
      addr: route.params.account,
    });
    hasSK.value = senderSK && senderSK.length > 0;
  };

  // Context definition
  const context: SwapContext = {
    // Basic properties from SwapComponentData
    assets,
    asset,
    toAsset,
    payamount,
    account: account as unknown as Ref<Account | undefined>,
    fromAssetObj,
    toAssetObj,
    txsDetails,
    hasSK,
    processingQuote,
    processingOptin,
    note,
    error,
    slippage,
    fee,

    // Computed properties
    fromAssetDecimals,
    toAssetDecimals,
    requiresOptIn,

    // Store and route access (for SwapComponent interface)
    $store: store as unknown as SwapStore,
    $route: route as any,
    dexAggregators,
    aggregatorData,

    // Methods
    openSuccess: (message: string) =>
      store.dispatch("toast/openSuccess", message),
    openError: (message: string) => store.dispatch("toast/openError", message),
    axiosGet: (config: { url: string }) => store.dispatch("axios/get", config),
    axiosPost: (config: { url: string; body?: any; config?: any }) =>
      store.dispatch("axios/post", config),
    getSK: (config: { addr: string }) => store.dispatch("wallet/getSK", config),
    getAsset: (config: { assetIndex: number | bigint }) =>
      store.dispatch("indexer/getAsset", config),
    sendRawTransaction: (config: {
      signedTxn: Uint8Array | Uint8Array[];
    }): Promise<algosdk.modelsv2.PostTransactionsResponse> =>
      store.dispatch("algod/sendRawTransaction", config),
    waitForConfirmation: (config: { txId: string; timeout: number }) =>
      store.dispatch("algod/waitForConfirmation", config),
    prolong: () => store.dispatch("wallet/prolong"),
    reloadAccount,
    checkNetwork,
    signAuthTx: (config: { account: string; realm: string }) =>
      store.dispatch("arc14/signAuthTx", config),
  };

  // Computed properties dependent on context
  const allowExecuteDeflex = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "deflex");
    return agg ? agg.allowExecute(context) : false;
  });

  const allowExecuteFolks = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "folks");
    return agg ? agg.allowExecute(context) : false;
  });

  const allowExecuteBiatec = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "biatec");
    return agg ? agg.allowExecute(context) : false;
  });

  const isFolksQuoteBetter = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "folks");
    return agg ? agg.isQuoteBetter(context) : false;
  });

  const isBiatecQuoteBetter = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "biatec");
    return agg ? agg.isQuoteBetter(context) : false;
  });

  const isDeflexQuoteBetter = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "deflex");
    return agg ? agg.isQuoteBetter(context) : false;
  });

  // Methods dependent on context or other methods
  const makeAssets = async (): Promise<void> => {
    loadingAssets.value = true;
    assets.value = [];
    if (accountData.value) {
      const balance = formatCurrency(
        accountData.value.amount,
        store.state.config.tokenSymbol,
        6
      );
      assets.value.push({
        assetId: 0n,
        amount: BigInt(accountData.value.amount ?? 0n),
        name: store.state.config.tokenSymbol,
        decimals: 6,
        unitName: store.state.config.tokenSymbol,
        type: "Native",
        label: `${store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
      });
    } else {
      const balance = formatCurrency(0, store.state.config.tokenSymbol, 6);
      assets.value.push({
        assetId: 0n,
        amount: 0n,
        name: store.state.config.tokenSymbol,
        decimals: 6,
        unitName: store.state.config.tokenSymbol,
        type: "Native",
        label: `${store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
      });
    }

    if (accountData.value && accountData.value.assets) {
      // Parallel fetch all asset infos
      console.log("Fetching asset infos for assets", accountData.value.assets);
      const assetPromises = accountData.value.assets.map(
        (asset: AccountAssetHolding) =>
          store
            .dispatch("indexer/getAsset", {
              assetIndex: BigInt(asset.assetId ?? (asset as any)["asset-id"]),
            })
            .catch(() => null) // Ignore errors for individual assets
      );
      const assetInfos = (await Promise.all(assetPromises)) as StoredAsset[];
      console.log("Fetched asset infos", assetInfos);
      for (let index = 0; index < accountData.value.assets.length; index++) {
        const assetInfo = assetInfos[index];
        if (assetInfo) {
          const balance = formatCurrency(
            accountData.value.assets[index]["amount"],
            assetInfo.unitName ? assetInfo.unitName : assetInfo.name ?? "",
            assetInfo.decimals ?? 6
          );

          assets.value.push({
            assetId: BigInt(accountData.value.assets[index].assetId),
            amount: BigInt(accountData.value.assets[index]["amount"]),
            name: assetInfo.name ?? "",
            decimals: assetInfo.decimals ?? 6,
            unitName: assetInfo.unitName ?? "",
            type: "ASA",
            label: `${assetInfo["name"]} (ASA ${accountData.value.assets[index].assetId}) Balance: ${balance}`,
          });
        } else {
          console.error(
            "Asset not loaded",
            accountData.value.assets[index].assetId
          );
        }
      }
    }
    loadingAssets.value = false;
    console.log("makeAssets", assets.value);
  };

  const clickGetQuote = async (): Promise<void> => {
    await store.dispatch("wallet/prolong");
    note.value = "";
    error.value = "";
    processingQuote.value = true;
    txsDetails.value = "";

    // Reset all aggregator data
    dexAggregators.forEach((agg) => {
      aggregatorData[agg.quotesKey].value = {};
      aggregatorData[agg.txnsKey].value =
        agg.txnsKey === "deflexTxs" ? { groupMetadata: [] } : [];
    });

    const promises = dexAggregators
      .filter((agg) => aggregatorData[agg.enabledKey].value)
      .map((agg) => agg.getQuote(context));

    await Promise.all(promises);
    processingQuote.value = false;
  };

  const clickExecuteFolks = async (): Promise<void> => {
    const agg = dexAggregators.find((a) => a.name === "folks");
    if (agg) {
      await agg.execute(context);
      await reloadAccount();
    }
  };

  const clickExecuteBiatec = async (): Promise<void> => {
    const agg = dexAggregators.find((a) => a.name === "biatec");
    if (agg) {
      await agg.execute(context);
      await reloadAccount();
    }
  };

  const clickExecuteDeflex = async (): Promise<void> => {
    const agg = dexAggregators.find((a) => a.name === "deflex");
    if (agg) {
      await agg.execute(context);
      await reloadAccount();
    }
  };

  const swapTokens = (): void => {
    const tmp = toAsset.value;
    toAsset.value = asset.value;
    asset.value = tmp;
  };

  const clickOptInToApps = async (): Promise<void> => {
    processingOptin.value = true;
    const params = await store.dispatch("algod/getTransactionParams");

    let ret = "Processed in txs: ";
    for (const app of appsToOptIn.value) {
      const appOptInTxn = algosdk.makeApplicationOptInTxnFromObject({
        sender: account.value!.addr,
        suggestedParams: params,
        appIndex: app,
      });

      const signedTxn = await store.dispatch("signer/signTransaction", {
        from: account.value!.addr,
        tx: appOptInTxn,
      });
      const tx = (await store.dispatch("algod/sendRawTransaction", {
        signedTxn,
      })) as algosdk.modelsv2.PostTransactionsResponse;
      if (!tx || !tx.txid) {
        processingOptin.value = false;
        await reloadAccount();
        return;
      }
      const confirmation = (await store.dispatch("algod/waitForConfirmation", {
        txId: tx.txid,
        timeout: 4,
      })) as algosdk.modelsv2.PendingTransactionResponse | undefined;
      if (confirmation) {
        ret += tx.txid + ", ";
      } else {
        processingOptin.value = false;
        await reloadAccount();
        return;
      }
    }

    note.value = ret.trim().replace(",", "");
    await reloadAccount();
    processingOptin.value = false;
  };

  return {
    // State
    assets,
    asset,
    toAsset,
    payamount,
    fromAssetObj,
    toAssetObj,
    txsDetails,
    hasSK,
    processingQuote,
    processingOptin,
    note,
    error,
    slippage,
    fee,
    aggregatorData,
    loadingAssets,

    // Computed
    formInvalid,
    account,
    accountData,
    fromAssetDecimals,
    toAssetDecimals,
    maxAmount,
    stepAmount,
    allowExecuteDeflex,
    allowExecuteFolks,
    allowExecuteBiatec,
    appsToOptIn,
    requiresOptIn,
    unit,
    pair,
    pairReversed,
    isFolksQuoteBetter,
    isBiatecQuoteBetter,
    isDeflexQuoteBetter,

    // Methods
    reloadAccount,
    makeAssets,
    clickGetQuote,
    checkNetwork,
    clickExecuteFolks,
    clickExecuteBiatec,
    clickExecuteDeflex,
    swapTokens,
    clickOptInToApps,
  };
}
