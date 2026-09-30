<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Popover from "primevue/popover";
import { isRiskyTransaction, isSensitiveAppCall } from "@/scripts/arc56/riskTxn";
import { useArc56Summaries, type AppCallTxnEntry } from "@/composables/useArc56Summaries";
import { evaluateArc56Risk, type Arc56RiskInput, type Arc56RiskLevel } from "@/scripts/arc56/risk";

// At-a-glance signing risk for a whole request, shown next to "Sign all" so
// the user doesn't have to expand the transaction list to see the ARC-56
// registry verdict. Renders nothing when the request has neither app calls nor risky fields.
const props = defineProps<{
  transactions: AppCallTxnEntry[];
}>();

const { t } = useI18n();
const { summaries, loading } = useArc56Summaries(() => props.transactions);

const hasRiskyFields = computed(() => props.transactions.some((tx) => isRiskyTransaction(tx.txn)));

const result = computed(() => {
  const inputs: Arc56RiskInput[] = [];
  // Every app call gets an input: one whose decode failed is absent from
  // `summaries` and must count as unverified, never silently vanish into a
  // "trusted" verdict.
  for (const tx of props.transactions) {
    if (tx.type !== "appl") continue;
    const summary = summaries.value.find((s) => s.index === tx.index);
    inputs.push({
      trust: summary?.decoded.trust ?? "unknown",
      owners: summary?.owners ?? null,
      sensitive: isSensitiveAppCall(tx.txn),
      lookupFailed: !summary,
    });
  }
  return evaluateArc56Risk(inputs, { riskyFields: hasRiskyFields.value });
});

const PRESENTATION: Record<Exclude<Arc56RiskLevel, "none">, { icon: string; cls: string }> = {
  trusted: { icon: "pi pi-verified", cls: "arc56-risk-trusted" },
  warning: { icon: "pi pi-exclamation-triangle", cls: "arc56-risk-warning" },
  danger: { icon: "pi pi-ban", cls: "arc56-risk-danger" },
  // Deliberately warning-coloured: a call the registry cannot describe is
  // not safer than an unregistered ABI call.
  "not-abi": { icon: "pi pi-question-circle", cls: "arc56-risk-warning" },
};

const presentation = computed(() =>
  result.value.level === "none" ? undefined : PRESENTATION[result.value.level],
);

const title = computed(() => {
  const level = result.value.level;
  return level === "none" ? "" : t(`arc56.risk_${level === "not-abi" ? "not_abi" : level}`);
});

// A pure non-ABI verdict already says so in its title.
const reasons = computed(() =>
  result.value.level === "not-abi"
    ? []
    : result.value.reasons.map((r) => t(`arc56.reason_${r}`)),
);


// Click/tap/Enter opens the explanation - a hover-only tooltip is not
// reachable on touch devices or by keyboard.
const popover = ref<InstanceType<typeof Popover> | null>(null);
const toggle = (event: Event) => popover.value?.toggle(event);
const expanded = ref(false);

// The button (and its popover) unmount while a new verdict is loading; close
// first so `expanded` can't stay true with no popover open.
watch(loading, (isLoading) => {
  if (isLoading) {
    popover.value?.hide();
    expanded.value = false;
  }
});
</script>

<template>
  <template v-if="!loading && presentation">
    <button
      type="button"
      :class="['arc56-risk-icon', presentation.cls]"
      :aria-label="title"
      aria-haspopup="dialog"
      :aria-expanded="expanded"
      :data-risk="result.level"
      @click="toggle"
    >
      <i :class="presentation.icon"></i>
    </button>
    <Popover ref="popover" @show="expanded = true" @hide="expanded = false">
      <div class="arc56-risk-popover">
        <strong>{{ title }}</strong>
        <ul v-if="reasons.length > 0" class="m-0 mt-2 pl-3">
          <li v-for="reason in reasons" :key="reason">{{ reason }}</li>
        </ul>
      </div>
    </Popover>
  </template>
  <i
    v-else-if="loading"
    class="pi pi-spin pi-spinner arc56-risk-icon"
    role="img"
    :aria-label="t('arc56.loading')"
  ></i>
</template>

<style scoped>
.arc56-risk-icon {
  /* Sized to match the neighbouring PrimeVue buttons (~2.5rem tall). */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 2rem;
  vertical-align: middle;
  margin: 0.25rem;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}
.arc56-risk-popover {
  max-width: 24rem;
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
</style>
