// scripts/simulateStateChanges.ts - Splits a flat list of (possibly
// multi-group) unsigned transactions back into their atomic groups, and
// summarizes an algod `simulateTransactions` response into a flat list of
// every global/local application state change (incl. inner-txn app calls),
// so a "transactions to sign" review screen can show the real, ledger-computed
// state deltas before the user signs anything.
import algosdk from "algosdk";
import { Buffer } from "buffer";

export interface AppStateChangeRow {
  appIndex: bigint;
  scope: "global" | "local";
  // Only present for scope === "local".
  account?: string;
  key: string;
  keyRaw: string;
  action: "set" | "delete";
  value?: string;
  // Raw form of a "set" value, kept alongside the best-effort `value` display
  // string so a caller with ARC-56 type metadata can re-decode it precisely
  // (e.g. as a uint256) instead of relying on the untyped fallback below.
  valueBytesRaw?: string;
  valueUint?: bigint;
  // 0-based index into the flat transaction list passed to summarizeAppStateChanges.
  txnIndex: number;
  // Human-readable origin, e.g. "3" for the 4th top-level txn, "3.1" for its first inner txn.
  path: string;
}

export interface AppStateChangesSummary {
  rows: AppStateChangeRow[];
  failureMessage?: string;
}

// Transactions destined for the same atomic group carry an identical, non-empty
// `group` id and appear contiguously in submission order - split on that.
export function groupTransactionsByGroupId(
  txns: algosdk.Transaction[],
): algosdk.Transaction[][] {
  const groups: algosdk.Transaction[][] = [];
  let current: algosdk.Transaction[] = [];
  let currentGroupB64: string | undefined;

  for (const txn of txns) {
    const groupB64 =
      txn.group && txn.group.length > 0
        ? Buffer.from(txn.group).toString("base64")
        : undefined;

    if (!groupB64) {
      if (current.length) groups.push(current);
      groups.push([txn]);
      current = [];
      currentGroupB64 = undefined;
      continue;
    }

    if (groupB64 !== currentGroupB64) {
      if (current.length) groups.push(current);
      current = [txn];
      currentGroupB64 = groupB64;
    } else {
      current.push(txn);
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

interface DecodedBytes {
  text?: string;
  hex: string;
}

const isPrintableAscii = (value: string) => /^[\x20-\x7E]*$/.test(value);

// Deliberately does NOT guess a semantic type from byte shape (e.g. "32
// bytes -> address") - that misrepresents equally-plausible values like a
// uint256, which is also 32 bytes. Callers with ARC-56 state-key metadata
// should decode `valueBytesRaw`/`valueUint` against the declared type
// instead (see scripts/arc56/state.ts); this is only the untyped fallback.
function decodeB64Bytes(b64: string): DecodedBytes {
  const buffer = Buffer.from(b64, "base64");
  const hex = buffer.toString("hex");
  const text = buffer.toString("utf-8");
  const printable = buffer.length > 0 && isPrintableAscii(text);
  return { text: printable ? text : undefined, hex };
}

const formatDecodedBytes = (decoded: DecodedBytes): string => {
  if (decoded.text) return decoded.text;
  return `0x${decoded.hex}`;
};

function buildRow(
  appIndex: bigint,
  scope: "global" | "local",
  account: string | undefined,
  kv: algosdk.modelsv2.EvalDeltaKeyValue,
  txnIndex: number,
  path: string,
): AppStateChangeRow {
  const isDelete =
    kv.value.action === 3 ||
    (kv.value.bytes === undefined && kv.value.uint === undefined);

  let value: string | undefined;
  let valueUint: bigint | undefined;
  let valueBytesRaw: string | undefined;
  if (!isDelete) {
    if (kv.value.uint !== undefined) {
      valueUint = kv.value.uint;
      value = kv.value.uint.toString();
    } else if (kv.value.bytes !== undefined) {
      valueBytesRaw = kv.value.bytes;
      value = formatDecodedBytes(decodeB64Bytes(kv.value.bytes));
    }
  }

  return {
    appIndex,
    scope,
    account,
    key: formatDecodedBytes(decodeB64Bytes(kv.key)),
    keyRaw: kv.key,
    action: isDelete ? "delete" : "set",
    value,
    valueUint,
    valueBytesRaw,
    txnIndex,
    path,
  };
}

function walkAppStateChanges(
  result: algosdk.modelsv2.PendingTransactionResponse | undefined,
  txnIndex: number,
  path: string,
  rows: AppStateChangeRow[],
): void {
  if (!result) return;

  const calledAppIndex = result.txn?.txn?.applicationCall?.appIndex;
  const appIndex =
    calledAppIndex !== undefined && calledAppIndex !== 0n
      ? BigInt(calledAppIndex)
      : result.applicationIndex !== undefined
        ? BigInt(result.applicationIndex)
        : undefined;

  if (appIndex !== undefined) {
    for (const kv of result.globalStateDelta ?? []) {
      rows.push(buildRow(appIndex, "global", undefined, kv, txnIndex, path));
    }
    for (const accountDelta of result.localStateDelta ?? []) {
      for (const kv of accountDelta.delta ?? []) {
        rows.push(
          buildRow(
            appIndex,
            "local",
            accountDelta.address,
            kv,
            txnIndex,
            path,
          ),
        );
      }
    }
  }

  (result.innerTxns ?? []).forEach((inner, innerIdx) => {
    walkAppStateChanges(inner, txnIndex, `${path}.${innerIdx + 1}`, rows);
  });
}

// `groups` must be the exact same, order-preserved atomic groups that were
// encoded (via algosdk.encodeUnsignedSimulateTransaction) into the
// `SimulateRequest` that produced `response`.
export function summarizeAppStateChanges(
  response: algosdk.modelsv2.SimulateResponse,
  groups: algosdk.Transaction[][],
): AppStateChangesSummary {
  const rows: AppStateChangeRow[] = [];
  let failureMessage: string | undefined;
  let flatBase = 0;

  response.txnGroups.forEach((groupResult, groupIdx) => {
    if (groupResult.failedAt) {
      failureMessage = groupResult.failureMessage || "Simulation failed";
    }
    groupResult.txnResults.forEach((txnResult, txnIdx) => {
      const flatIdx = flatBase + txnIdx;
      walkAppStateChanges(
        txnResult.txnResult,
        flatIdx,
        String(flatIdx + 1),
        rows,
      );
    });
    flatBase += groups[groupIdx]?.length ?? groupResult.txnResults.length;
  });

  return { rows, failureMessage };
}
