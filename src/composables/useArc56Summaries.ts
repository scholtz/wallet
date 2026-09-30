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

type Store = ReturnType<typeof useStore>;

// Concurrent callers over the same transactions (the risk icon on a
// collapsed row, then the summary card when it is expanded) share one decode
// instead of each repeating the hashing / registry fan-out. A finished
// result is reused for only a few seconds - an app's program can change
// mid-session (update txn) - and only when it is definitive: a timeout, an
// error or an "unknown" verdict may be down to a transient outage, so those
// are dropped on settle and always retried.
const RECENT_TTL_MS = 15_000;
interface SharedDecode {
  promise: Promise<AppCallSummary[]>;
  settledAt: number | null;
}
const shared = new Map<string, SharedDecode>();

const decodeAll = async (
  store: Store,
  transactions: AppCallTxnEntry[],
): Promise<AppCallSummary[]> => {
  const groupTransactions: AppCallGroupTxnRef[] = transactions.map((tx) => ({
    index: tx.index,
    type: tx.type,
  }));
  const applCalls = transactions.filter((tx) => tx.type === "appl");
  if (applCalls.length === 0) return [];

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
  return results.flatMap((r) => {
    if (r.status === "rejected") {
      console.error("Failed to summarize an ARC-56 app call", r.reason);
      return [];
    }
    return r.value ? [r.value] : [];
  });
};

// Overall bound on one verdict: the decode chains several dependent registry
// calls (each with its own per-fetch timeout), so without this the spinner
// could sit next to "Sign all" for minutes. On expiry the request is treated
// as unverified (no summaries -> fail-closed warning in Arc56RiskIcon).
const DECODE_DEADLINE_MS = 30_000;

const withDeadline = (promise: Promise<AppCallSummary[]>): Promise<AppCallSummary[]> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve([]), DECODE_DEADLINE_MS);
    promise
      .then(resolve, (error) => {
        console.error("Failed to summarize ARC-56 app calls", error);
        resolve([]);
      })
      .finally(() => clearTimeout(timer));
  });

const decodeShared = (store: Store, transactions: AppCallTxnEntry[]): Promise<AppCallSummary[]> => {
  const ids = transactions.map((tx) => safeTxId(tx.txn));
  // safeTxId() returns "" for an un-hashable transaction; two different
  // requests must never collide on such a key and share each other's verdict.
  if (ids.some((id) => id === "")) return withDeadline(decodeAll(store, transactions));
  const key = transactions.map((tx, i) => `${tx.index}:${ids[i]}`).join(",");
  const existing = shared.get(key);
  if (existing && (existing.settledAt === null || Date.now() - existing.settledAt < RECENT_TTL_MS)) {
    return existing.promise;
  }
  const expected = transactions.filter((tx) => tx.type === "appl").length;
  const entry: SharedDecode = {
    promise: withDeadline(decodeAll(store, transactions)),
    settledAt: null,
  };
  void entry.promise.then((result) => {
    const definitive =
      result.length === expected &&
      result.every((r) => r.decoded.trust !== "unknown" && r.decoded.trust !== "selector-only");
    if (definitive) entry.settledAt = Date.now();
    else if (shared.get(key) === entry) shared.delete(key);
  });
  shared.set(key, entry);
  for (const [k, v] of shared) {
    if (v.settledAt !== null && Date.now() - v.settledAt >= RECENT_TTL_MS) shared.delete(k);
  }
  return entry.promise;
};

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
  // their transaction arrays on every store update.
  let decodeGeneration = 0;

  const runDecode = async () => {
    const generation = ++decodeGeneration;
    const transactions = getTransactions();
    if (!transactions.some((tx) => tx.type === "appl")) {
      summaries.value = [];
      loading.value = false;
      return;
    }
    loading.value = true;
    // Never let a consumer read the previous request's verdict while this
    // one is pending or if it fails.
    summaries.value = [];
    try {
      const result = await decodeShared(store, transactions);
      if (generation !== decodeGeneration) return;
      summaries.value = result;
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
