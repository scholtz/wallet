<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import { useStore } from "@/store";
import {
  decodeAppCallWithOwners,
  arc56TrustSeverity,
  arc56TrustTitleKey,
  arc56TrustDescKey,
  safeTxId,
  type DecodedArc56Call,
  type AppCallGroupTxnRef,
} from "@/scripts/arc56/decode";
import Arc56OwnerLinks from "./Arc56OwnerLinks.vue";
import type { Arc56Owner } from "@/scripts/arc56/types";
import type { ApplicationPrograms } from "@/store/algod";

// Same deliberately narrow shape as Arc56CallDetails.vue's own prop - stays
// structurally compatible with ConnectRequestsTable's TransactionWrapper[]
// (and any other future caller) without depending on it.
interface AppCallTxnEntry {
  index: number;
  type: string;
  txn: algosdk.Transaction;
}

const props = defineProps<{
  transactions: AppCallTxnEntry[];
}>();

const { t } = useI18n();
const store = useStore();

interface AppCallSummary {
  index: number;
  appIndex: bigint;
  decoded: DecodedArc56Call;
  // null = not looked up (no approvalHash); [] = looked up, no known
  // publisher; non-empty = the known publishers. See Arc56OwnerLinks.vue.
  owners: Arc56Owner[] | null;
}

const loading = ref(false);
const summaries = shallowRef<AppCallSummary[]>([]);

// Guards against a stale runDecode() call overwriting a fresher one - e.g.
// ConnectRequestsTable rebuilds TransactionWrapper[] on every request-store
// update, which can re-trigger the watch below before a previous decode
// (several concurrent algod + registry round-trips) has resolved.
let decodeGeneration = 0;

const runDecode = async () => {
  const generation = ++decodeGeneration;
  const groupTransactions: AppCallGroupTxnRef[] = props.transactions.map((tx) => ({
    index: tx.index,
    type: tx.type,
  }));
  const applCalls = props.transactions.filter((tx) => tx.type === "appl");
  if (applCalls.length === 0) {
    summaries.value = [];
    // Not gated on the generation check below (this path never entered
    // `loading.value = true`) - but it must still clear loading itself, or
    // an older in-flight call's own `finally` (which skips resetting
    // `loading` once it sees a newer generation) would leave the spinner
    // stuck on forever with no summaries to show.
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    // allSettled, not all: one app call's decode/registry-fetch failing
    // must only drop that entry, not silently wipe the trust/publisher
    // info for every other (successfully decoded) app call in the request.
    const results = await Promise.allSettled(
      applCalls.map(async (entry): Promise<AppCallSummary | undefined> => {
        // appIndex 0 is a legitimate, real value (an application-creation
        // call has no app id yet) - only a genuinely missing field should
        // be skipped, so this must not be a plain falsy check.
        const rawAppIndex = entry.txn.applicationCall?.appIndex;
        if (rawAppIndex === undefined) return undefined;
        const appIndex = BigInt(rawAppIndex);
        const programs = (await store.dispatch("algod/getApplicationPrograms", {
          appIndex,
        })) as ApplicationPrograms | undefined;

        const result = await decodeAppCallWithOwners(
          entry.txn,
          appIndex,
          entry.index,
          programs?.approvalProgram,
          groupTransactions,
        );
        if (!result) return undefined;
        return { index: entry.index, appIndex, ...result };
      }),
    );
    if (generation !== decodeGeneration) return;
    summaries.value = results.flatMap((r) => {
      if (r.status === "rejected") {
        console.error("Failed to summarize an ARC-56 app call", r.reason);
        return [];
      }
      return r.value ? [r.value] : [];
    });
  } finally {
    if (generation === decodeGeneration) {
      loading.value = false;
    }
  }
};

// Keyed on transaction identity (txID), not the array reference, since
// ConnectRequestsTable rebuilds TransactionWrapper[] on every request-store
// update even when the actual transactions haven't changed.
watch(
  () => props.transactions.map((tx) => safeTxId(tx.txn)).join(","),
  () => {
    void runDecode();
  },
  { immediate: true },
);

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
                :severity="arc56TrustSeverity(summary.decoded.trust)"
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
