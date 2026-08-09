<template>
  <div class="field grid">
    <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
    <div class="col-12 md:col-10">
      <Checkbox
        binary
        inputId="slippageProtectionEnabled"
        type="checkbox"
        :modelValue="slippageProtectionEnabledModel"
        @update:modelValue="slippageProtectionEnabledModel = $event"
      />
      <label for="slippageProtectionEnabled" class="ml-1">
        {{ $t("swap.slippage_protection") }}
      </label>
    </div>
  </div>

  <div class="field grid" v-if="slippageProtectionEnabledModel">
    <label for="slippage" class="col-12 mb-2 md:col-2 md:mb-0">
      {{ $t("swap.slippage") }}
    </label>
    <div class="col-12 md:col-10">
      <InputNumber
        inputId="slippage"
        v-model="slippageModel"
        type="number"
        :min="0"
        :max="1"
        :step="0.01"
        :maxFractionDigits="6"
        class="w-full"
      />
    </div>
  </div>

  <Message severity="error" v-else class="mb-3">
    {{ $t("swap.slippage_protection_disabled_warning") }}
  </Message>
</template>

<script>
export default {
  name: "SwapSlippageInput",
  props: {
    slippage: Number,
    slippageProtectionEnabled: Boolean,
  },
  computed: {
    slippageModel: {
      get() {
        return this.slippage;
      },
      set(value) {
        this.$emit("update:slippage", value);
      },
    },
    slippageProtectionEnabledModel: {
      get() {
        return this.slippageProtectionEnabled;
      },
      set(value) {
        this.$emit("update:slippageProtectionEnabled", value);
      },
    },
  },
  emits: ["update:slippage", "update:slippageProtectionEnabled"],
};
</script>
