<script setup lang="ts">
import { ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import algosdk from "algosdk";
import { useStore } from "@/store";
import {
  decodeArc56AppCall,
  buildAppCallInfo,
  type DecodedArc56Call,
  type AppCallGroupTxnRef,
} from "@/scripts/arc56/decode";
import { fetchArc56OwnersByProgramHash } from "@/scripts/arc56/registry";
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
  owners: Arc56Owner[];
}

const loading = ref(false);
const summaries = shallowRef<AppCallSummary[]>([]);

const runDecode = async () => {
  const groupTransactions: AppCallGroupTxnRef[] = props.transactions.map((t) => ({
    index: t.index,
    type: t.type,
  }));
  const applCalls = props.transactions.filter((t) => t.type === "appl");
  if (applCalls.length === 0) {
    summaries.value = [];
    return;
  }

  loading.value = true;
  try {
    const results = await Promise.all(
      applCalls.map(async (entry): Promise<AppCallSummary | undefined> => {
        const rawAppIndex = entry.txn.applicationCall?.appIndex;
        if (!rawAppIndex) return undefined;
        const appIndex = BigInt(rawAppIndex);
        const programs = (await store.dispatch("algod/getApplicationPrograms", {
          appIndex,
        })) as ApplicationPrograms | undefined;

        const info = buildAppCallInfo(
          entry.txn,
          appIndex,
          entry.index,
          programs?.approvalProgram,
          groupTransactions,
        );
        if (!info) return undefined;

        const decoded = await decodeArc56AppCall(info);
        const ownersEntry = decoded.approvalHash
          ? await fetchArc56OwnersByProgramHash(decoded.approvalHash, "approval")
          : undefined;

        return { index: entry.index, appIndex, decoded, owners: ownersEntry?.owners ?? [] };
      }),
    );
    summaries.value = results.filter((r): r is AppCallSummary => Boolean(r));
  } catch (error) {
    console.error("Failed to summarize ARC-56 app calls", error);
    summaries.value = [];
  } finally {
    loading.value = false;
  }
};

// Keyed on transaction identity (txID), not the array reference, since
// ConnectRequestsTable rebuilds TransactionWrapper[] on every request-store
// update even when the actual transactions haven't changed.
watch(
  () => props.transactions.map((t) => t.txn?.txID?.() ?? "").join(","),
  () => {
    void runDecode();
  },
  { immediate: true },
);

const trustSeverity = (trust: DecodedArc56Call["trust"]) => {
  switch (trust) {
    case "verified":
      return "success";
    case "verified-other-method":
      return "error";
    case "selector-only":
    case "unknown":
      return "warn";
    default:
      return "secondary";
  }
};

const trustTitleKey = (trust: DecodedArc56Call["trust"]) => {
  switch (trust) {
    case "verified":
      return "arc56.trust_verified";
    case "verified-other-method":
      return "arc56.trust_verified_other_method";
    case "selector-only":
      return "arc56.trust_selector_only";
    case "unknown":
      return "arc56.trust_unknown";
    default:
      return "arc56.trust_not_abi";
  }
};

const trustDescKey = (trust: DecodedArc56Call["trust"]) => {
  switch (trust) {
    case "verified":
      return "arc56.trust_verified_desc";
    case "verified-other-method":
      return "arc56.trust_verified_other_method_desc";
    case "selector-only":
      return "arc56.trust_selector_only_desc";
    case "unknown":
      return "arc56.trust_unknown_desc";
    default:
      return "arc56.trust_not_abi_desc";
  }
};

// Only worth its own dedicated summary card when it's the one and only
// transaction in the request - a user relying on "Sign all" without
// expanding anything should still see this. For a multi-transaction group,
// the compact per-app list below already surfaces the same warnings without
// taking over the space above the full transaction table.
const isSingleAppCall = () =>
  props.transactions.length === 1 && summaries.value.length === 1;
</script>

<template>
  <div v-if="summaries.length > 0 || loading" class="arc56-request-summary">
    <div v-if="loading" class="arc56-summary-loading">
      <ProgressSpinner style="width: 1.5em; height: 1.5em" stroke-width="6" />
      {{ t("arc56.loading") }}
    </div>
    <template v-else-if="isSingleAppCall()">
      <h4 class="m-0 mb-2">{{ t("arc56.summary_title") }}</h4>
      <Message :severity="trustSeverity(summaries[0].decoded.trust)" class="m-0 mb-2">
        <div class="arc56-trust-title">{{ t(trustTitleKey(summaries[0].decoded.trust)) }}</div>
        <div class="arc56-trust-desc">{{ t(trustDescKey(summaries[0].decoded.trust)) }}</div>
      </Message>
      <div v-if="summaries[0].decoded.contract" class="mb-1">
        <strong>{{ t("arc56.contract_name") }}:</strong> {{ summaries[0].decoded.contract.name }}
      </div>
      <div v-if="summaries[0].decoded.methodSignature" class="mb-1">
        <strong>{{ t("arc56.method_signature") }}:</strong>
        {{ summaries[0].decoded.methodSignature }}
      </div>
      <div v-if="summaries[0].owners.length > 0" class="mb-1">
        <strong>{{ t("arc56.published_by") }}:</strong>
        <a
          v-for="(owner, i) in summaries[0].owners"
          :key="owner.url"
          :href="owner.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ owner.owner }}/{{ owner.repo }}<span v-if="i < summaries[0].owners.length - 1">, </span>
        </a>
      </div>
      <Message v-else severity="warn" class="m-0">
        {{ t("arc56.no_owners_found") }}
      </Message>
    </template>
    <template v-else>
      <h4 class="m-0 mb-2">{{ t("arc56.summary_multi_title", { count: summaries.length }) }}</h4>
      <table class="arc56-summary-table">
        <tbody>
          <tr v-for="summary in summaries" :key="summary.index">
            <td>{{ t("arc56.summary_app", { appIndex: summary.appIndex }) }}</td>
            <td>
              <Badge
                :severity="trustSeverity(summary.decoded.trust)"
                :value="t(trustTitleKey(summary.decoded.trust))"
              />
            </td>
            <td>
              <span v-if="summary.owners.length > 0">
                <a
                  v-for="(owner, i) in summary.owners"
                  :key="owner.url"
                  :href="owner.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ owner.owner }}/{{ owner.repo }}<span v-if="i < summary.owners.length - 1">, </span>
                </a>
              </span>
              <Message v-else severity="warn" class="m-0">
                {{ t("arc56.no_owners_found") }}
              </Message>
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
