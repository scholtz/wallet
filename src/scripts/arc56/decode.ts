// Resolves an ARC-4 application-call transaction against the ARC-56 registry
// and decodes its arguments into typed, human-readable values.
//
// Trust model (this is the whole point of this module — see CLAUDE.md's
// notes on the audit history of this wallet's transaction-review UI):
//   "verified"             - this app's *actual compiled approval program*
//                             hashes to a spec in the registry, and that
//                             spec defines the exact method being called.
//                             Argument names/descriptions below come
//                             straight from that verified spec.
//   "verified-other-method" - this app's program hash IS a known, registered
//                             contract, but the method selector being
//                             invoked is NOT one of that contract's
//                             documented methods. This is more suspicious
//                             than "unknown", not less: it means either the
//                             registry's copy of the spec is stale, or the
//                             app exposes an undocumented method.
//   "selector-only"        - the program hash isn't registered at all, but
//                             the 4-byte method selector matches a method
//                             signature used by other, unrelated apps in the
//                             registry. Argument *types* decoded this way are
//                             cryptographically reliable (the selector is a
//                             hash of the signature, which includes the
//                             types), but argument *names/descriptions* are
//                             only ever shown as unverified suggestions from
//                             a specific candidate contract the caller picks.
//   "unknown"               - nothing in the registry matches this call.
//   "not-abi"               - the call doesn't even look like an ARC-4
//                             method call (no args, or first arg isn't a
//                             4-byte selector).
import algosdk from "algosdk";
import {
  fetchAbiSignatureEntry,
  fetchArc56SpecByProgramHash,
  fetchArc56OwnersByProgramHash,
  sha256Hex,
  bytesToSelectorHex,
} from "./registry";
import type {
  Arc56Contract,
  Arc56Method,
  Arc56MethodArg,
  Arc56Owner,
  Arc56StructField,
  Arc56Structs,
} from "./types";

const REFERENCE_TYPES = new Set(["account", "asset", "application"]);
const TRANSACTION_TYPES = new Set([
  "txn",
  "pay",
  "keyreg",
  "acfg",
  "axfer",
  "afrz",
  "appl",
]);

// The maximum number of app args ARC-4 uses to carry non-transaction method
// args 1:1 before packing the remainder into a single trailing tuple — see
// ARC-4's "Reference Types"/argument-encoding rules.
const MAX_DIRECT_APP_ARGS = 14;

export interface AppCallGroupTxnRef {
  index: number;
  type: string;
}

export interface AppCallInfo {
  appIndex: bigint;
  // The app's compiled approval program bytes, fetched by the caller via
  // algod (`/v2/applications/{id}`) — this module never talks to algod
  // itself, only to the ARC-56 registry.
  approvalProgram?: Uint8Array;
  // Raw application-call args, including the method selector at index 0.
  appArgs: Uint8Array[];
  accounts: string[];
  foreignAssets: bigint[];
  foreignApps: bigint[];
  senderAddress: string;
  // Every transaction preceding this app call within its atomic group, in
  // ascending (chronological) order — used only to cross-check `txn`-kind
  // args (see the "Transaction Types" note in decodeRawArgs), never
  // required for decoding value/reference args.
  precedingGroupTxns?: AppCallGroupTxnRef[];
}

export const encodeAddressSafe = (
  addr: algosdk.Address | { publicKey?: Uint8Array } | undefined,
): string => {
  try {
    if (!addr) return "";
    if (addr instanceof algosdk.Address) return addr.toString();
    if (addr.publicKey) return algosdk.encodeAddress(addr.publicKey);
    return "";
  } catch {
    return "";
  }
};

// algosdk's txID() msgpack-encodes the transaction against its schema and
// can throw for a transaction missing a required field - callers use this
// to build a Vue watch-source key (e.g. Arc56CallDetails.vue,
// Arc56RequestSummary.vue), where an uncaught throw inside the getter would
// be silently swallowed by Vue with the watcher simply never firing again,
// not a visible error.
export const safeTxId = (txn: algosdk.Transaction | undefined): string => {
  try {
    return txn?.txID?.() ?? "";
  } catch {
    return "";
  }
};

// Builds the AppCallInfo decodeArc56AppCall needs directly from an
// application-call transaction plus its group context — shared by every UI
// consumer that needs to run this decode (a single call's own detail view,
// or a summary aggregating every app call in a request) so the
// address-encoding and preceding-group-txn slicing logic isn't duplicated
// per caller. Returns undefined if `txn` isn't actually an application call.
export const buildAppCallInfo = (
  txn: algosdk.Transaction,
  appIndex: bigint,
  currentIndex: number,
  approvalProgram: Uint8Array | undefined,
  groupTransactions: AppCallGroupTxnRef[] = [],
): AppCallInfo | undefined => {
  const call = txn.applicationCall;
  if (!call) return undefined;
  return {
    appIndex,
    approvalProgram,
    appArgs: [...(call.appArgs ?? [])],
    accounts: (call.accounts ?? []).map((a) => encodeAddressSafe(a)),
    foreignAssets: (call.foreignAssets ?? []).map((a) => BigInt(a)),
    foreignApps: (call.foreignApps ?? []).map((a) => BigInt(a)),
    senderAddress: encodeAddressSafe(txn.sender),
    precedingGroupTxns: groupTransactions
      .filter((g) => g.index < currentIndex)
      .sort((a, b) => a.index - b.index)
      .map((g) => ({ index: g.index, type: g.type })),
  };
};

export type Arc56TrustLevel =
  | "verified"
  | "verified-other-method"
  | "selector-only"
  | "unknown"
  | "not-abi";

// Shared trust->severity/copy mapping, used by both Arc56CallDetails.vue (a
// single decoded call's own detail view) and Arc56RequestSummary.vue (an
// aggregate view over every app call in a request) - kept here rather than
// duplicated per component so a future Arc56TrustLevel value can't update
// one view's severity/copy while silently leaving the other on its old
// (now-incomplete) switch statement.
export type Arc56TrustSeverity = "success" | "error" | "warn" | "secondary";

interface Arc56TrustPresentation {
  severity: Arc56TrustSeverity;
  titleKey: string;
  descKey: string;
}

// A Record keyed by every Arc56TrustLevel, not a switch with a `default`
// fallback - adding a new trust level without an entry here is a compile
// error, not a silently-incomplete case in three independently-editable
// switch statements.
const TRUST_PRESENTATION: Record<Arc56TrustLevel, Arc56TrustPresentation> = {
  verified: {
    severity: "success",
    titleKey: "arc56.trust_verified",
    descKey: "arc56.trust_verified_desc",
  },
  "verified-other-method": {
    severity: "error",
    titleKey: "arc56.trust_verified_other_method",
    descKey: "arc56.trust_verified_other_method_desc",
  },
  "selector-only": {
    severity: "warn",
    titleKey: "arc56.trust_selector_only",
    descKey: "arc56.trust_selector_only_desc",
  },
  unknown: {
    severity: "warn",
    titleKey: "arc56.trust_unknown",
    descKey: "arc56.trust_unknown_desc",
  },
  "not-abi": {
    severity: "secondary",
    titleKey: "arc56.trust_not_abi",
    descKey: "arc56.trust_not_abi_desc",
  },
};

// `trust` is undefined before a decode has resolved (or if decoding is
// somehow skipped) - presented the same as "not-abi" (a neutral, no-signal
// state), same as the switch-based version's `default` case did.
const arc56TrustPresentation = (
  trust: Arc56TrustLevel | undefined,
): Arc56TrustPresentation => TRUST_PRESENTATION[trust ?? "not-abi"];

// arc56TrustSeverity()'s value is for PrimeVue <Message>, whose severity
// enum includes "error" but not "danger". <Badge>'s enum is the reverse -
// "danger" but no "error" - an actual inconsistency between the two
// components, not a typo, so a value valid for one silently fails to match
// any styled variant on the other. Use this converter when handing a
// trust severity to a <Badge> (e.g. the per-app summary table) instead of
// binding arc56TrustSeverity()'s result directly.
export type Arc56BadgeSeverity = "secondary" | "success" | "warn" | "danger";

export const arc56TrustBadgeSeverity = (
  trust: Arc56TrustLevel | undefined,
): Arc56BadgeSeverity => {
  const severity = arc56TrustPresentation(trust).severity;
  return severity === "error" ? "danger" : severity;
};

export const arc56TrustSeverity = (trust: Arc56TrustLevel | undefined): Arc56TrustSeverity =>
  arc56TrustPresentation(trust).severity;

export const arc56TrustTitleKey = (trust: Arc56TrustLevel | undefined): string =>
  arc56TrustPresentation(trust).titleKey;

export const arc56TrustDescKey = (trust: Arc56TrustLevel | undefined): string =>
  arc56TrustPresentation(trust).descKey;

export type DecodedArgKind =
  | "value"
  | "account"
  | "asset"
  | "application"
  | "transaction";

// A decoded ABI value. Extends algosdk's own `ABIValue` union (boolean |
// number | bigint | string | Uint8Array | ABIValue[] | Address) with a
// plain-object shape, because `applyStructNaming`/`namedFromFields` below
// rename a struct-typed tuple's positional array entries into a
// field-name-keyed object for display — a transformation algosdk itself
// never performs, so its own type doesn't cover the result.
export type DecodedAbiValue =
  | algosdk.ABIValue
  | DecodedAbiValue[]
  | { [fieldName: string]: DecodedAbiValue };

export interface DecodedArc56Arg {
  argIndex: number;
  type: string;
  name?: string;
  desc?: string;
  kind: DecodedArgKind;
  value?: DecodedAbiValue;
  address?: string;
  assetId?: bigint;
  applicationId?: bigint;
  referenceIndex?: number;
  requiredTxnType?: string;
  matchedGroupTxn?: AppCallGroupTxnRef;
  error?: string;
}

export interface Arc56CandidateMatch {
  approvalHash: string;
  contract: Arc56Contract;
  method: Arc56Method;
}

export interface DecodedArc56Call {
  trust: Arc56TrustLevel;
  selectorHex?: string;
  approvalHash?: string;
  contract?: Arc56Contract;
  method?: Arc56Method;
  methodSignature?: string;
  args: DecodedArc56Arg[];
  candidates?: Arc56CandidateMatch[];
}

const buildAbiMethod = (method: Arc56Method): algosdk.ABIMethod | undefined => {
  try {
    return new algosdk.ABIMethod({
      name: method.name,
      desc: method.desc,
      args: method.args.map((a) => ({
        type: a.type,
        name: a.name,
        desc: a.desc,
      })),
      returns: { type: method.returns.type, desc: method.returns.desc },
    });
  } catch {
    return undefined;
  }
};

const findMethodBySelector = (
  methods: Arc56Method[],
  selectorHex: string,
): Arc56Method | undefined =>
  methods.find((m) => {
    const abiMethod = buildAbiMethod(m);
    if (!abiMethod) return false;
    return bytesToSelectorHex(abiMethod.getSelector()) === selectorHex;
  });

const namedFromFields = (
  tupleValues: DecodedAbiValue[],
  fields: Arc56StructField[],
  structs: Arc56Structs,
): { [fieldName: string]: DecodedAbiValue } => {
  const out: { [fieldName: string]: DecodedAbiValue } = {};
  fields.forEach((field, i) => {
    const v = tupleValues?.[i];
    if (Array.isArray(field.type)) {
      out[field.name] = Array.isArray(v)
        ? namedFromFields(v, field.type, structs)
        : v;
    } else if (typeof field.type === "string" && structs[field.type]) {
      out[field.name] = Array.isArray(v)
        ? namedFromFields(v, structs[field.type], structs)
        : v;
    } else {
      out[field.name] = v;
    }
  });
  return out;
};

export const applyStructNaming = (
  value: DecodedAbiValue | undefined,
  typeStr: string,
  structName: string | undefined,
  structs: Arc56Structs,
): DecodedAbiValue | undefined => {
  if (!structName || !structs[structName]) return value;
  const fields = structs[structName];
  const isArrayType = /\[\d*\]$/.test(typeStr);
  if (isArrayType && Array.isArray(value)) {
    return value.map((v) =>
      Array.isArray(v) ? namedFromFields(v, fields, structs) : v,
    );
  }
  if (Array.isArray(value)) {
    return namedFromFields(value, fields, structs);
  }
  return value;
};

interface RawArgSpec {
  type: string;
}

const decodeRawArgs = (
  argSpecs: RawArgSpec[],
  info: AppCallInfo,
): DecodedArc56Arg[] => {
  const appArgs = info.appArgs;
  const nonTxnIndices: number[] = [];
  argSpecs.forEach((spec, i) => {
    if (!TRANSACTION_TYPES.has(spec.type)) nonTxnIndices.push(i);
  });

  let packedValues: DecodedAbiValue[] | undefined;
  let packedError: string | undefined;
  if (nonTxnIndices.length > MAX_DIRECT_APP_ARGS + 1) {
    const tailArgIndices = nonTxnIndices.slice(MAX_DIRECT_APP_ARGS);
    const tailTypeStr = `(${tailArgIndices
      .map((i) =>
        REFERENCE_TYPES.has(argSpecs[i].type) ? "uint8" : argSpecs[i].type,
      )
      .join(",")})`;
    try {
      const raw = appArgs[MAX_DIRECT_APP_ARGS + 1];
      if (!raw) throw new Error("missing packed tail argument");
      // tailTypeStr is always a tuple type `(...)`, so ABIType.decode's
      // actual result is an array, even though its declared return type is
      // the broader ABIValue (algosdk types decode() by the base class, not
      // per-instance shape — see ABITupleType.decode in
      // node_modules/algosdk/dist/types/abi/abi_type.d.ts).
      packedValues = algosdk.ABIType.from(tailTypeStr).decode(raw) as algosdk.ABIValue[];
    } catch (err) {
      packedError = err instanceof Error ? err.message : String(err);
    }
  }

  // The caller passes every transaction preceding this app call in the same
  // group (ascending order); only the *last* N of them (N = how many
  // transaction-typed args this method declares) are the ones ARC-4 actually
  // binds to those args — see ARC-4's "Transaction Types" encoding rule.
  const requiredTxnCount = argSpecs.filter((s) => TRANSACTION_TYPES.has(s.type)).length;
  const relevantPrecedingTxns = info.precedingGroupTxns?.slice(-requiredTxnCount);

  const results: DecodedArc56Arg[] = [];
  let txnRank = 0;
  let nonTxnRank = 0;

  argSpecs.forEach((spec, argIndex) => {
    if (TRANSACTION_TYPES.has(spec.type)) {
      const matched = relevantPrecedingTxns?.[txnRank];
      results.push({
        argIndex,
        type: spec.type,
        kind: "transaction",
        requiredTxnType: spec.type,
        matchedGroupTxn: matched,
        error:
          matched && spec.type !== "txn" && matched.type !== spec.type
            ? `Expected a "${spec.type}" transaction but the referenced group transaction is "${matched.type}"`
            : undefined,
      });
      txnRank += 1;
      return;
    }

    const rank = nonTxnRank;
    nonTxnRank += 1;

    const isPacked = rank >= MAX_DIRECT_APP_ARGS && nonTxnIndices.length > MAX_DIRECT_APP_ARGS + 1;
    const raw = isPacked ? undefined : appArgs[rank + 1];

    let rawValue: DecodedAbiValue | undefined;
    let error: string | undefined;
    if (isPacked) {
      if (packedError) {
        error = packedError;
      } else {
        rawValue = packedValues?.[rank - MAX_DIRECT_APP_ARGS];
      }
    } else if (raw !== undefined) {
      try {
        rawValue = REFERENCE_TYPES.has(spec.type)
          ? algosdk.ABIType.from("uint8").decode(raw)
          : algosdk.ABIType.from(spec.type).decode(raw);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
    } else {
      error = "Missing application argument";
    }

    if (REFERENCE_TYPES.has(spec.type) && !error) {
      const referenceIndex = Number(rawValue as bigint);
      if (spec.type === "account") {
        const address =
          referenceIndex === 0
            ? info.senderAddress
            : info.accounts[referenceIndex - 1];
        results.push({
          argIndex,
          type: spec.type,
          kind: "account",
          referenceIndex,
          address,
          error: address ? undefined : "Account index out of range",
        });
      } else if (spec.type === "asset") {
        const assetId = info.foreignAssets[referenceIndex];
        results.push({
          argIndex,
          type: spec.type,
          kind: "asset",
          referenceIndex,
          assetId,
          error: assetId === undefined ? "Asset index out of range" : undefined,
        });
      } else {
        const applicationId =
          referenceIndex === 0
            ? info.appIndex
            : info.foreignApps[referenceIndex - 1];
        results.push({
          argIndex,
          type: spec.type,
          kind: "application",
          referenceIndex,
          applicationId,
          error:
            applicationId === undefined
              ? "Application index out of range"
              : undefined,
        });
      }
      return;
    }

    results.push({ argIndex, type: spec.type, kind: "value", value: rawValue, error });
  });

  return results;
};

const enrichWithMethod = (
  args: DecodedArc56Arg[],
  methodArgs: Arc56MethodArg[],
  structs: Arc56Structs,
): DecodedArc56Arg[] =>
  args.map((arg) => {
    const src = methodArgs[arg.argIndex];
    if (!src) return arg;
    return {
      ...arg,
      name: src.name,
      desc: src.desc,
      value:
        arg.kind === "value"
          ? applyStructNaming(arg.value, src.type, src.struct, structs)
          : arg.value,
    };
  });

const resolveCandidates = async (
  approvalHashes: string[],
  selectorHex: string,
  excludeHash: string | undefined,
  limit = 8,
): Promise<Arc56CandidateMatch[]> => {
  const hashes = approvalHashes
    .filter((h) => h !== excludeHash)
    .slice(0, limit);
  const results = await Promise.all(
    hashes.map(async (hash): Promise<Arc56CandidateMatch | undefined> => {
      const contract = await fetchArc56SpecByProgramHash(hash, "approval");
      if (!contract) return undefined;
      const method = findMethodBySelector(contract.methods, selectorHex);
      if (!method) return undefined;
      return { approvalHash: hash, contract, method };
    }),
  );
  return results.filter((r): r is Arc56CandidateMatch => Boolean(r));
};

export const decodeArc56AppCall = async (
  info: AppCallInfo,
): Promise<DecodedArc56Call> => {
  const appArgs = info.appArgs ?? [];
  const selectorBytes = appArgs[0];
  if (!selectorBytes || selectorBytes.length !== 4) {
    return { trust: "not-abi", args: [] };
  }
  const selectorHex = bytesToSelectorHex(selectorBytes);

  let approvalHash: string | undefined;
  let primaryContract: Arc56Contract | null = null;
  if (info.approvalProgram && info.approvalProgram.length > 0) {
    approvalHash = await sha256Hex(info.approvalProgram);
    primaryContract = await fetchArc56SpecByProgramHash(approvalHash, "approval");
  }

  const matchedMethod = primaryContract
    ? findMethodBySelector(primaryContract.methods, selectorHex)
    : undefined;

  if (primaryContract && matchedMethod) {
    const raw = decodeRawArgs(matchedMethod.args, info);
    const args = enrichWithMethod(raw, matchedMethod.args, primaryContract.structs ?? {});
    const abiMethod = buildAbiMethod(matchedMethod);
    return {
      trust: "verified",
      selectorHex,
      approvalHash,
      contract: primaryContract,
      method: matchedMethod,
      methodSignature: abiMethod?.getSignature(),
      args,
    };
  }

  // No verified method found for this exact program — fall back to the
  // ecosystem-wide ABI-selector index to explain the call as best we can,
  // while making very clear that none of this is verified against the
  // actual bytecode being called.
  const abiEntry = await fetchAbiSignatureEntry(selectorHex);
  if (!abiEntry) {
    return {
      trust: primaryContract ? "verified-other-method" : "unknown",
      selectorHex,
      approvalHash,
      contract: primaryContract ?? undefined,
      args: [],
    };
  }

  let abiMethodShape: algosdk.ABIMethod;
  try {
    abiMethodShape = algosdk.ABIMethod.fromSignature(abiEntry.abi);
  } catch {
    return {
      trust: primaryContract ? "verified-other-method" : "unknown",
      selectorHex,
      approvalHash,
      contract: primaryContract ?? undefined,
      args: [],
    };
  }

  const argSpecs: RawArgSpec[] = abiMethodShape.args.map((a) => ({
    type: typeof a.type === "string" ? a.type : a.type.toString(),
  }));
  const args = decodeRawArgs(argSpecs, info);
  const candidates = await resolveCandidates(abiEntry.apps, selectorHex, approvalHash);

  return {
    trust: primaryContract ? "verified-other-method" : "selector-only",
    selectorHex,
    approvalHash,
    contract: primaryContract ?? undefined,
    methodSignature: abiEntry.abi,
    args,
    candidates,
  };
};

export interface DecodedAppCallWithOwners {
  decoded: DecodedArc56Call;
  // null = not looked up (no approvalHash to look up); [] = looked up, no
  // known publisher; non-empty = the known publishers - see
  // src/components/Arc56OwnerLinks.vue, the shared renderer for this shape.
  owners: Arc56Owner[] | null;
}

// Shared by Arc56CallDetails.vue (one call's own detail view) and
// Arc56RequestSummary.vue (an aggregate view over every app call in a
// request) - the caller is only responsible for the Vue/store-specific part
// (dispatching algod/getApplicationPrograms for `approvalProgram`); this
// covers the rest of the decode + publisher-lookup sequence so it can't
// drift between the two call sites the way it already has once before.
export const decodeAppCallWithOwners = async (
  txn: algosdk.Transaction,
  appIndex: bigint,
  currentIndex: number,
  approvalProgram: Uint8Array | undefined,
  groupTransactions: AppCallGroupTxnRef[] = [],
): Promise<DecodedAppCallWithOwners | undefined> => {
  const info = buildAppCallInfo(txn, appIndex, currentIndex, approvalProgram, groupTransactions);
  if (!info) return undefined;

  const decoded = await decodeArc56AppCall(info);
  const owners = decoded.approvalHash
    ? ((await fetchArc56OwnersByProgramHash(decoded.approvalHash, "approval"))?.owners ?? [])
    : null;
  return { decoded, owners };
};

// Applies a user-picked, unverified candidate contract's argument
// names/descriptions/struct field names on top of an already-decoded call,
// purely for display — never changes `trust`, and never re-decodes raw
// values (the types are already authoritative from the selector itself).
export const applyCandidateToArgs = (
  call: DecodedArc56Call,
  candidate: Arc56CandidateMatch,
): DecodedArc56Arg[] =>
  enrichWithMethod(call.args, candidate.method.args, candidate.contract.structs ?? {});
