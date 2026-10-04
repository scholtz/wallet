import algosdk from "algosdk";

/**
 * Upper bound for the fee of any single transaction signed from an aggregator/lend response
 * (0.5 ALGO — app calls pooling many inner transactions stay far below it). A poisoned node's
 * suggested params must not be able to turn a signature into a large fee payment (AW-2026-053).
 */
export const MAX_SWAP_TXN_FEE_MICROALGOS = 500_000n;

/**
 * Guards against AW-2026-043: DEX aggregator APIs return transactions that get
 * signed with the raw account key and submitted with no review. A compromised
 * or malicious aggregator could slip in a closeRemainderTo/assetCloseTo/rekeyTo
 * (drains the account or hands over signing authority) or a transaction whose
 * sender isn't the connected account. None of these have any legitimate role
 * in a swap route, so reject the whole batch rather than trying to sanitize it.
 */
export function assertSwapTransactionSafe(
  tx: algosdk.Transaction,
  expectedSenderAddr: string,
): void {
  if (BigInt(tx.fee) > MAX_SWAP_TXN_FEE_MICROALGOS) {
    throw new Error(
      "Refusing to sign swap transaction: its fee exceeds the maximum allowed.",
    );
  }
  const sender = tx.sender.toString();
  if (sender !== expectedSenderAddr) {
    throw new Error(
      `Refusing to sign swap transaction: sender (${sender}) does not match the connected account (${expectedSenderAddr}).`,
    );
  }
  if (tx.rekeyTo) {
    throw new Error(
      "Refusing to sign swap transaction: it attempts to rekey this account.",
    );
  }
  if (tx.payment?.closeRemainderTo) {
    throw new Error(
      "Refusing to sign swap transaction: it attempts to close the account's ALGO balance.",
    );
  }
  if (tx.assetTransfer?.closeRemainderTo) {
    throw new Error(
      "Refusing to sign swap transaction: it attempts to close an asset balance.",
    );
  }
}

export function assertSwapTransactionsSafe(
  txs: algosdk.Transaction[],
  expectedSenderAddr: string,
): void {
  for (const tx of txs) {
    assertSwapTransactionSafe(tx, expectedSenderAddr);
  }
}
