import algosdk from "algosdk";
import { Buffer } from "buffer";

export const ARC14_NOTE_SUFFIX = "#ARC14";

/** Realms of the services the wallet itself authenticates to (single source of truth). */
export const BIATEC_ROUTER_REALM = `BiatecRouter${ARC14_NOTE_SUFFIX}`;
export const BIATEC_SCAN_REALM = `BiatecScan${ARC14_NOTE_SUFFIX}`;

type Arc14Transaction = Pick<
  algosdk.Transaction,
  "type" | "group" | "rekeyTo" | "sender" | "payment" | "note" | "fee"
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

/** Highest fee (microalgos) an ARC-14 login transaction may declare: the minimum fee (AW-2026-101). */
export const ARC14_MAX_FEE_MICROALGOS = 1000n;

/**
 * ARC14 authenticates by signing (not broadcasting) a zero-amount, ungrouped
 * self-payment whose note ends in "#ARC14" (see src/store/arc14.ts's
 * getAuthTx / src/scripts/aggregators/biatec.ts's "BiatecRouter#ARC14" realm).
 * Detection here is intentionally strict — self-pay, no group, no rekey/close-to, no fee above
 * the minimum fee (the fee is burned in full if a dApp broadcasts the "login")
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
  try {
    if (BigInt(txn.fee ?? 0) > ARC14_MAX_FEE_MICROALGOS) return false;
  } catch {
    return false; // not an integer fee: never a login
  }
  const payment = txn.payment;
  if (!payment) return false;
  if (payment.closeRemainderTo) return false;
  if (BigInt(payment.amount ?? 0) !== 0n) return false;
  if (!decodeArc14Note(txn.note)) return false;
  const sender = addressToString(txn.sender);
  const receiver = addressToString(payment.receiver);
  return !!sender && sender === receiver;
};

/** Prefix of the `Authorization` value a service receives: `SigTx <base64 signed transaction>`. */
export const ARC14_TOKEN_PREFIX = "SigTx ";

/** A stored login is only reused while it stays valid this many rounds (~5 minutes) longer. */
export const ARC14_REUSE_MARGIN_ROUNDS = 100n;

/** `SigTx <base64>` for a signed login transaction. */
export const arc14TokenFromSigned = (signed: Uint8Array): string =>
  ARC14_TOKEN_PREFIX + Buffer.from(signed).toString("base64");

/** The signed transaction inside a `SigTx <base64>` token, or undefined when it is not one. */
export const parseArc14Token = (
  token: string | null | undefined,
): algosdk.SignedTransaction | undefined => {
  if (typeof token !== "string" || !token.startsWith(ARC14_TOKEN_PREFIX)) {
    return undefined;
  }
  try {
    return algosdk.decodeSignedTransaction(
      new Uint8Array(Buffer.from(token.slice(ARC14_TOKEN_PREFIX.length), "base64")),
    );
  } catch {
    return undefined;
  }
};

/** True when the signed transaction carries everything a service needs (a multisig only at its threshold). */
const isCompletelySigned = (signed: algosdk.SignedTransaction): boolean => {
  if (signed.msig) {
    return signed.msig.subsig.filter((s) => !!s.s).length >= signed.msig.thr;
  }
  return !!signed.sig || !!signed.lsig;
};

/**
 * True when `token` is a complete ARC-14 login of `account` for `realm` that is still valid at
 * `currentRound` (with a margin, so it does not expire between the check and the request).
 * Used to decide whether an account that cannot sign in place (multisig, Ledger) has to be asked
 * again: the login is signed once and reused, instead of once per request.
 */
export const isArc14TokenUsable = (
  token: string | null | undefined,
  account: string,
  realm: string,
  currentRound: bigint,
): boolean => {
  const signed = parseArc14Token(token);
  if (!signed) return false;
  const txn = signed.txn;
  if (!isArc14AuthTransaction(txn)) return false;
  if (addressToString(txn.sender) !== account) return false;
  if (Buffer.from(txn.note ?? []).toString("utf-8") !== realm) return false;
  if (!isCompletelySigned(signed)) return false;
  return (
    BigInt(txn.firstValid) <= currentRound + 1n &&
    BigInt(txn.lastValid) >= currentRound + ARC14_REUSE_MARGIN_ROUNDS
  );
};

/**
 * Realms of the services the wallet itself authenticates to with hardcoded realm strings. A
 * participation or two-factor host chosen from a remote list must not be able to answer with one
 * of them and so collect a token that is valid at another service (AW-2026-087).
 */
export const RESERVED_ARC14_REALMS: readonly string[] = [
  BIATEC_ROUTER_REALM,
  BIATEC_SCAN_REALM,
];

/** True when `realm` (with or without the `#ARC14` marker) names a service with a reserved realm. */
export const isReservedArc14Realm = (realm: string | null | undefined): boolean => {
  if (typeof realm !== "string") return false;
  const normalized = realm.trim().toLowerCase();
  const withMarker = normalized.endsWith(ARC14_NOTE_SUFFIX.toLowerCase())
    ? normalized
    : normalized + ARC14_NOTE_SUFFIX.toLowerCase();
  return RESERVED_ARC14_REALMS.some((reserved) => reserved.toLowerCase() === withMarker);
};

/** Returns a realm received from a remote host, or throws when it impersonates another service. */
export const assertRemoteArc14Realm = (realm: string): string => {
  if (isReservedArc14Realm(realm)) {
    throw new Error("The service answered with a realm that belongs to another service.");
  }
  return realm;
};
