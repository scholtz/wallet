// scripts/arc56/state.ts - Resolves ARC-56 `state.keys` metadata (human
// names + ABI/AVM types) for global/local application state, so a raw
// base64 state-delta key/value from an algod simulate response can be shown
// as e.g. "totalSupply: 1000000" instead of an opaque base64/hex blob - and,
// critically, decoded using the *declared* type rather than guessed, since a
// generic byte-shape guess (e.g. "32 bytes looks like an address") silently
// misrepresents values like a uint256 that also happen to be 32 bytes long.
import algosdk from "algosdk";
import { Buffer } from "buffer";
import type { Arc56Contract, Arc56Structs, Arc56StructField } from "./types";

export interface ResolvedArc56StateKey {
  name: string;
  desc?: string;
  keyType: string;
  valueType: string;
}

const findStateKey = (
  keys: Record<string, { desc?: string; key: string; keyType: string; valueType: string }> | undefined,
  keyBase64: string,
): ResolvedArc56StateKey | undefined => {
  if (!keys) return undefined;
  for (const [name, info] of Object.entries(keys)) {
    if (info.key === keyBase64) {
      return { name, desc: info.desc, keyType: info.keyType, valueType: info.valueType };
    }
  }
  return undefined;
};

export const resolveStateKeyInfo = (
  contract: Arc56Contract | undefined,
  scope: "global" | "local",
  keyBase64: string,
): ResolvedArc56StateKey | undefined => {
  const keys =
    scope === "global" ? contract?.state?.keys?.global : contract?.state?.keys?.local;
  return findStateKey(keys, keyBase64);
};

// State key/value types name a struct directly (unlike ABI method args,
// which pair an encoded tuple `type` with a separate `struct` name) - so a
// struct-typed state value has to be resolved to its underlying ABI tuple
// type string before algosdk.ABIType can decode it.
const structFieldsToAbiTypeString = (
  fields: Arc56StructField[],
  structs: Arc56Structs,
): string =>
  `(${fields
    .map((field) =>
      Array.isArray(field.type)
        ? structFieldsToAbiTypeString(field.type, structs)
        : resolveAbiTypeString(field.type, structs),
    )
    .join(",")})`;

const resolveAbiTypeString = (type: string, structs: Arc56Structs): string => {
  const arrayMatch = type.match(/^(.*)(\[\d*\])$/);
  const base = arrayMatch ? arrayMatch[1] : type;
  const suffix = arrayMatch ? arrayMatch[2] : "";
  if (structs[base]) {
    return `${structFieldsToAbiTypeString(structs[base], structs)}${suffix}`;
  }
  return type;
};

const stringifyAbiValue = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return `0x${Buffer.from(value).toString("hex")}`;
  if (Array.isArray(value)) return `[${value.map(stringifyAbiValue).join(", ")}]`;
  return String(value);
};

export interface DecodedArc56StateValue {
  display: string;
}

// `valueType` may be a real ABI type (incl. a struct name), or one of the
// three ARC-56 AVM pseudo-types used for raw (non-ABI-encoded) TEAL storage:
// AVMString (raw utf-8 bytes), AVMUint64 (raw big-endian uint64), AVMBytes
// (opaque raw bytes).
export const decodeArc56StateValue = (
  valueType: string,
  bytes: Uint8Array,
  structs: Arc56Structs,
): DecodedArc56StateValue | undefined => {
  try {
    if (valueType === "AVMString") {
      return { display: Buffer.from(bytes).toString("utf-8") };
    }
    if (valueType === "AVMUint64") {
      return { display: algosdk.decodeUint64(bytes, "bigint").toString() };
    }
    if (valueType === "AVMBytes") {
      return { display: `0x${Buffer.from(bytes).toString("hex")}` };
    }
    const abiTypeStr = resolveAbiTypeString(valueType, structs);
    const decoded = algosdk.ABIType.from(abiTypeStr).decode(bytes);
    return { display: stringifyAbiValue(decoded) };
  } catch {
    return undefined;
  }
};
