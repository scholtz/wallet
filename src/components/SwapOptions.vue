<template>
  <div
    v-for="aggregator in aggregators"
    :key="aggregator.name"
    class="field grid"
  >
    <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
    <div class="col-12 md:col-10">
      <Checkbox
        binary
        :inputId="`${aggregator.name}Checkbox`"
        type="checkbox"
        :modelValue="getValue(aggregator)"
        @update:modelValue="updateValue(aggregator, $event)"
      />
      <label :for="`${aggregator.name}Checkbox`" class="ml-1">
        {{ $t(`labels.use_${aggregator.name}`) }}
      </label>
    </div>
  </div>
</template>

<script>
export default {
  name: "SwapOptions",
  props: {
    aggregators: Array,
    useFolks: Boolean,
    useDeflex: Boolean,
    useBiatec: Boolean,
  },
  methods: {
    getValue(aggregator) {
      if (aggregator.name === "folks") return this.useFolks;
      if (aggregator.name === "deflex") return this.useDeflex;
      if (aggregator.name === "biatec") return this.useBiatec;
      return false;
    },
    updateValue(aggregator, value) {
      if (aggregator.name === "folks") {
        this.$emit("update:useFolks", value);
      } else if (aggregator.name === "deflex") {
        this.$emit("update:useDeflex", value);
      } else if (aggregator.name === "biatec") {
        this.$emit("update:useBiatec", value);
      }
    },
  },
  emits: ["update:useFolks", "update:useDeflex", "update:useBiatec"],
};
</script>
