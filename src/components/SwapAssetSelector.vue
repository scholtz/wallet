<template>
  <div class="field grid">
    <label for="swap_asset_from" class="col-12 mb-2 md:col-2 md:mb-0">
      {{ $t("swap.swap_asset_from") }}
    </label>
    <div class="col-12 md:col-10">
      <Dropdown
        inputId="swap_asset_from"
        v-model="assetModel"
        filter
        :options="assets"
        option-label="label"
        option-value="assetId"
        :placeholder="$t('placeholders.source_asset')"
        class="w-full"
      >
      </Dropdown>
    </div>
  </div>
  <div class="field grid">
    <label for="swap_asset_to" class="col-12 mb-2 md:col-2 md:mb-0"> </label>
    <div class="col-12 md:col-10">
      <Dropdown
        inputId="swap_asset_to"
        v-model="toAssetModel"
        :options="assets"
        filter
        option-label="label"
        option-value="assetId"
        :placeholder="$t('placeholders.destination_asset')"
        class="w-full"
      >
      </Dropdown>
    </div>
  </div>
  <div class="field grid">
    <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
    <div class="col-12 md:col-10">
      <Button
        :disabled="assetModel === null || toAssetModel === null"
        @click="$emit('swap-tokens')"
      >
        {{ $t("buttons.exchange_tokens") }}
      </Button>
    </div>
  </div>
</template>

<script>
export default {
  name: "SwapAssetSelector",
  props: {
    assets: Array,
    asset: [Number, String, BigInt],
    toAsset: [Number, String, BigInt],
  },
  computed: {
    assetModel: {
      get() {
        return this.asset;
      },
      set(value) {
        this.$emit("update:asset", value);
      },
    },
    toAssetModel: {
      get() {
        return this.toAsset;
      },
      set(value) {
        this.$emit("update:toAsset", value);
      },
    },
  },
  emits: ["update:asset", "update:toAsset", "swap-tokens"],
};
</script>
