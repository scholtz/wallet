<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  arc56TrustSeverity,
  arc56TrustBadgeSeverity,
  arc56TrustTitleKey,
  arc56TrustDescKey,
} from "@/scripts/arc56/decode";
import { useArc56Summaries, type AppCallTxnEntry } from "@/composables/useArc56Summaries";
import Arc56OwnerLinks from "./Arc56OwnerLinks.vue";

const props = defineProps<{
  transactions: AppCallTxnEntry[];
}>();

const { t } = useI18n();
const { summaries, loading } = useArc56Summaries(() => props.transactions);

// Only worth its own dedicated summary card when it's the one and only
// transaction in the request - a user relying on "Sign all" without
// expanding anything should still see this. For a multi-transaction group,
// the compact per-app list below already surfaces the same warnings without
// taking over the space above the full transaction table.
const isSingleAppCall = computed(
  () => props.transactions.length === 1 && summaries.value.length === 1,
);
</script>

<template>
  <div v-if="summaries.length > 0 || loading" class="arc56-request-summary">
    <div v-if="loading" class="arc56-summary-loading">
      <ProgressSpinner style="width: 1.5em; height: 1.5em" stroke-width="6" />
      {{ t("arc56.loading") }}
    </div>
    <template v-else-if="isSingleAppCall">
      <h4 class="m-0 mb-2">{{ t("arc56.summary_title") }}</h4>
      <Message :severity="arc56TrustSeverity(summaries[0].decoded.trust)" class="m-0 mb-2">
        <div class="arc56-trust-title">{{ t(arc56TrustTitleKey(summaries[0].decoded.trust)) }}</div>
        <div class="arc56-trust-desc">{{ t(arc56TrustDescKey(summaries[0].decoded.trust)) }}</div>
      </Message>
      <div v-if="summaries[0].decoded.contract" class="mb-1">
        <strong>{{ t("arc56.contract_name") }}:</strong> {{ summaries[0].decoded.contract.name }}
      </div>
      <div v-if="summaries[0].decoded.methodSignature" class="mb-1">
        <strong>{{ t("arc56.method_signature") }}:</strong>
        {{ summaries[0].decoded.methodSignature }}
      </div>
      <div v-if="summaries[0].owners" class="mb-1">
        <strong v-if="summaries[0].owners.length > 0">{{ t("arc56.published_by") }}:</strong>
        <Arc56OwnerLinks :owners="summaries[0].owners" />
      </div>
    </template>
    <template v-else>
      <h4 class="m-0 mb-2">{{ t("arc56.summary_multi_title", { count: summaries.length }) }}</h4>
      <table class="arc56-summary-table">
        <tbody>
          <tr v-for="summary in summaries" :key="summary.index">
            <td>{{ t("arc56.summary_app", { appIndex: summary.appIndex }) }}</td>
            <td>
              <Badge
                :severity="arc56TrustBadgeSeverity(summary.decoded.trust)"
                :value="t(arc56TrustTitleKey(summary.decoded.trust))"
              />
            </td>
            <td>
              <Arc56OwnerLinks :owners="summary.owners" />
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style scoped>
.arc56-request-summary {
  margin-bottom: 1rem;
}

.arc56-summary-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.arc56-trust-title {
  font-weight: bold;
}

.arc56-trust-desc {
  opacity: 0.9;
}

.arc56-summary-table {
  width: 100%;
  border-collapse: collapse;
}

.arc56-summary-table td {
  text-align: left;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--p-content-border-color);
  vertical-align: top;
}
</style>
