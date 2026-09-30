<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useArc56Summaries, type AppCallTxnEntry } from "@/composables/useArc56Summaries";
import { evaluateArc56Risk, type Arc56RiskInput, type Arc56RiskLevel } from "@/scripts/arc56/risk";

// At-a-glance signing risk for a whole request, shown next to "Sign all" so
// the user doesn't have to expand the transaction list to see the ARC-56
// registry verdict. Renders nothing when the request has no app calls.
const props = defineProps<{
  transactions: AppCallTxnEntry[];
}>();

const { t } = useI18n();
const { summaries, loading } = useArc56Summaries(() => props.transactions);

const result = computed(() => {
  const inputs: Arc56RiskInput[] = summaries.value.map((s) => ({
    trust: s.decoded.trust,
    owners: s.owners,
  }));
  // An app call whose decode failed is dropped from `summaries`; it must
  // count as unverified, never silently vanish into a "trusted" verdict.
  const expected = props.transactions.filter((tx) => tx.type === "appl").length;
  for (let i = inputs.length; i < expected; i++) {
    inputs.push({ trust: "unknown", owners: null });
  }
  return evaluateArc56Risk(inputs);
});

const PRESENTATION: Record<Exclude<Arc56RiskLevel, "none">, { icon: string; cls: string }> = {
  trusted: { icon: "pi pi-verified", cls: "arc56-risk-trusted" },
  warning: { icon: "pi pi-exclamation-triangle", cls: "arc56-risk-warning" },
  danger: { icon: "pi pi-ban", cls: "arc56-risk-danger" },
  "not-abi": { icon: "pi pi-info-circle", cls: "arc56-risk-not-abi" },
};

const presentation = computed(() =>
  result.value.level === "none" ? undefined : PRESENTATION[result.value.level],
);

const label = computed(() => {
  const level = result.value.level;
  if (level === "none") return "";
  const title = t(`arc56.risk_${level === "not-abi" ? "not_abi" : level}`);
  const reasons = result.value.reasons.map((r) => t(`arc56.reason_${r}`));
  return [title, ...reasons].join(" ");
});
</script>

<template>
  <i
    v-if="!loading && presentation"
    v-tooltip.top="label"
    :class="[presentation.icon, presentation.cls, 'arc56-risk-icon']"
    role="img"
    :aria-label="label"
    :data-risk="result.level"
  ></i>
  <i
    v-else-if="loading"
    class="pi pi-spin pi-spinner arc56-risk-icon"
    role="img"
    :aria-label="t('arc56.loading')"
  ></i>
</template>

<style scoped>
.arc56-risk-icon {
  font-size: 1.5rem;
  vertical-align: middle;
  margin: 0 0.5rem;
  cursor: help;
}
.arc56-risk-trusted {
  color: var(--p-green-500);
}
.arc56-risk-warning {
  color: var(--p-orange-500);
}
.arc56-risk-danger {
  color: var(--p-red-500);
}
.arc56-risk-not-abi {
  color: var(--p-text-muted-color);
}
</style>
