import algosdk from "algosdk";
import { Buffer } from "buffer";

export const ARC14_NOTE_SUFFIX = "#ARC14";

type Arc14Transaction = Pick<
  algosdk.Transaction,
  "type" | "group" | "rekeyTo" | "sender" | "payment" | "note"
>;

const addressToString = (value?: algosdk.Address | string): string | undefined => {
  if (!value) return undefined;
  try {
    return typeof value === "string" ? value : value.toString();
  } catch {
    return undefined;
  }
};

/**
 * Returns the raw note text if it ends with the ARC14 suffix (e.g.
 * "BiatecRouter#ARC14", see src/store/arc14.ts / src/pages/Arc14.vue),
 * otherwise undefined.
 */
export const decodeArc14Note = (note?: Uint8Array): string | undefined => {
  if (!note || note.length === 0) return undefined;
  let text: string;
  try {
    text = Buffer.from(note).toString("utf-8");
  } catch {
    return undefined;
  }
  return text.endsWith(ARC14_NOTE_SUFFIX) ? text : undefined;
};

/** Strips the trailing "#ARC14" marker so the UI can show the plain service realm. */
export const getArc14Realm = (note?: Uint8Array): string | undefined => {
  const text = decodeArc14Note(note);
  return text?.slice(0, -ARC14_NOTE_SUFFIX.length);
};

/**
 * ARC14 authenticates by signing (not broadcasting) a zero-amount, ungrouped
 * self-payment whose note ends in "#ARC14" (see src/store/arc14.ts's
 * getAuthTx / src/scripts/aggregators/biatec.ts's "BiatecRouter#ARC14" realm).
 * Detection here is intentionally strict — self-pay, no group, no rekey/close-to
 * — so the "this is just a login, not a transfer" notice can never be shown
 * for a transaction that could actually move funds, join an atomic group with
 * other transactions, or rekey/close the account.
 */
export const isArc14AuthTransaction = (
  txn?: Arc14Transaction | null
): boolean => {
  if (!txn || txn.type !== "pay") return false;
  if (txn.group && txn.group.length > 0) return false;
  if (txn.rekeyTo) return false;
  const payment = txn.payment;
  if (!payment) return false;
  if (payment.closeRemainderTo) return false;
  if (BigInt(payment.amount ?? 0) !== 0n) return false;
  if (!decodeArc14Note(txn.note)) return false;
  const sender = addressToString(txn.sender);
  const receiver = addressToString(payment.receiver);
  return !!sender && sender === receiver;
};
