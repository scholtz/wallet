<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { Arc56Owner } from "@/scripts/arc56/types";

// `null` = not looked up (e.g. no approvalHash to look up in the first
// place) - renders nothing. `[]` = looked up, no known publisher - renders
// the warning. A non-empty array renders the GitHub links. Kept as a single
// shared component (rather than duplicated per caller) so this null/[]
// distinction - and the comma-separated link markup - can't drift between
// Arc56CallDetails.vue's per-transaction view and
// Arc56RequestSummary.vue's aggregate view.
defineProps<{
  owners: Arc56Owner[] | null;
}>();

const { t } = useI18n();
</script>

<template>
  <span v-if="owners && owners.length > 0">
    <a
      v-for="(owner, i) in owners"
      :key="owner.url"
      :href="owner.url"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ owner.owner }}/{{ owner.repo }}<span v-if="i < owners.length - 1">, </span>
    </a>
  </span>
  <Message v-else-if="owners" severity="warn" class="m-0">
    {{ t("arc56.no_owners_found") }}
  </Message>
</template>
