<template>
  <div class="field grid">
    <label for="payamount" class="col-12 mb-2 md:col-2 md:mb-0">
      {{ $t("swap.swap_amount") }}
    </label>
    <div class="col-12 md:col-10">
      <InputGroup>
        <InputNumber
          inputId="payamount"
          v-model="payamountModel"
          type="number"
          :min="0"
          :max="maxAmount"
          :step="stepAmount"
          :maxFractionDigits="decimals"
          class="w-full"
        />
        <InputGroupAddon v-if="unit">{{ unit }}</InputGroupAddon>
        <Button severity="secondary" @click="$emit('set-max')">{{
          $t("pay.set_max")
        }}</Button>
      </InputGroup>
    </div>
  </div>
</template>

<script>
export default {
  name: "SwapAmountInput",
  props: {
    payamount: Number,
    maxAmount: Number,
    stepAmount: Number,
    decimals: Number,
    unit: String,
  },
  computed: {
    payamountModel: {
      get() {
        return this.payamount;
      },
      set(value) {
        this.$emit("update:payamount", value);
      },
    },
  },
  emits: ["update:payamount", "set-max"],
};
</script>
