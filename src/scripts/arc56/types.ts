// Minimal TypeScript shape of the ARC-56 ("Extended App Description") JSON
// schema (https://arc.algorand.foundation/ARCs/arc-0056) — only the fields
// this wallet actually reads to explain an app call to a user. The registry
// serves full specs (structs, state, sourceInfo, etc.) but we intentionally
// don't model fields we never use.

export interface Arc56StructField {
  name: string;
  // A struct field's type is either a plain/tuple ABI type string, the name
  // of another named struct (looked up in Arc56Contract.structs), or an
  // inline anonymous struct definition.
  type: string | Arc56StructField[];
}

export type Arc56Structs = Record<string, Arc56StructField[]>;

export interface Arc56MethodArg {
  type: string;
  struct?: string;
  name?: string;
  desc?: string;
}

export interface Arc56MethodReturn {
  type: string;
  struct?: string;
  desc?: string;
}

export interface Arc56Method {
  name: string;
  desc?: string;
  args: Arc56MethodArg[];
  returns: Arc56MethodReturn;
  readonly?: boolean;
}

// A single global/local/box storage slot's on-chain key plus its ABI (or
// AVM pseudo-, see decodeArc56StateValue) type - keyed by the human-readable
// variable name in Arc56State.keys.
export interface Arc56StorageKey {
  desc?: string;
  // base64-encoded on-chain key.
  key: string;
  keyType: string;
  valueType: string;
}

export interface Arc56StateKeys {
  global?: Record<string, Arc56StorageKey>;
  local?: Record<string, Arc56StorageKey>;
  box?: Record<string, Arc56StorageKey>;
}

export interface Arc56State {
  keys?: Arc56StateKeys;
}

export interface Arc56Contract {
  arcs?: number[];
  name: string;
  desc?: string;
  structs?: Arc56Structs;
  methods: Arc56Method[];
  networks?: Record<string, { appID: number }>;
  byteCode?: { approval?: string; clear?: string };
  state?: Arc56State;
}

// abi-signatures/<selector>.json — the ecosystem-wide index of every known
// app exposing a method with this selector, keyed by approval-program hash.
export interface Arc56AbiSignatureEntry {
  abi: string;
  apps: string[];
}

export type Arc56ProgramKind = "approval" | "clear";

export type Arc56OwnerRiskLevel = "low" | "medium" | "high" | "very_high" | "banned";

// approval-programs|clear-programs/<hash>.owners.json — every distinct GitHub
// owner/repo whose indexed ARC-56 spec compiles to this program hash. A
// union across every indexed spec sharing the hash (unlike the single
// winning .arc56.json copy), so more than one entry can legitimately appear
// for a shared library, a fork, or a vendored copy.
// The reputation fields come from the registry's automated owner scoring
// (docs/reputation-scoring.md in scholtz/ARC56Registry) and are optional so
// older registry mirrors that predate it still parse - such an owner is
// treated as "unrated", never as trusted.
export interface Arc56Owner {
  owner: string;
  repo: string;
  url: string;
  reputationScore?: number;
  riskLevel?: Arc56OwnerRiskLevel;
  banned?: boolean;
}

export interface Arc56OwnersEntry {
  owners: Arc56Owner[];
}
