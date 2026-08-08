import algosdk from "algosdk";

type AddressLike =
  | algosdk.Address
  | { publicKey?: Uint8Array }
  | Uint8Array
  | string
  | null
  | undefined;

interface AssetTransferLike {
  assetIndex?: number | bigint;
  amount?: number | bigint;
  receiver?: AddressLike;
  closeRemainderTo?: AddressLike;
}

interface TransactionLike {
  type?: string;
  sender?: AddressLike;
  from?: AddressLike;
  assetTransfer?: AssetTransferLike;
}

const toAddressString = (addr: AddressLike): string | undefined => {
  if (!addr) return undefined;
  if (typeof addr === "string") return addr;
  if (addr instanceof Uint8Array) return algosdk.encodeAddress(addr);
  if (addr instanceof algosdk.Address) return addr.toString();
  if (addr.publicKey instanceof Uint8Array) {
    return algosdk.encodeAddress(addr.publicKey);
  }
  return undefined;
};

const isRealAddress = (addr: string | undefined): addr is string =>
  !!addr && addr !== algosdk.ALGORAND_ZERO_ADDRESS_STRING;

/**
 * An axfer where the sender opts itself into an asset: zero amount,
 * a real asset id, receiver == sender, and no asset close-out.
 * Distinguished from a regular asset transfer so signing UIs can label
 * it accurately for the user reviewing the transaction.
 */
export const isAssetOptIn = (txn: TransactionLike | null | undefined): boolean => {
  if (!txn || String(txn.type) !== "axfer") return false;
  const assetTransfer = txn.assetTransfer;
  if (!assetTransfer) return false;
  if (BigInt(assetTransfer.assetIndex ?? 0) <= 0n) return false;
  if (BigInt(assetTransfer.amount ?? 0) !== 0n) return false;
  if (isRealAddress(toAddressString(assetTransfer.closeRemainderTo)))
    return false;
  const sender = toAddressString(txn.sender ?? txn.from);
  const receiver = toAddressString(assetTransfer.receiver);
  return isRealAddress(sender) && sender === receiver;
};
