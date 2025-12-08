<template>
  <div class="field grid">
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
</template>

<script>
export default {
  name: "SwapSlippageInput",
  props: {
    slippage: Number,
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
  },
  emits: ["update:slippage"],
};
</script>
