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

export interface Arc56Contract {
  arcs?: number[];
  name: string;
  desc?: string;
  structs?: Arc56Structs;
  methods: Arc56Method[];
  networks?: Record<string, { appID: number }>;
  byteCode?: { approval?: string; clear?: string };
}

// abi-signatures/<selector>.json — the ecosystem-wide index of every known
// app exposing a method with this selector, keyed by approval-program hash.
export interface Arc56AbiSignatureEntry {
  abi: string;
  apps: string[];
}

export type Arc56ProgramKind = "approval" | "clear";
