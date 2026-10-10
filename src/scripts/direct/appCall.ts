/**
 * Review model of an application call for the Biatec Direct popup (pure, unit-testable under Node).
 *
 * The popup signs the whole application lifecycle - create, update, delete, plus ordinary calls,
 * opt-in, close-out and clear-state - so it must tell the user what a transaction really does:
 * a create deploys new code, an update REPLACES the code of an existing contract, a delete
 * destroys it. The programs are shown as size + SHA-256 (comparable with what a build tool or an
 * explorer reports) and as raw bytes on demand.
 */
import CryptoJS from "crypto-js";

export type AppCallKind =
  | "create"
  | "update"
  | "delete"
  | "closeOut"
  | "clearState"
  | "optIn"
  | "call";

/** `high`: changes or removes contract code/state for everyone; `medium`: leaves the app. */
export type AppCallRisk = "high" | "medium" | "none";

export interface ProgramInfo {
  size: number;
  /** Lower-case hex SHA-256 of the whole program. */
  sha256: string;
  /** Hex of the program bytes (bounded: see `truncated`). */
  hex: string;
  /** The byte views were cut at PROGRAM_PREVIEW_BYTES; the hash covers the whole program. */
  truncated?: true;
}

export interface StateSchema {
  ints: number;
  byteSlices: number;
}

export interface ApplicationCallReview {
  kind: AppCallKind;
  risk: AppCallRisk;
  /** 0 for a creation (the id is assigned when it is confirmed). */
  appIndex: number | bigint;
  /** What the transaction does when it completes (NoOp, OptIn, ...). */
  onComplete: string;
  approval?: ProgramInfo;
  clear?: ProgramInfo;
  globalSchema?: StateSchema;
  localSchema?: StateSchema;
  extraPages?: number;
  argsCount: number;
}

/** The part of an algosdk Transaction this module reads. */
export interface ApplicationTransactionLike {
  type?: string;
  applicationCall?: {
    appIndex?: bigint | number;
    onComplete?: number;
    approvalProgram?: Uint8Array;
    clearProgram?: Uint8Array;
    numGlobalInts?: number;
    numGlobalByteSlices?: number;
    numLocalInts?: number;
    numLocalByteSlices?: number;
    extraPages?: number;
    appArgs?: ReadonlyArray<Uint8Array>;
  };
}

/** Bytes of a program shown in the popup; the hash always covers the whole program. */
// A defensive cap only: a valid program is at most 2048 bytes x 4 pages = 8 KB, far below it.
export const PROGRAM_PREVIEW_BYTES = 65536;

// algosdk OnApplicationComplete values.
const ON_COMPLETE = ["NoOp", "OptIn", "CloseOut", "ClearState", "UpdateApplication", "DeleteApplication"];

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

function programInfo(program: Uint8Array | undefined): ProgramInfo | undefined {
  if (!program || program.length === 0) return undefined;
  const preview = program.length > PROGRAM_PREVIEW_BYTES ? program.subarray(0, PROGRAM_PREVIEW_BYTES) : program;
  const info: ProgramInfo = {
    size: program.length,
    // unknown cast: crypto-js types WordArray.create() as number[] only, but at runtime it
    // accepts a Uint8Array (typed-array support), which is what the program is.
    sha256: CryptoJS.SHA256(CryptoJS.lib.WordArray.create(program as unknown as number[])).toString(
      CryptoJS.enc.Hex,
    ),
    hex: toHex(preview),
  };
  if (preview !== program) info.truncated = true;
  return info;
}

/** Create, update and delete of a contract: these get the application card. */
export const isLifecycle = (review: ApplicationCallReview | undefined): boolean =>
  review?.kind === "create" || review?.kind === "update" || review?.kind === "delete";

export function describeApplicationCall(txn: ApplicationTransactionLike): ApplicationCallReview | undefined {
  if (txn.type !== "appl" || !txn.applicationCall) return undefined;
  const call = txn.applicationCall;
  const appIndex = call.appIndex ?? 0;
  const onComplete = call.onComplete ?? 0;
  // An out-of-range value is shown as such (and flagged), never passed off as a harmless NoOp.
  const unknownOnComplete = ON_COMPLETE[onComplete] === undefined;
  const onCompleteName = ON_COMPLETE[onComplete] ?? `Unknown (${onComplete})`;
  const isCreate = Number(appIndex) === 0;

  let kind: AppCallKind;
  let risk: AppCallRisk = "none";
  if (isCreate) {
    kind = "create";
    risk = "high";
  } else if (onCompleteName === "UpdateApplication") {
    kind = "update";
    risk = "high";
  } else if (onCompleteName === "DeleteApplication") {
    kind = "delete";
    risk = "high";
  } else if (onCompleteName === "CloseOut") {
    kind = "closeOut";
    risk = "medium";
  } else if (onCompleteName === "ClearState") {
    kind = "clearState";
    risk = "medium";
  } else if (onCompleteName === "OptIn") {
    kind = "optIn";
  } else {
    kind = "call";
    if (unknownOnComplete) risk = "high";
  }

  const summary: ApplicationCallReview = {
    kind,
    risk,
    // App ids fit a JS number in practice; keep a bigint only for an absurdly large one.
    appIndex:
      typeof appIndex === "bigint" && appIndex <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(appIndex)
        : appIndex,
    onComplete: onCompleteName.replace("Application", ""),
    argsCount: call.appArgs?.length ?? 0,
  };
  if (kind === "create" || kind === "update") {
    summary.approval = programInfo(call.approvalProgram);
    summary.clear = programInfo(call.clearProgram);
  }
  if (kind === "create") {
    summary.globalSchema = { ints: call.numGlobalInts ?? 0, byteSlices: call.numGlobalByteSlices ?? 0 };
    summary.localSchema = { ints: call.numLocalInts ?? 0, byteSlices: call.numLocalByteSlices ?? 0 };
    summary.extraPages = call.extraPages ?? 0;
  }
  return summary;
}
