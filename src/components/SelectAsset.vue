<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useStore } from "vuex";
import Select from "primevue/select";
import formatCurrency from "../scripts/numbers/formatCurrency";
import CAsset from "../scripts/interface/CAsset";
import IAsset from "../scripts/interface/IAsset";
import { RootState } from "@/store";
import { useI18n } from "vue-i18n";
import { ExtendedStoredAsset, StoredAsset } from "@/store/indexer";
import { IAccountData } from "@/store/wallet";
import { filterAssetsWithBalance } from "@/scripts/assets/filterAssetsWithBalance";

const { t } = useI18n();
const props = defineProps({
  modelValue: CAsset,
  itemId: String,
  class: String,
  account: String,
  defaultOnlyWithBalance: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const store = useStore<RootState>();
const onlyWithBalance = ref(props.defaultOnlyWithBalance);
const state = reactive({
  assetId: "",
  assets: [] as IAsset[],
  accountData: undefined as IAccountData | undefined,
});

const visibleAssets = computed(() =>
  filterAssetsWithBalance(
    state.assets,
    onlyWithBalance.value,
    state.assetId === "" ? undefined : state.assetId
  )
);

watch(
  () => state.assetId,
  (newAssetId) => {
    const value = state.assets.find(
      (a) => Number(a.assetId) == Number(newAssetId)
    );
    if (value) {
      const ret: ExtendedStoredAsset = {
        assetId: value.assetId,
        amount: value.amount,
        decimals: value.decimals,
        label: value.label,
        name: value.name,
        type: value.type as "Native" | "ASA" | "ARC200",
        unitName: value.unitName,
      };
      emit("update:modelValue", ret);
    }
  }
);

const makeAccountData = (): IAccountData | undefined => {
  const account = store.state.wallet.privateAccounts.find(
    (a) => a.addr == props.account
  );
  if (!account) return undefined;
  if (!account.data) return undefined;
  return account.data[store.state.config.env];
};

const makeAssets = async () => {
  const assets: IAsset[] = [];
  state.accountData = makeAccountData();
  if (state.accountData) {
    const balance = formatCurrency(
      state.accountData.amount,
      store.state.config.tokenSymbol,
      6
    );
    assets.push({
      assetId: 0n,
      amount: BigInt(state.accountData.amount ?? 0n),
      name: store.state.config.tokenSymbol,
      decimals: 6,
      unitName: store.state.config.tokenSymbol,
      type: "Native",
      label: `${store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
    });
  } else {
    const balance = formatCurrency(0, store.state.config.tokenSymbol, 6);
    assets.push({
      assetId: 0n,
      amount: 0n,
      name: store.state.config.tokenSymbol,
      decimals: 6,
      unitName: store.state.config.tokenSymbol,
      type: "Native",
      label: `${store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
    });
  }
  if (state.accountData) {
    if (state.accountData.assets) {
      for (const accountDataAsset of state.accountData.assets) {
        const asset = (await store.dispatch("indexer/getAsset", {
          assetIndex: BigInt(accountDataAsset.assetId),
        })) as StoredAsset | undefined;

        if (asset) {
          const balance = formatCurrency(
            accountDataAsset["amount"],
            asset.unitName ? asset.unitName : asset.name,
            asset.decimals ?? 6
          );
          assets.push({
            assetId: accountDataAsset.assetId,
            amount: BigInt(accountDataAsset.amount),
            name: asset.name ?? "",
            decimals: asset.decimals ?? 6,
            unitName: asset.unitName ?? "",
            type: "ASA",
            label: `${asset.name} (ASA ${accountDataAsset.assetId}) Balance: ${balance}`,
          });
        } else {
          console.error("Asset not loaded", accountDataAsset.assetId);
        }
      }
    }

    if (state.accountData.arc200) {
      for (const arc200 of Object.values(state.accountData.arc200)) {
        const balance = formatCurrency(
          arc200.balance,
          arc200.symbol ? arc200.symbol : arc200.name,
          Number(arc200.decimals)
        );
        assets.push({
          assetId: BigInt(arc200.arc200id),
          amount: BigInt(arc200.balance),
          name: arc200.name,
          decimals: Number(arc200.decimals),
          unitName: arc200.symbol,
          type: "ARC200",
          label: `${arc200.name} (ARC200 ${arc200.arc200id}) Balance: ${balance}`,
        });
      }
    }
    state.assets = assets;
  }
};

onMounted(async () => {
  await makeAssets();
});
</script>
<template>
  <div class="w-full">
    <Select
    inputId="asset"
    :itemid="props.itemId"
    v-model="state.assetId"
    filter
    :options="visibleAssets"
    optionLabel="label"
    optionValue="assetId"
    :placeholder="t('pay.asset')"
    class="w-full"
    inputClass="w-full"
  >
    </Select>
    <div class="flex align-items-center gap-2 mt-2">
      <Checkbox
        v-model="onlyWithBalance"
        inputId="select-asset-only-with-balance"
        binary
      />
      <label for="select-asset-only-with-balance">
        {{ t("acc_overview_assets.only_with_balance") }}
      </label>
    </div>
  </div>
</template>
