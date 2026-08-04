import algosdk from "algosdk";

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
