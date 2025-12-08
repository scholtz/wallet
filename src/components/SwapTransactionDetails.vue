<template>
  <div>
    <Textarea v-model="txsDetailsModel" disabled class="w-full" rows="5" />
  </div>
  <Message severity="success" v-if="note" class="my-2">
    {{ note }}
  </Message>
  <Message severity="error" v-if="error" class="my-2">
    {{ error }}
  </Message>
</template>

<script>
export default {
  name: "SwapTransactionDetails",
  props: {
    txsDetails: String,
    note: String,
    error: String,
  },
  computed: {
    txsDetailsModel: {
      get() {
        return this.txsDetails;
      },
      set(value) {
        this.$emit("update:txsDetails", value);
      },
    },
  },
  emits: ["update:txsDetails"],
};
</script>
