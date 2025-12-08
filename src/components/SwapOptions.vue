<template>
  <div class="field grid">
    <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
    <div class="col-12 md:col-10">
      <Checkbox
        binary
        inputId="useFolksCheckbox"
        type="checkbox"
        v-model="useFolksModel"
      />
      <label for="useFolksCheckbox" class="ml-1">
        {{ $t("labels.use_folks_router") }}
      </label>
    </div>
  </div>
  <div class="field grid">
    <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
    <div class="col-12 md:col-10">
      <Checkbox
        binary
        inputId="useDeflexCheckbox"
        type="checkbox"
        v-model="useDeflexModel"
      />
      <label for="useDeflexCheckbox" class="ml-1">{{
        $t("labels.use_deflex")
      }}</label>
    </div>
  </div>
</template>

<script>
export default {
  name: "SwapOptions",
  props: {
    useFolks: Boolean,
    useDeflex: Boolean,
  },
  computed: {
    useFolksModel: {
      get() {
        return this.useFolks;
      },
      set(value) {
        this.$emit("update:useFolks", value);
      },
    },
    useDeflexModel: {
      get() {
        return this.useDeflex;
      },
      set(value) {
        this.$emit("update:useDeflex", value);
      },
    },
  },
  emits: ["update:useFolks", "update:useDeflex"],
};
</script>
