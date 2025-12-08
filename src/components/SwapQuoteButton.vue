<template>
  <div class="field grid">
    <label class="col-12 mb-2 md:col-2 md:mb-0"></label>
    <div class="col-12 md:col-10">
      <Button
        class="my-2"
        :disabled="formInvalid"
        :severity="
          allowExecuteDeflex || requiresOptIn ? 'secondary' : 'primary'
        "
        @click="$emit('get-quote')"
      >
        {{ $t("swap.get_quote") }}
        <ProgressSpinner
          v-if="processingQuote"
          style="width: 1em; height: 1em"
          strokeWidth="5"
        />
      </Button>
    </div>
  </div>
</template>

<script>
export default {
  name: "SwapQuoteButton",
  props: {
    formInvalid: Boolean,
    allowExecuteDeflex: Boolean,
    requiresOptIn: Boolean,
    processingQuote: Boolean,
  },
  emits: ["get-quote"],
};
</script>
