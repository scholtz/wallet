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

type BadgeSeverity = "success" | "info" | "warn" | "danger" | "secondary";

// Registry-provided reputation (docs/reputation-scoring.md in
// scholtz/ARC56Registry) - a heuristic prioritization signal, not a guarantee.
const ownerRisk = (owner: Arc56Owner): { key: string; severity: BadgeSeverity } => {
  const level = owner.banned ? "banned" : owner.riskLevel;
  switch (level) {
    case "low":
      return { key: "arc56.owner_risk_low", severity: "success" };
    case "medium":
      return { key: "arc56.owner_risk_medium", severity: "info" };
    case "high":
      return { key: "arc56.owner_risk_high", severity: "warn" };
    case "very_high":
      return { key: "arc56.owner_risk_very_high", severity: "danger" };
    case "banned":
      return { key: "arc56.owner_risk_banned", severity: "danger" };
    default:
      return { key: "arc56.owner_risk_unrated", severity: "secondary" };
  }
};
</script>

<template>
  <span v-if="owners && owners.length > 0">
    <span v-for="(owner, i) in owners" :key="owner.url">
      <a :href="owner.url" target="_blank" rel="noopener noreferrer">
        {{ owner.owner }}/{{ owner.repo }}
      </a>
      <Badge
        :severity="ownerRisk(owner).severity"
        :value="
          owner.reputationScore !== undefined
            ? `${t(ownerRisk(owner).key)} (${owner.reputationScore})`
            : t(ownerRisk(owner).key)
        "
        class="ml-1"
      />
      <span v-if="i < owners.length - 1">, </span>
    </span>
  </span>
  <Message v-else-if="owners" severity="warn" class="m-0">
    {{ t("arc56.no_owners_found") }}
  </Message>
</template>
