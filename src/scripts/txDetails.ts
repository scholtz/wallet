/**
 * Pure descriptions of the transaction kinds whose effects are not visible in a plain
 * sender/receiver/amount row: asset configuration, asset freeze and key registration
 * (AW-2026-081), plus the `lease` field (AW-2026-082). Structural types only, so this module has
 * no runtime import and runs in the Node unit tests.
 */

// Structural stand-ins for algosdk's `Address` and `Transaction` (only what is read here).
interface AddressLike {
  toString(): string;
}

export interface DetailTxnLike {
  type?: string;
  lease?: Uint8Array;
  assetConfig?: {
    assetIndex: bigint | number;
    total: bigint | number;
    decimals: number;
    defaultFrozen: boolean;
    manager?: AddressLike;
    reserve?: AddressLike;
    freeze?: AddressLike;
    clawback?: AddressLike;
    unitName?: string;
    assetName?: string;
    assetURL?: string;
    assetMetadataHash?: Uint8Array;
  };
  assetFreeze?: {
    assetIndex: bigint | number;
    freezeAccount: AddressLike;
    frozen: boolean;
  };
  keyreg?: {
    voteKey?: Uint8Array;
    selectionKey?: Uint8Array;
    stateProofKey?: Uint8Array;
    voteFirst?: bigint | number;
    voteLast?: bigint | number;
    voteKeyDilution?: bigint | number;
    nonParticipation: boolean;
  };
}

export type AssetConfigKind = "create" | "reconfigure" | "destroy";

export interface AssetConfigDetails {
  kind: AssetConfigKind;
  assetIndex: string;
  /** Control addresses after the transaction; `undefined` means the role is removed for good. */
  manager?: string;
  reserve?: string;
  freeze?: string;
  clawback?: string;
  /** Only meaningful when creating an asset. */
  total: string;
  decimals: number;
  defaultFrozen: boolean;
  unitName: string;
  assetName: string;
  assetURL: string;
}

const isZero = (value: bigint | number | undefined): boolean =>
  value === undefined || BigInt(value) === 0n;

const addr = (value?: AddressLike): string | undefined => value?.toString();

/** Describes an asset configuration transaction; undefined for other transaction types. */
export function describeAssetConfig(txn: DetailTxnLike): AssetConfigDetails | undefined {
  if (txn.type !== "acfg" || !txn.assetConfig) return undefined;
  const cfg = txn.assetConfig;
  const manager = addr(cfg.manager);
  const reserve = addr(cfg.reserve);
  const freeze = addr(cfg.freeze);
  const clawback = addr(cfg.clawback);
  const creating = isZero(cfg.assetIndex);
  // On chain, configuring an existing asset with every parameter empty destroys it.
  const emptyParams =
    !manager &&
    !reserve &&
    !freeze &&
    !clawback &&
    isZero(cfg.total) &&
    cfg.decimals === 0 &&
    !cfg.defaultFrozen &&
    !cfg.unitName &&
    !cfg.assetName &&
    !cfg.assetURL &&
    !(cfg.assetMetadataHash && cfg.assetMetadataHash.some((b) => b !== 0));
  const kind: AssetConfigKind = creating ? "create" : emptyParams ? "destroy" : "reconfigure";
  return {
    kind,
    assetIndex: BigInt(cfg.assetIndex).toString(),
    manager,
    reserve,
    freeze,
    clawback,
    total: BigInt(cfg.total).toString(),
    decimals: cfg.decimals,
    defaultFrozen: cfg.defaultFrozen,
    unitName: cfg.unitName ?? "",
    assetName: cfg.assetName ?? "",
    assetURL: cfg.assetURL ?? "",
  };
}

export interface AssetFreezeDetails {
  assetIndex: string;
  account: string;
  frozen: boolean;
}

/** Describes an asset freeze transaction; undefined for other transaction types. */
export function describeAssetFreeze(txn: DetailTxnLike): AssetFreezeDetails | undefined {
  if (txn.type !== "afrz" || !txn.assetFreeze) return undefined;
  return {
    assetIndex: BigInt(txn.assetFreeze.assetIndex).toString(),
    account: txn.assetFreeze.freezeAccount.toString(),
    frozen: txn.assetFreeze.frozen,
  };
}

export type KeyRegKind = "online" | "offline" | "nonparticipation";

export interface KeyRegDetails {
  kind: KeyRegKind;
  voteFirst?: string;
  voteLast?: string;
}

/**
 * Describes a key registration transaction; undefined for other types. `nonparticipation` is
 * irreversible on chain, so it wins over every other flag.
 */
export function describeKeyReg(txn: DetailTxnLike): KeyRegDetails | undefined {
  if (txn.type !== "keyreg" || !txn.keyreg) return undefined;
  const reg = txn.keyreg;
  if (reg.nonParticipation) return { kind: "nonparticipation" };
  const hasKeys = !!reg.voteKey?.length || !!reg.selectionKey?.length;
  if (!hasKeys) return { kind: "offline" };
  return {
    kind: "online",
    voteFirst: reg.voteFirst === undefined ? undefined : BigInt(reg.voteFirst).toString(),
    voteLast: reg.voteLast === undefined ? undefined : BigInt(reg.voteLast).toString(),
  };
}

/** The lease as hex when it is set (an all-zero lease means none), else undefined. */
export function describeLease(txn: DetailTxnLike): string | undefined {
  const lease = txn.lease;
  if (!lease || lease.length === 0 || lease.every((b) => b === 0)) return undefined;
  return Array.from(lease, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface SpecialTxSummary {
  /** Locale key under `connect.` */
  key: string;
  params: Record<string, string>;
  /** Irreversible or authority-changing: shown as an error, not a warning. */
  danger: boolean;
}

/** One-line summary of an `acfg`, `afrz` or `keyreg` transaction (undefined for other types). */
export function summarizeSpecialTransaction(txn: DetailTxnLike): SpecialTxSummary | undefined {
  const cfg = describeAssetConfig(txn);
  if (cfg) {
    return {
      key: `tx_acfg_${cfg.kind}`,
      params: { asset: cfg.assetIndex },
      danger: cfg.kind !== "create",
    };
  }
  const freeze = describeAssetFreeze(txn);
  if (freeze) {
    return {
      key: freeze.frozen ? "tx_afrz_freeze" : "tx_afrz_unfreeze",
      params: { asset: freeze.assetIndex, account: freeze.account },
      danger: freeze.frozen,
    };
  }
  const reg = describeKeyReg(txn);
  if (reg) {
    return {
      key: `tx_keyreg_${reg.kind}`,
      params: {},
      danger: reg.kind !== "offline",
    };
  }
  return undefined;
}
