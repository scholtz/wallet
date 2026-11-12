/**
 * Pure description of what a transaction moves, read from algosdk v3's nested fields
 * (`payment`, `assetTransfer`, `applicationCall`) and never from flat v2 names such as `amount`
 * or `reKeyTo` (AW-2026-112). Structural types only, so it runs in the Node unit tests.
 */

interface AddressLike {
  toString(): string;
}

interface ResourceRefLike {
  appIndex?: bigint | number;
  assetIndex?: bigint | number;
  address?: AddressLike;
  holding?: { assetIndex: bigint | number; address?: AddressLike };
  locals?: { appIndex: bigint | number; address?: AddressLike };
  box?: { appIndex: bigint | number; name: Uint8Array };
}

export interface ReviewTxnLike {
  type?: string;
  payment?: { receiver?: AddressLike; amount?: bigint | number };
  assetTransfer?: {
    assetIndex?: bigint | number;
    receiver?: AddressLike;
    amount?: bigint | number;
    assetSender?: AddressLike;
  };
  applicationCall?: {
    appIndex?: bigint | number;
    onComplete?: number;
    access?: ReadonlyArray<ResourceRefLike>;
    rejectVersion?: number;
  };
}

export interface TransferDetails {
  /** `undefined` for the native token, the asset id for an asset transfer. */
  assetId?: string;
  /** Base units, exactly as signed. */
  amount: bigint;
  receiver?: string;
  /** Clawback source: the asset is taken from this account, not from the sender. */
  assetSender?: string;
}

const isZero = (value?: bigint | number): boolean => value === undefined || BigInt(value) === 0n;

/** What a `pay` / `axfer` transaction moves; undefined for every other type. */
export function describeTransfer(txn?: ReviewTxnLike | null): TransferDetails | undefined {
  if (!txn) return undefined;
  if (txn.type === "pay" && txn.payment) {
    return {
      amount: BigInt(txn.payment.amount ?? 0),
      receiver: txn.payment.receiver?.toString(),
    };
  }
  if (txn.type === "axfer" && txn.assetTransfer) {
    const transfer = txn.assetTransfer;
    return {
      assetId: BigInt(transfer.assetIndex ?? 0).toString(),
      amount: BigInt(transfer.amount ?? 0),
      receiver: transfer.receiver?.toString(),
      assetSender: transfer.assetSender?.toString() || undefined,
    };
  }
  return undefined;
}

const ZERO_ADDRESS = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";
/** The zero address in an access-list entry stands for the transaction's sender. */
const accessAddress = (address?: AddressLike): string => {
  const text = address?.toString();
  return !text || text === ZERO_ADDRESS ? "sender" : text;
};

/**
 * One line per entry of an application call's access list (ARC-4 resource references), so the
 * accounts, assets, holdings, local states and boxes it makes available are all visible
 * (AW-2026-122).
 */
export function describeAccessList(txn?: ReviewTxnLike | null): string[] {
  const access = txn?.applicationCall?.access ?? [];
  return access.map((ref) => {
    if (ref.holding) {
      return `holding: asset ${BigInt(ref.holding.assetIndex)} of ${accessAddress(ref.holding.address)}`;
    }
    if (ref.locals) {
      return `local state: app ${BigInt(ref.locals.appIndex)} of ${accessAddress(ref.locals.address)}`;
    }
    if (ref.box) {
      const name = Array.from(ref.box.name, (b) => b.toString(16).padStart(2, "0")).join("");
      return `box: app ${BigInt(ref.box.appIndex)}, name 0x${name}`;
    }
    if (ref.address) return `account: ${ref.address.toString()}`;
    if (!isZero(ref.appIndex)) return `app: ${BigInt(ref.appIndex!)}`;
    if (!isZero(ref.assetIndex)) return `asset: ${BigInt(ref.assetIndex!)}`;
    return "empty reference";
  });
}

/** The version an application call is rejected below (0 / absent = no restriction). */
export function describeRejectVersion(txn?: ReviewTxnLike | null): number | undefined {
  const version = txn?.applicationCall?.rejectVersion;
  return version && version > 0 ? version : undefined;
}

/**
 * How to label an asset amount. Without known metadata the amount is shown in raw base units
 * under the asset id taken from the transaction itself - never as the native token and never
 * scaled by guessed decimals (AW-2026-117).
 */
export function assetAmountLabel(
  assetId: string,
  amount: bigint,
  meta?: { name?: string; decimals?: number },
): { text: string; known: boolean } {
  if (!meta || meta.decimals === undefined) {
    return { text: `${amount.toString()} (asset ${assetId}, base units)`, known: false };
  }
  const decimals = Math.max(0, Math.floor(meta.decimals));
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const fraction = decimals === 0 ? "" : "." + (amount % base).toString().padStart(decimals, "0");
  const unit = meta.name ? ` ${meta.name}` : "";
  return { text: `${whole.toString()}${fraction}${unit} (asset ${assetId})`, known: true };
}
