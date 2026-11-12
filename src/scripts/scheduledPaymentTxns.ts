import type algosdk from "algosdk";
import { MAX_SWAP_TXN_FEE_MICROALGOS } from "./aggregators/validate";

/** Transaction types the scheduler may ask the wallet to sign for one of its own accounts. */
const SCHEDULER_OWN_SENDER_TYPES: readonly string[] = ["pay", "axfer", "appl"];
/** OnApplicationComplete values allowed: NoOp (0) and OptIn (1). */
const SCHEDULER_ALLOWED_ON_COMPLETE: readonly number[] = [0, 1];

/**
 * Checks the transactions the scheduler API (`api-scheduler.biatec.io`) returns before they are
 * handed to the signing pages (AW-2026-085). They are built by a third-party service and signed
 * with one click, so a compromised or intercepted response must not be able to rekey one of the
 * wallet's accounts, close its balance or burn a large fee. Transactions of other senders (the
 * scheduler's escrow) are not signed by this wallet and only have their fee bounded.
 *
 * Throws with a user-readable message on the first problem.
 */
export function assertScheduledTransactionsSafe(
  txs: algosdk.Transaction[],
  ownAddresses: string[],
): void {
  if (txs.length === 0) {
    throw new Error("The scheduler returned no transactions.");
  }
  const own = new Set(ownAddresses);
  for (const tx of txs) {
    if (BigInt(tx.fee) > MAX_SWAP_TXN_FEE_MICROALGOS) {
      throw new Error(
        "Refusing to sign a scheduler transaction: its fee exceeds the maximum allowed.",
      );
    }
    if (!own.has(tx.sender.toString())) continue;
    // Allow-list for the wallet's own accounts (AW-2026-110): the scheduler only ever needs plain
    // payments, asset transfers and calls to its own contract; acfg/afrz/keyreg and the
    // Update/Delete/ClearState/CloseOut application calls would change or give up control.
    if (!SCHEDULER_OWN_SENDER_TYPES.includes(tx.type)) {
      throw new Error(
        `Refusing to sign a scheduler transaction: type "${tx.type}" is not expected for a scheduled payment.`,
      );
    }
    if (tx.type === "appl") {
      const onComplete = Number(tx.applicationCall?.onComplete ?? 0);
      if (!SCHEDULER_ALLOWED_ON_COMPLETE.includes(onComplete)) {
        throw new Error(
          "Refusing to sign a scheduler transaction: the application call updates, deletes or leaves the application.",
        );
      }
    }
    if (tx.rekeyTo) {
      throw new Error(
        "Refusing to sign a scheduler transaction: it attempts to rekey your account.",
      );
    }
    if (tx.payment?.closeRemainderTo) {
      throw new Error(
        "Refusing to sign a scheduler transaction: it attempts to close your account's ALGO balance.",
      );
    }
    if (tx.assetTransfer?.closeRemainderTo) {
      throw new Error(
        "Refusing to sign a scheduler transaction: it attempts to close an asset balance.",
      );
    }
  }
}
