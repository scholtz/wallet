<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useStore } from "vuex";
import Dropdown from "primevue/dropdown";
import { useI18n } from "vue-i18n";
import formatCurrency from "../scripts/numbers/formatCurrency";
import CAsset from "../scripts/interface/CAsset";
import IAsset from "../scripts/interface/IAsset";
import IARC200 from "../scripts/interface/IARC200";

const props = defineProps({
  modelValue: CAsset,
  itemId: String,
  class: String,
  account: String,
});

const emit = defineEmits(["update:modelValue"]);

const model = computed({
  get() {
    return props.modelValue;
  },

  set(value) {
    return emit("update:modelValue", value);
  },
});

const store = useStore();
const { t } = useI18n();

function getAccountName() {
  const ret = store.state.wallet.privateAccounts.find(
    (a: any) => a.addr == props.modelValue
  );
  if (!ret) return props.modelValue;
  return `${ret.name}: ${props.modelValue}`;
}
const state = reactive({
  assetId: "",
  assets: [] as IAsset[],
  accountData: {} as any,
});

watch(
  () => state.assetId,
  (newAssetId) => {
    const value = state.assets.find(
      (a) => Number(a["asset-id"]) == Number(newAssetId)
    );
    if (value) {
      var ret = new CAsset();
      ret.amount = value.amount;
      ret["asset-id"] = value["asset-id"];
      ret.decimals = value.decimals;
      ret.label = value.label;
      ret.name = value.name;
      ret.type = value.type;
      ret["unit-name"] = value["unit-name"];

      emit("update:modelValue", ret);
    }
  }
);

const makeAccountData = () => {
  const account = store.state.wallet.privateAccounts.find(
    (a: any) => a.addr == props.account
  );
  if (!account) return false;
  if (!account.data) return false;
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
      "asset-id": 0,
      amount: state.accountData.amount,
      name: store.state.config.tokenSymbol,
      decimals: 6,
      "unit-name": store.state.config.tokenSymbol,
      type: "Native",
      label: `${store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
    });
  } else {
    const balance = formatCurrency(0, store.state.config.tokenSymbol, 6);
    assets.push({
      "asset-id": 0,
      amount: 0,
      name: store.state.config.tokenSymbol,
      decimals: 6,
      "unit-name": store.state.config.tokenSymbol,
      type: "Native",
      label: `${store.state.config.tokenSymbol} (Native token) Balance: ${balance}`,
    });
  }
  if (state.accountData) {
    for (let index in state.accountData.assets) {
      const asset = await store.dispatch("indexer/getAsset", {
        assetIndex: state.accountData.assets[index]["asset-id"],
      });
      if (asset) {
        const balance = formatCurrency(
          state.accountData.assets[index]["amount"],
          asset["unit-name"] ? asset["unit-name"] : asset["name"],
          asset["decimals"]
        );
        assets.push({
          "asset-id": state.accountData.assets[index]["asset-id"],
          amount: state.accountData.assets[index]["amount"],
          name: asset["name"],
          decimals: asset["decimals"],
          "unit-name": asset["unit-name"],
          type: "ASA",
          label: `${asset["name"]} (ASA ${state.accountData.assets[index]["asset-id"]}) Balance: ${balance}`,
        });
      } else {
        console.error(
          "Asset not loaded",
          state.accountData.assets[index]["asset-id"]
        );
      }
    }

    if (state.accountData.arc200) {
      for (const accountAsset of Object.values(state.accountData.arc200)) {
        const arc200 = accountAsset as IARC200;
        const balance = formatCurrency(
          arc200.balance,
          arc200.symbol ? arc200.symbol : arc200.name,
          Number(arc200.decimals)
        );
        assets.push({
          "asset-id": Number(arc200.arc200id),
          amount: Number(arc200.balance),
          name: arc200.name,
          decimals: Number(arc200.decimals),
          "unit-name": arc200.symbol,
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
  <Dropdown
    inputId="asset"
    :itemid="props.itemId"
    v-model="state.assetId"
    filter
    :options="state.assets"
    optionLabel="label"
    optionValue="asset-id"
    :placeholder="$t('pay.asset')"
    class="w-full"
    inputClass="w-full"
  >
  </Dropdown>
</template>
