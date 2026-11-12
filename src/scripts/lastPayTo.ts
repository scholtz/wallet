/**
 * Which recipient the Pay page should remember after a confirmed transaction. Kept free of runtime
 * imports so it can be unit-tested in plain Node.
 */

interface AddressLike {
  toString(): string;
}

export interface RememberableTxn {
  type?: string;
  rekeyTo?: AddressLike;
  payment?: { receiver?: AddressLike; closeRemainderTo?: AddressLike };
  assetTransfer?: { receiver?: AddressLike; closeRemainderTo?: AddressLike };
}

/**
 * The receiver of a plain payment (`pay` / `axfer`) worth pre-filling next time, or undefined.
 * Rekeys never qualify (the "receiver" of a rekey is the sender itself) and neither does a
 * transaction that also closes an account (its receiver is not the intended long-term payee).
 */
export function recipientToRemember(txn?: RememberableTxn | null): string | undefined {
  if (!txn || txn.rekeyTo) return undefined;
  const body =
    txn.type === "pay" ? txn.payment : txn.type === "axfer" ? txn.assetTransfer : undefined;
  if (!body?.receiver || body.closeRemainderTo) return undefined;
  const receiver = body.receiver.toString();
  return receiver || undefined;
}
