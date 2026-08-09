<template>
  <div>
    <Textarea v-model="txsDetailsModel" disabled class="w-full" rows="5" />
  </div>
  <Message severity="success" v-if="note" class="my-2">
    <template v-for="(part, index) in noteParts" :key="index">
      <a
        v-if="part.isTxId"
        :href="txUrl(part.text)"
        target="_blank"
        rel="noopener noreferrer"
        class="note-tx-link"
        >{{ part.text }}</a
      >
      <template v-else>{{ part.text }}</template>
    </template>
  </Message>
  <Message severity="error" v-if="error" class="my-2">
    {{ error }}
  </Message>
</template>

<script>
import { explorerTransactionUrl } from "@/scripts/explorer";

// Algorand transaction ids are 52-character base32 strings.
const TX_ID_PATTERN = /([A-Z2-7]{52})/;

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
    noteParts() {
      if (!this.note) return [];
      return this.note
        .split(TX_ID_PATTERN)
        .filter((part) => part !== "")
        .map((part) => ({
          text: part,
          isTxId: TX_ID_PATTERN.test(part) && part.length === 52,
        }));
    },
  },
  methods: {
    txUrl(txId) {
      return explorerTransactionUrl(this.$store.state.config.env, txId);
    },
  },
  emits: ["update:txsDetails"],
};
</script>

<style scoped>
.note-tx-link {
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
  word-break: break-all;
}
</style>
