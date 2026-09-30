<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import Popover from "primevue/popover";
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

const isSensitiveCall = (entry: AppCallTxnEntry | undefined): boolean => {
  const call = entry?.txn.applicationCall;
  if (!call) return false;
  return (
    BigInt(call.appIndex) === 0n ||
    call.onComplete === algosdk.OnApplicationComplete.UpdateApplicationOC ||
    call.onComplete === algosdk.OnApplicationComplete.DeleteApplicationOC
  );
};

// Close-outs and rekeys move funds/control regardless of which contract is
// being called.
const hasRiskyFields = computed(() =>
  props.transactions.some(
    (tx) =>
      !!tx.txn.rekeyTo ||
      !!tx.txn.payment?.closeRemainderTo ||
      !!tx.txn.assetTransfer?.closeRemainderTo,
  ),
);

const result = computed(() => {
  const inputs: Arc56RiskInput[] = summaries.value.map((s) => ({
    trust: s.decoded.trust,
    owners: s.owners,
    sensitive: isSensitiveCall(props.transactions.find((tx) => tx.index === s.index)),
  }));
  // An app call whose decode failed is dropped from `summaries`; it must
  // count as unverified, never silently vanish into a "trusted" verdict.
  const expected = props.transactions.filter((tx) => tx.type === "appl").length;
  for (let i = inputs.length; i < expected; i++) {
    inputs.push({ trust: "unknown", owners: null });
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

const label = computed(() => [title.value, ...reasons.value].join(" "));

// Click/tap/Enter opens the explanation - a hover-only tooltip is not
// reachable on touch devices or by keyboard.
const popover = ref<InstanceType<typeof Popover> | null>(null);
const toggle = (event: Event) => popover.value?.toggle(event);
</script>

<template>
  <template v-if="!loading && presentation">
    <button
      type="button"
      :class="['arc56-risk-icon', presentation.cls]"
      :aria-label="label"
      :data-risk="result.level"
      @click="toggle"
    >
      <i :class="presentation.icon"></i>
    </button>
    <Popover ref="popover">
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
  font-size: 1.5rem;
  vertical-align: middle;
  margin: 0 0.5rem;
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
