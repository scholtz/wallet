import { ref, shallowRef, watch, type Ref } from "vue";
import type algosdk from "algosdk";
import { useStore } from "@/store";
import {
  decodeAppCallWithOwners,
  safeTxId,
  type DecodedArc56Call,
  type AppCallGroupTxnRef,
} from "@/scripts/arc56/decode";
import type { Arc56Owner } from "@/scripts/arc56/types";
import type { ApplicationPrograms } from "@/store/algod";

// Deliberately narrow shape - structurally compatible with
// ConnectRequestsTable's TransactionWrapper[] and SignAll's entries.
export interface AppCallTxnEntry {
  index: number;
  type: string;
  txn: algosdk.Transaction;
}

export interface AppCallSummary {
  index: number;
  appIndex: bigint;
  decoded: DecodedArc56Call;
  // null = not looked up (no approvalHash); [] = looked up, no known
  // publisher; non-empty = the known publishers. See Arc56OwnerLinks.vue.
  owners: Arc56Owner[] | null;
}

// Decodes every app call in a request against the ARC-56 registry. Shared by
// Arc56RequestSummary.vue (detail card) and Arc56RiskIcon.vue (the at-a-glance
// icon next to "Sign all"), so both views always agree.
export const useArc56Summaries = (
  getTransactions: () => AppCallTxnEntry[],
): { summaries: Ref<AppCallSummary[]>; loading: Ref<boolean> } => {
  const store = useStore();
  const loading = ref(false);
  const summaries = shallowRef<AppCallSummary[]>([]);

  // Guards against a stale run overwriting a fresher one - callers rebuild
  // their transaction arrays on every store update, which can re-trigger the
  // watch before a previous decode (several algod + registry round-trips)
  // has resolved.
  let decodeGeneration = 0;

  const runDecode = async () => {
    const generation = ++decodeGeneration;
    const transactions = getTransactions();
    const groupTransactions: AppCallGroupTxnRef[] = transactions.map((tx) => ({
      index: tx.index,
      type: tx.type,
    }));
    const applCalls = transactions.filter((tx) => tx.type === "appl");
    if (applCalls.length === 0) {
      summaries.value = [];
      // This path never entered `loading = true`, but an older in-flight
      // call's `finally` skips resetting it once it sees a newer generation.
      loading.value = false;
      return;
    }

    loading.value = true;
    try {
      // allSettled: one call failing must only drop that entry, not wipe the
      // trust info of every other app call in the request.
      const results = await Promise.allSettled(
        applCalls.map(async (entry): Promise<AppCallSummary | undefined> => {
          // appIndex 0 is legitimate (application creation) - only a truly
          // missing field is skipped, so this must not be a falsy check.
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

  // Keyed on transaction identity (txID), not the array reference.
  watch(
    () => getTransactions().map((tx) => safeTxId(tx.txn)).join(","),
    () => {
      void runDecode();
    },
    { immediate: true },
  );

  return { summaries, loading };
};
