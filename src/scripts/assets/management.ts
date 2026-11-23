import algosdk from "algosdk";
import { MAX_AUTO_FEE_MICROALGOS } from "../fees";

// Asset (ASA) management: freeze / unfreeze a holder, claw back (revoke) units, change the
// manager / reserve / freeze / clawback addresses and destroy the asset. Each of these is
// signed by the account that holds the matching role of the asset, never by whoever happens to
// be selected in the wallet: the protocol rejects anything else, and building a transaction
// for the wrong sender would only waste the user's signing ceremony.

/** The four configurable addresses of an asset. An empty string = the role is disabled. */
export interface AssetRoles {
  manager: string;
  reserve: string;
  freeze: string;
  clawback: string;
}

export type AssetRole = keyof AssetRoles;

export const ASSET_ROLES: readonly AssetRole[] = [
  "manager",
  "reserve",
  "freeze",
  "clawback",
];

/** What the management page can do with an asset. */
export type AssetAction = "freeze" | "clawback" | "modify" | "destroy";

export const ASSET_ACTIONS: readonly AssetAction[] = [
  "freeze",
  "clawback",
  "modify",
  "destroy",
];

/** The asset as the node reports it, reduced to what management needs. */
export interface ManagedAsset {
  assetId: bigint;
  name: string;
  unitName: string;
  url: string;
  decimals: number;
  total: bigint;
  defaultFrozen: boolean;
  creator: string;
  roles: AssetRoles;
}

/** The parameters algod and the indexer both report for an asset (algosdk models). */
export interface AssetParamsLike {
  creator: string | { toString(): string };
  decimals: number | bigint;
  total: number | bigint;
  defaultFrozen?: boolean;
  name?: string;
  unitName?: string;
  url?: string;
  manager?: string | { toString(): string };
  reserve?: string | { toString(): string };
  freeze?: string | { toString(): string };
  clawback?: string | { toString(): string };
}

/** Maps an algod / indexer asset onto ManagedAsset (absent addresses become ""). */
export const toManagedAsset = (
  index: number | bigint,
  p: AssetParamsLike,
): ManagedAsset => ({
  assetId: BigInt(index),
  name: p.name ?? "",
  unitName: p.unitName ?? "",
  url: p.url ?? "",
  decimals: Number(p.decimals),
  total: BigInt(p.total),
  defaultFrozen: !!p.defaultFrozen,
  creator: String(p.creator),
  roles: {
    manager: p.manager ? String(p.manager) : "",
    reserve: p.reserve ? String(p.reserve) : "",
    freeze: p.freeze ? String(p.freeze) : "",
    clawback: p.clawback ? String(p.clawback) : "",
  },
});

/** A holding of the asset by one account. */
export interface AssetHolding {
  optedIn: boolean;
  amount: bigint;
  frozen: boolean;
}

/** The role whose address has to sign an action. */
export const actionRole = (action: AssetAction): AssetRole => {
  switch (action) {
    case "freeze":
      return "freeze";
    case "clawback":
      return "clawback";
    case "modify":
    case "destroy":
      return "manager";
  }
};

/** Address that signs `action`, or undefined when the role is disabled (permanently). */
export const actionSender = (
  asset: Pick<ManagedAsset, "roles">,
  action: AssetAction,
): string | undefined => asset.roles[actionRole(action)] || undefined;

/** App path of an action of the asset (the clawback page keeps its historic "revoke" path). */
export const assetActionPath = (
  assetId: bigint | string,
  action?: AssetAction,
): string => {
  const segment = !action
    ? "manage"
    : action === "clawback"
      ? "revoke"
      : action;
  return `/asset/${segment}/${assetId}`;
};

/** Reads the route's action parameter; anything unknown means the overview. */
export const parseAssetAction = (
  value: string | undefined,
): AssetAction | undefined =>
  value !== undefined && (ASSET_ACTIONS as readonly string[]).includes(value)
    ? (value as AssetAction)
    : undefined;

/** Reads a route's asset id; only positive integers are asset ids. */
export const parseAssetId = (value: string | undefined): bigint | undefined => {
  if (value === undefined || !/^[0-9]{1,20}$/.test(value)) {
    return undefined;
  }
  const id = BigInt(value);
  return id > 0n && id <= 0xffffffffffffffffn ? id : undefined;
};

/**
 * Converts a user-typed decimal amount (e.g. "1.5") into base units of an asset with `decimals`
 * decimals. Undefined for anything that is not a positive amount representable exactly: more
 * fraction digits than the asset has, exponents, signs, thousand separators.
 */
export const parseAssetAmount = (
  input: string,
  decimals: number,
): bigint | undefined => {
  const value = input.trim();
  const match = /^([0-9]*)(?:\.([0-9]*))?$/.exec(value);
  if (!match || !/[0-9]/.test(value)) return undefined;
  const whole = match[1] || "0";
  const fraction = (match[2] ?? "").replace(/0+$/, "");
  if (fraction.length > decimals) return undefined;
  const units =
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt((fraction || "0").padEnd(decimals, "0") || "0");
  if (units <= 0n || units > 0xffffffffffffffffn) return undefined;
  return units;
};

/** Base units -> decimal string ("1500000", 6 -> "1.5"). */
export const formatAssetAmount = (units: bigint, decimals: number): string => {
  if (decimals <= 0) return units.toString();
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const scale = 10n ** BigInt(decimals);
  const whole = abs / scale;
  const fraction = (abs % scale)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? "." + fraction : ""}`;
};

/** Why a freeze / unfreeze cannot be sent. */
export type FreezeProblem = "invalid_target" | "not_opted_in" | "no_change";

export const checkFreeze = ({
  targetValid,
  holding,
  frozen,
}: {
  targetValid: boolean;
  holding: AssetHolding | undefined;
  frozen: boolean;
}): FreezeProblem | undefined => {
  if (!targetValid) return "invalid_target";
  if (!holding?.optedIn) return "not_opted_in";
  if (holding.frozen === frozen) return "no_change";
  return undefined;
};

/** Why a clawback cannot be sent. */
export type ClawbackProblem =
  | "invalid_target"
  | "invalid_receiver"
  | "same_account"
  | "target_not_opted_in"
  | "receiver_not_opted_in"
  | "invalid_amount"
  | "insufficient_balance";

export const checkClawback = ({
  target,
  receiver,
  targetValid,
  receiverValid,
  targetHolding,
  receiverHolding,
  amount,
}: {
  target: string;
  receiver: string;
  targetValid: boolean;
  receiverValid: boolean;
  targetHolding: AssetHolding | undefined;
  receiverHolding: AssetHolding | undefined;
  amount: bigint | undefined;
}): ClawbackProblem | undefined => {
  if (!targetValid) return "invalid_target";
  if (!receiverValid) return "invalid_receiver";
  if (target === receiver) return "same_account";
  if (!targetHolding?.optedIn) return "target_not_opted_in";
  if (!receiverHolding?.optedIn) return "receiver_not_opted_in";
  if (amount === undefined || amount <= 0n) return "invalid_amount";
  if (amount > targetHolding.amount) return "insufficient_balance";
  return undefined;
};

/** Outcome of comparing the asset's current addresses with the ones the user entered. */
export interface ConfigChangeCheck {
  /** Something differs from the asset's current configuration. */
  changed: boolean;
  /** Entered addresses that are not valid Algorand addresses. */
  invalid: AssetRole[];
  /** Roles that are disabled today and would be set again: the protocol refuses that. */
  restored: AssetRole[];
  /** Roles enabled today that would be disabled - permanently. */
  cleared: AssetRole[];
  /** The manager would be cleared: the asset can never be changed or destroyed again. */
  managerCleared: boolean;
  /**
   * Every address would be empty. An asset-config transaction without any address is a
   * destroy, so this is refused here (destroying has its own, explicit action).
   */
  allCleared: boolean;
}

export const checkConfigChange = (
  current: AssetRoles,
  next: AssetRoles,
  isValidAddress: (addr: string) => boolean,
): ConfigChangeCheck => {
  const invalid: AssetRole[] = [];
  const restored: AssetRole[] = [];
  const cleared: AssetRole[] = [];
  let changed = false;
  for (const role of ASSET_ROLES) {
    const before = current[role];
    const after = next[role].trim();
    if (after !== before) changed = true;
    if (after && !isValidAddress(after)) invalid.push(role);
    if (!before && after) restored.push(role);
    if (before && !after) cleared.push(role);
  }
  return {
    changed,
    invalid,
    restored,
    cleared,
    managerCleared: cleared.includes("manager"),
    allCleared: ASSET_ROLES.every((role) => !next[role].trim()),
  };
};

/** The change can be submitted (it may still need the user's confirmation of `cleared`). */
export const isConfigChangeAllowed = (check: ConfigChangeCheck): boolean =>
  check.changed &&
  !check.allCleared &&
  check.invalid.length === 0 &&
  check.restored.length === 0;

/** Why the asset cannot be destroyed. */
export type DestroyProblem = "creator_unknown" | "supply_outstanding";

/** An asset can only be destroyed when every unit is back in the creator's account. */
export const checkDestroy = ({
  total,
  creatorHolding,
}: {
  total: bigint;
  creatorHolding: AssetHolding | undefined;
}): DestroyProblem | undefined => {
  if (!creatorHolding) return "creator_unknown";
  if (!creatorHolding.optedIn || creatorHolding.amount !== total) {
    return "supply_outstanding";
  }
  return undefined;
};

export interface FreezeTxnParams {
  sender: string;
  assetId: bigint;
  target: string;
  frozen: boolean;
  suggestedParams: algosdk.SuggestedParams;
}

export const buildAssetFreezeTxn = ({
  sender,
  assetId,
  target,
  frozen,
  suggestedParams,
}: FreezeTxnParams): algosdk.Transaction =>
  algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
    sender,
    assetIndex: assetId,
    freezeTarget: target,
    frozen,
    suggestedParams,
  });

export interface ClawbackTxnParams {
  sender: string;
  assetId: bigint;
  /** The holder the units are taken from. */
  target: string;
  receiver: string;
  amount: bigint;
  suggestedParams: algosdk.SuggestedParams;
}

/** Asset transfer by the clawback address with AssetSender set - a revocation. */
export const buildAssetClawbackTxn = ({
  sender,
  assetId,
  target,
  receiver,
  amount,
  suggestedParams,
}: ClawbackTxnParams): algosdk.Transaction =>
  algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender,
    assetSender: target,
    receiver,
    assetIndex: assetId,
    amount,
    suggestedParams,
  });

export interface ConfigTxnParams {
  sender: string;
  assetId: bigint;
  roles: AssetRoles;
  suggestedParams: algosdk.SuggestedParams;
}

/**
 * Reconfiguration of the asset's addresses. Every address is always sent: an omitted one is
 * cleared by the protocol, so leaving one out would silently disable that role.
 */
export const buildAssetConfigTxn = ({
  sender,
  assetId,
  roles,
  suggestedParams,
}: ConfigTxnParams): algosdk.Transaction =>
  algosdk.makeAssetConfigTxnWithSuggestedParamsFromObject({
    sender,
    assetIndex: assetId,
    manager: roles.manager.trim() || undefined,
    reserve: roles.reserve.trim() || undefined,
    freeze: roles.freeze.trim() || undefined,
    clawback: roles.clawback.trim() || undefined,
    // Clearing a role is a deliberate, confirmed choice of the user on this page.
    strictEmptyAddressChecking: false,
    suggestedParams,
  });

export const buildAssetDestroyTxn = ({
  sender,
  assetId,
  suggestedParams,
}: {
  sender: string;
  assetId: bigint;
  suggestedParams: algosdk.SuggestedParams;
}): algosdk.Transaction =>
  algosdk.makeAssetDestroyTxnWithSuggestedParamsFromObject({
    sender,
    assetIndex: assetId,
    suggestedParams,
  });

/** Why the final check refused a transaction; the page maps it to a translated message. */
export type UnsafeTransactionCode =
  "sender" | "rekey" | "fee" | "type" | "details";

export class UnsafeTransactionError extends Error {
  constructor(public readonly code: UnsafeTransactionCode) {
    super(`Unsafe asset management transaction: ${code}`);
    this.name = "UnsafeTransactionError";
  }
}

const addr = (value: algosdk.Address | undefined): string =>
  value ? value.toString() : "";

/**
 * Last check before a management transaction is signed in place or handed to Sign-all: it is
 * one of the four asset-management types for the expected asset, signed by the expected role
 * address, does not rekey the sender or close anything out and its fee is not abnormal.
 * Throws with the reason.
 */
export const assertAssetManagementTxnSafe = (
  txn: algosdk.Transaction,
  expected: {
    sender: string;
    assetId: bigint;
    action: AssetAction;
    /** Freeze: the holder and the state the user chose. */
    freeze?: { target: string; frozen: boolean };
    /** Clawback: the holder, the receiver and the amount the user chose. */
    clawback?: { target: string; receiver: string; amount: bigint };
    /** Modify: the addresses the user chose. */
    roles?: AssetRoles;
    /** The network the transaction has to belong to (from the checked suggested params). */
    genesis?: { hash: Uint8Array; id: string };
  },
): void => {
  // A management transaction is a single transaction: no group, no lease.
  if (txn.group?.length || txn.lease?.length) {
    throw new UnsafeTransactionError("details");
  }
  if (
    expected.genesis &&
    (txn.genesisID !== expected.genesis.id ||
      !txn.genesisHash ||
      Buffer.compare(txn.genesisHash, expected.genesis.hash) !== 0)
  ) {
    throw new UnsafeTransactionError("details");
  }
  if (txn.sender.toString() !== expected.sender) {
    throw new UnsafeTransactionError("sender");
  }
  if (txn.rekeyTo) {
    throw new UnsafeTransactionError("rekey");
  }
  if (txn.fee > MAX_AUTO_FEE_MICROALGOS) {
    throw new UnsafeTransactionError("fee");
  }
  switch (expected.action) {
    case "freeze":
      if (
        txn.type !== algosdk.TransactionType.afrz ||
        txn.assetFreeze?.assetIndex !== expected.assetId
      ) {
        throw new UnsafeTransactionError("type");
      }
      if (
        expected.freeze &&
        (txn.assetFreeze.freezeAccount.toString() !== expected.freeze.target ||
          txn.assetFreeze.frozen !== expected.freeze.frozen)
      ) {
        throw new UnsafeTransactionError("details");
      }
      return;
    case "clawback":
      if (
        txn.type !== algosdk.TransactionType.axfer ||
        txn.assetTransfer?.assetIndex !== expected.assetId ||
        !txn.assetTransfer.assetSender ||
        txn.assetTransfer.closeRemainderTo
      ) {
        throw new UnsafeTransactionError("type");
      }
      if (
        expected.clawback &&
        (txn.assetTransfer.assetSender.toString() !==
          expected.clawback.target ||
          txn.assetTransfer.receiver.toString() !==
            expected.clawback.receiver ||
          txn.assetTransfer.amount !== expected.clawback.amount)
      ) {
        throw new UnsafeTransactionError("details");
      }
      return;
    case "modify":
    case "destroy": {
      const config = txn.assetConfig;
      if (
        txn.type !== algosdk.TransactionType.acfg ||
        config?.assetIndex !== expected.assetId
      ) {
        throw new UnsafeTransactionError("type");
      }
      const isDestroy =
        !addr(config.manager) &&
        !addr(config.reserve) &&
        !addr(config.freeze) &&
        !addr(config.clawback);
      if ((expected.action === "destroy") !== isDestroy) {
        throw new UnsafeTransactionError("type");
      }
      if (expected.roles) {
        const actual = configTxnRoles(txn);
        if (
          ASSET_ROLES.some((role) => actual[role] !== expected.roles![role])
        ) {
          throw new UnsafeTransactionError("details");
        }
      }
      return;
    }
  }
};

/** Roles in an asset-config transaction, as strings ("" = cleared). */
export const configTxnRoles = (txn: algosdk.Transaction): AssetRoles => ({
  manager: addr(txn.assetConfig?.manager),
  reserve: addr(txn.assetConfig?.reserve),
  freeze: addr(txn.assetConfig?.freeze),
  clawback: addr(txn.assetConfig?.clawback),
});
