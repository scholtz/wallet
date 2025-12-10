// composables/useSwap.ts - Composable for swap functionality
import { ref, computed, Ref } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
import { dexAggregators } from "../scripts/dexAggregators";
import type { Asset } from "../types/swap";
import algosdk from "algosdk";
import formatCurrency from "../scripts/numbers/formatCurrency";

export function useSwap() {
  const store = useStore();
  const route = useRoute();

  // Reactive state
  const assets: Ref<Asset[]> = ref([]);
  const asset: Ref<number | null> = ref(null);
  const toAsset: Ref<number | null> = ref(null);
  const payamount: Ref<number> = ref(0);
  const fromAssetObj: Ref<Partial<Asset>> = ref({});
  const toAssetObj: Ref<Partial<Asset>> = ref({});
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

  // Computed properties
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
      ? accountData.value["assets"].find(
          (a: any) => a["asset-id"] == asset.value
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
    if (asset.value && asset.value > 0) {
      if (!selectedAssetFromAccount.value) return 0;
      return selectedAssetFromAccount.value.amount / decimalsPower.value;
    } else {
      let ret = accountData.value.amount / 1000000 - 0.1;
      ret = ret - fee.value;
      if (accountData.value["assets"] && accountData.value["assets"].length > 0)
        ret = ret - accountData.value["assets"].length * 0.1;
      return ret;
    }
  });

  const stepAmount = computed<number>(() =>
    Math.pow(10, -1 * fromAssetDecimals.value)
  );

  const allowExecuteDeflex = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "deflex");
    return agg ? agg.allowExecute(getComponentContext()) : false;
  });

  const allowExecuteFolks = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "folks");
    return agg ? agg.allowExecute(getComponentContext()) : false;
  });

  const allowExecuteBiatec = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "biatec");
    return agg ? agg.allowExecute(getComponentContext()) : false;
  });

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
    if (fromAssetObj.value["unit-name"]) return fromAssetObj.value["unit-name"];
    return fromAssetObj.value["name"] || "";
  });

  const fromAssetUnit = computed<string>(() => {
    if (!fromAssetObj.value) return "";
    if (fromAssetObj.value["unit-name"]) return fromAssetObj.value["unit-name"];
    return fromAssetObj.value["name"] || "";
  });

  const toAssetUnit = computed<string>(() => {
    if (!toAssetObj.value) return "";
    if (toAssetObj.value["unit-name"]) return toAssetObj.value["unit-name"];
    return toAssetObj.value["name"] || "";
  });

  const pair = computed<string>(
    () => `${fromAssetUnit.value}/${toAssetUnit.value}`
  );

  const pairReversed = computed<string>(
    () => `${toAssetUnit.value}/${fromAssetUnit.value}`
  );

  const isFolksQuoteBetter = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "folks");
    return agg ? agg.isQuoteBetter(getComponentContext()) : false;
  });

  const isBiatecQuoteBetter = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "biatec");
    return agg ? agg.isQuoteBetter(getComponentContext()) : false;
  });

  const isDeflexQuoteBetter = computed<boolean>(() => {
    const agg = dexAggregators.find((a) => a.name === "deflex");
    return agg ? agg.isQuoteBetter(getComponentContext()) : false;
  });

  // Helper function to get component context for aggregator methods
  function getComponentContext() {
    const context = {
      // Basic properties from SwapComponentData
      assets: assets.value,
      asset: asset.value,
      toAsset: toAsset.value,
      payamount: payamount.value,
      account: account.value,
      fromAssetObj: fromAssetObj.value,
      toAssetObj: toAssetObj.value,
      txsDetails: txsDetails.value,
      hasSK: hasSK.value,
      processingQuote: processingQuote.value,
      processingOptin: processingOptin.value,
      note: note.value,
      error: error.value,
      slippage: slippage.value,
      fee: fee.value,

      // Computed properties
      fromAssetDecimals: fromAssetDecimals.value,
      toAssetDecimals: toAssetDecimals.value,
      requiresOptIn: requiresOptIn.value,

      // Store and route access (for SwapComponent interface)
      $store: store,
      $route: route as any,
      dexAggregators,
      algosdk,

      // Methods
      openSuccess: (message: string) =>
        store.dispatch("toast/openSuccess", message),
      openError: (message: string) =>
        store.dispatch("toast/openError", message),
      axiosGet: (config: { url: string }) =>
        store.dispatch("axios/get", config),
      axiosPost: (config: { url: string; body?: any; config?: any }) =>
        store.dispatch("axios/post", config),
      getSK: (config: { addr: string }) =>
        store.dispatch("wallet/getSK", config),
      getAsset: (config: { assetIndex: number }) =>
        store.dispatch("indexer/getAsset", config),
      sendRawTransaction: (config: { signedTxn: Uint8Array | Uint8Array[] }) =>
        store.dispatch("algod/sendRawTransaction", config),
      waitForConfirmation: (config: { txId: string; timeout: number }) =>
        store.dispatch("algod/waitForConfirmation", config),
      prolong: () => store.dispatch("wallet/prolong"),
      reloadAccount: () => store.dispatch("wallet/reloadAccount"),
      checkNetwork,
      signAuthTx: (config: { account: string; realm: string }) =>
        store.dispatch("arc14/signAuthTx", config),
    };

    // Create a proxy that updates reactive refs when aggregator properties are set
    return new Proxy(context, {
      get(target, prop) {
        // Map key reactive fields back to refs so changes are visible in the UI
        if (prop === "txsDetails") {
          return txsDetails.value;
        }
        if (prop === "note") {
          return note.value;
        }
        if (prop === "error") {
          return error.value;
        }
        if (prop === "processingQuote") {
          return processingQuote.value;
        }
        if (prop === "processingOptin") {
          return processingOptin.value;
        }

        // First check if it's a direct property
        if (prop in target) {
          return target[prop as keyof typeof target];
        }
        // Then check if it's an aggregator data property
        if (prop in aggregatorData) {
          return aggregatorData[prop as keyof typeof aggregatorData].value;
        }
        return undefined;
      },
      set(target, prop, value) {
        // Keep key fields in sync with refs when aggregators write to them
        if (prop === "txsDetails") {
          txsDetails.value = value as string;
          return true;
        }
        if (prop === "note") {
          note.value = value as string;
          return true;
        }
        if (prop === "error") {
          error.value = value as string;
          return true;
        }
        if (prop === "processingQuote") {
          processingQuote.value = Boolean(value);
          return true;
        }
        if (prop === "processingOptin") {
          processingOptin.value = Boolean(value);
          return true;
        }

        // If it's an aggregator data property, update the reactive ref
        if (prop in aggregatorData) {
          aggregatorData[prop as keyof typeof aggregatorData].value = value;
          return true;
        }
        // Otherwise, set it on the target
        (target as any)[prop] = value;
        return true;
      },
    });
  }

  // Methods
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

  const makeAssets = async (): Promise<void> => {
    assets.value = [];
    if (accountData.value) {
      const balance = formatCurrency(
        accountData.value.amount,
        store.state.config.tokenSymbol,
        6
      );
      assets.value.push({
        "asset-id": 0,
        amount: accountData.value.amount,
        name: store.state.config.tokenSymbol,
        decimals: 6,
        "unit-name": store.state.config.tokenSymbol,
        type: "Native",
        label: `${store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
      });
    } else {
      const balance = formatCurrency(0, store.state.config.tokenSymbol, 6);
      assets.value.push({
        "asset-id": 0,
        amount: 0,
        name: store.state.config.tokenSymbol,
        decimals: 6,
        "unit-name": store.state.config.tokenSymbol,
        type: "Native",
        label: `${store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
      });
    }

    if (accountData.value && accountData.value.assets) {
      // Parallel fetch all asset infos
      const assetPromises = accountData.value.assets.map(
        (asset: any) =>
          store
            .dispatch("indexer/getAsset", {
              assetIndex: asset["asset-id"],
            })
            .catch(() => null) // Ignore errors for individual assets
      );
      const assetInfos = await Promise.all(assetPromises);

      for (let index = 0; index < accountData.value.assets.length; index++) {
        const assetInfo = assetInfos[index];
        if (assetInfo) {
          const balance = formatCurrency(
            accountData.value.assets[index]["amount"],
            assetInfo["unit-name"] ? assetInfo["unit-name"] : assetInfo["name"],
            assetInfo["decimals"]
          );

          assets.value.push({
            "asset-id": accountData.value.assets[index]["asset-id"],
            amount: accountData.value.assets[index]["amount"],
            name: assetInfo["name"],
            decimals: assetInfo["decimals"],
            "unit-name": assetInfo["unit-name"],
            type: "ASA",
            label: `${assetInfo["name"]} (ASA ${accountData.value.assets[index]["asset-id"]}) Balance: ${balance}`,
          });
        } else {
          console.error(
            "Asset not loaded",
            accountData.value.assets[index]["asset-id"]
          );
        }
      }
    }
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
      .map((agg) => agg.getQuote(getComponentContext()));

    await Promise.all(promises);
    processingQuote.value = false;
  };

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

  const clickExecuteFolks = async (): Promise<void> => {
    const agg = dexAggregators.find((a) => a.name === "folks");
    if (agg) {
      await agg.execute(getComponentContext());
    }
  };

  const clickExecuteBiatec = async (): Promise<void> => {
    const agg = dexAggregators.find((a) => a.name === "biatec");
    if (agg) {
      await agg.execute(getComponentContext());
    }
  };

  const clickExecuteDeflex = async (): Promise<void> => {
    const agg = dexAggregators.find((a) => a.name === "deflex");
    if (agg) {
      await agg.execute(getComponentContext());
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
    for (let app of appsToOptIn.value) {
      const appOptInTxn = algosdk.makeApplicationOptInTxn(
        account.value!.addr,
        params,
        app
      );

      let signedTxn = await store.dispatch("signer/signTransaction", {
        from: account.value!.addr,
        tx: appOptInTxn,
      });
      const tx = await store.dispatch("algod/sendRawTransaction", {
        signedTxn,
      });
      if (!tx || !tx.txId) {
        processingOptin.value = false;
        await reloadAccount();
        return;
      }
      const confirmation = await store.dispatch("algod/waitForConfirmation", {
        txId: tx.txId,
        timeout: 4,
      });
      if (confirmation) {
        ret += tx.txId + ", ";
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
    getComponentContext,
  };
}
