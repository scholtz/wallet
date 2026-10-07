/**
 * "Biatec Direct" (wallet side): the relay-free popup + postMessage dApp transport.
 *
 * Pure logic only (no Vue/Vuex/DOM imports) so it is unit-testable under Node and the
 * security-relevant decisions live in one reviewable place. The runtime that wires this to
 * `window.opener` is `src/shared/direct.ts`; the request queueing is `src/store/direct.ts`.
 * Normative protocol: docs/DIRECT.md (mirrored in the biatec-wallet-use-wallet-client repo).
 */

export const DIRECT_PROTOCOL_VERSION = 1;
export const DIRECT_READY_REFERENCE = "biatec:direct:ready";

export const DirectReference = {
  enableRequest: "arc0027:enable:request",
  enableResponse: "arc0027:enable:response",
  disableRequest: "arc0027:disable:request",
  disableResponse: "arc0027:disable:response",
  signTransactionsRequest: "arc0027:sign_transactions:request",
  signTransactionsResponse: "arc0027:sign_transactions:response",
  signDataRequest: "arc0060:sign_data:request",
  signDataResponse: "arc0060:sign_data:response",
} as const;

/** Methods the wallet announces in `ready`. */
export const DIRECT_METHODS = [
  DirectReference.enableRequest,
  DirectReference.disableRequest,
  DirectReference.signTransactionsRequest,
  DirectReference.signDataRequest,
];

/** The popup accepts its single request only this long after it announced `ready`. */
export const DIRECT_ACCEPT_WINDOW_MS = 30_000;
/** Grace period so the response is flushed to the opener before the popup closes itself. */
export const DIRECT_CLOSE_DELAY_MS = 150;

export const MAX_DIRECT_ID_LENGTH = 128;
export const MAX_DIRECT_ENABLE_ACCOUNTS = 16;
/** Sessions stored per wallet; the oldest is dropped beyond this. */
export const MAX_DIRECT_SESSIONS = 100;

/** ARC-0027 / ARC-0001 error codes, same values as the Liquid transport. */
export const DirectErrorCode = {
  unknown: 4000,
  cancelled: 4001,
  timedOut: 4002,
  methodNotSupported: 4003,
  networkNotSupported: 4004,
  unauthorizedSigner: 4100,
  invalidInput: 4200,
  invalidGroupId: 4201,
  failedToPost: 4300,
} as const;

export interface DirectRequestMessage {
  id: string;
  reference: string;
  // unknown values: params are untrusted postMessage data; every field is validated where used.
  params: Record<string, unknown>;
}

export interface DirectErrorPayload {
  code: number;
  message: string;
  providerId?: string;
}

export interface DirectResponseMessage {
  id: string;
  requestId: string;
  reference: string;
  // unknown: heterogeneous per-method result payloads, serialized as-is by postMessage.
  result?: unknown;
  error?: DirectErrorPayload;
}

export interface DirectReadyMessage {
  v: number;
  reference: typeof DIRECT_READY_REFERENCE;
  capabilities: { methods: string[]; genesisHashes: string[] };
}

// unknown: type guard over untrusted postMessage data.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** True for loopback hosts, the only plain-http origins a dApp may use (local development). */
export function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "[::1]"
  );
}

/**
 * Canonical origin of a dApp, or `undefined` when it is not acceptable: only `https:` origins
 * and `http:` loopback origins qualify, and the string must already be in canonical origin form
 * (no path, query, credentials, trailing slash). Used for both the `origin` URL hint and the
 * browser-supplied `event.origin`.
 */
// unknown: the origin hint / event.origin come from an untrusted page; validated below.
export function parseDappOrigin(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.origin !== value || url.origin === "null") {
    return undefined;
  }
  // `https://example.com.` is a distinct origin that looks like `https://example.com`.
  if (url.hostname.endsWith(".")) {
    return undefined;
  }
  if (url.protocol === "https:") {
    return url.origin;
  }
  if (url.protocol === "http:" && isLoopbackHost(url.hostname)) {
    return url.origin;
  }
  return undefined;
}

/** Development origins are flagged in the approval UI. */
export function isDevelopmentOrigin(origin: string): boolean {
  try {
    return isLoopbackHost(new URL(origin).hostname);
  } catch {
    return false;
  }
}

/** Read the dApp's `origin` hint from the popup's query string. */
export function parseOriginHint(search: string): string | undefined {
  return parseDappOrigin(new URLSearchParams(search).get("origin"));
}

/**
 * Structural validation of an untrusted inbound message. Everything the wallet later reads from
 * `params` is validated again where it is used; this only guarantees the envelope.
 */
// unknown: `data` is an untrusted postMessage payload.
export function parseRequestEnvelope(
  data: unknown,
): DirectRequestMessage | undefined {
  if (!isRecord(data)) return undefined;
  const { id, reference, params } = data;
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    id.length > MAX_DIRECT_ID_LENGTH
  ) {
    return undefined;
  }
  if (typeof reference !== "string" || reference.length > 128) {
    return undefined;
  }
  if (!isRecord(params)) return undefined;
  return { id, reference, params };
}

export function buildDirectResponse(
  requestId: string,
  reference: string,
  // unknown: heterogeneous per-method result payloads.
  result: unknown,
): DirectResponseMessage {
  return { id: newMessageId(), requestId, reference, result };
}

export function buildDirectError(
  requestId: string,
  reference: string,
  error: DirectErrorPayload,
): DirectResponseMessage {
  return { id: newMessageId(), requestId, reference, error };
}

/** `…:request` -> `…:response`. */
export function responseReference(reference: string): string {
  return reference.replace(/:request$/, ":response");
}

function newMessageId(): string {
  return globalThis.crypto.randomUUID();
}

export type GateDecision =
  | { ok: true }
  | { ok: false; reason: string; silent: boolean };

/**
 * Per-popup admission gate: exactly one request, from the hinted origin, from `window.opener`,
 * within a short window after `ready` was announced. Time is injected for testing.
 */
export class DirectRequestGate {
  private readyAt: number | undefined;
  private used = false;

  constructor(
    readonly dappOrigin: string,
    private readonly windowMs: number = DIRECT_ACCEPT_WINDOW_MS,
  ) {}

  markReady(now: number): void {
    this.readyAt = now;
  }

  get hasAcceptedRequest(): boolean {
    return this.used;
  }

  /**
   * `silent` decisions must not be answered (messages that are not from the expected peer
   * must never receive a reply — it would leak the wallet's state to a third party).
   */
  admit(input: {
    origin: string;
    fromOpener: boolean;
    now: number;
  }): GateDecision {
    if (input.origin !== this.dappOrigin || !input.fromOpener) {
      return { ok: false, reason: "Untrusted sender.", silent: true };
    }
    if (this.readyAt === undefined) {
      return { ok: false, reason: "Wallet is not ready.", silent: true };
    }
    if (this.used) {
      return {
        ok: false,
        reason: "Only one request is accepted per wallet window.",
        silent: false,
      };
    }
    if (input.now - this.readyAt > this.windowMs) {
      return {
        ok: false,
        reason: "The request arrived too late; open the wallet again.",
        silent: false,
      };
    }
    this.used = true;
    return { ok: true };
  }
}

// ---------- Network binding ----------

/** CAIP-2 reference of well-known networks (base64url, first 32 chars of the genesis hash). */
const WELL_KNOWN_GENESIS_PREFIX: Record<string, string> = {
  "mainnet-v1.0": "wGHE2Pwdvd7S12BL5FaOP20EGYesN73k",
  "testnet-v1.0": "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe",
  "betanet-v1.0": "mFgazF-2uRS1tMiL9dsj01hJGySEmPN2",
  "fnet-v1": "kUt08LxeVAAGHnh4JoAoAMM9ql_hBwSo",
  "voimain-v1.0": "r20fSQI8gWe_kFZziNonSPCXLwcQmH_n",
  "aramidmain-v1.0": "PgeQVJJgx_LYKJfIEz7dbfNPuXmDyJ-O",
};

/**
 * Transaction kinds Biatec Direct signs. The compact popup is the user's only review surface,
 * so it signs only what that surface shows completely: payments, asset transfers (incl. the
 * clawback source) and calls to EXISTING apps with their OnComplete. Asset configuration, freeze,
 * key registration, state proofs, heartbeats and app creation/update (programs) are refused;
 * a dApp needing them uses WalletConnect, whose full review screen shows them.
 * Returns the refusal reason, or undefined when the transaction is allowed.
 */
export function directUnsupportedReason(tx: {
  type?: string;
  applicationCall?: {
    appIndex?: bigint | number;
    approvalProgram?: Uint8Array;
    clearProgram?: Uint8Array;
  };
}): string | undefined {
  switch (tx.type) {
    case "pay":
    case "axfer":
      return undefined;
    case "appl": {
      const call = tx.applicationCall;
      if (!call || Number(call.appIndex ?? 0) === 0) {
        return "Creating an application is not supported by Biatec Direct.";
      }
      if ((call.approvalProgram?.length ?? 0) > 0 || (call.clearProgram?.length ?? 0) > 0) {
        return "Updating application programs is not supported by Biatec Direct.";
      }
      return undefined;
    }
    default:
      return `Transaction type "${String(tx.type).slice(0, 16)}" is not supported by Biatec Direct.`;
  }
}

/** True when the network is in the built-in table, so the remote genesis list is not needed. */
export function isWellKnownNetwork(env: string): boolean {
  return Object.prototype.hasOwnProperty.call(WELL_KNOWN_GENESIS_PREFIX, env);
}

/** base64 / base64url genesis hash -> 32-byte base64url with padding removed; undefined if bad. */
// unknown: the genesis hash is untrusted request data.
export function normalizeGenesisHash(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length < 43 || value.length > 44) {
    return undefined;
  }
  if (!/^[A-Za-z0-9+/_-]{43}=?$/.test(value)) return undefined;
  return value.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** First 32 base64url chars of a genesis hash — what a CAIP-2 `algorand:` reference carries. */
export function genesisCaipReference(normalized: string): string {
  return normalized.slice(0, 32);
}

/**
 * Expected CAIP-2 reference of the wallet's active network: the built-in table of well-known
 * networks first, otherwise the public genesis list (for networks the wallet does not know). `undefined` when
 * the network cannot be determined (custom node, unknown env) — callers must then fail closed
 * unless the user configured a custom node.
 */
export function expectedGenesisReference(
  env: string,
  genesisList: { network: string; CAIP10: string }[],
): string | undefined {
  // The built-in table wins: the public genesis list is fetched from a remote host and must not
  // be able to weaken the binding of a well-known network.
  const known = WELL_KNOWN_GENESIS_PREFIX[env];
  if (known) return known;
  const entry = genesisList.find((n) => n.network === env);
  const caip = entry?.CAIP10;
  if (typeof caip === "string" && caip.startsWith("algorand:")) {
    return caip.slice("algorand:".length);
  }
  return undefined;
}

export type NetworkCheck =
  | { ok: true }
  | { ok: false; code: number; reason: string };

/**
 * The request's `genesisHash` must be well-formed and denote the wallet's active network
 * (AW network binding: a dApp cannot get a signature for another chain's transaction).
 * With a custom node (`env === "custom"`) there is nothing to compare with; the per-transaction
 * check (`txnGenesisMatches`) still binds the transactions to the request's hash.
 */
export function checkRequestNetwork(input: {
  // unknown: untrusted request data, validated by normalizeGenesisHash.
  requestGenesisHash: unknown;
  env: string;
  genesisList: { network: string; CAIP10: string }[];
}): NetworkCheck & { normalized?: string } {
  const normalized = normalizeGenesisHash(input.requestGenesisHash);
  if (!normalized) {
    return {
      ok: false,
      code: DirectErrorCode.invalidInput,
      reason: "Invalid genesisHash.",
    };
  }
  if (input.env === "custom") {
    return { ok: true, normalized };
  }
  const expected = expectedGenesisReference(input.env, input.genesisList);
  if (!expected) {
    return {
      ok: false,
      code: DirectErrorCode.networkNotSupported,
      reason: "The wallet cannot verify its active network.",
    };
  }
  if (genesisCaipReference(normalized) !== expected) {
    return {
      ok: false,
      code: DirectErrorCode.networkNotSupported,
      reason: "The request targets a different network than the wallet's active network.",
    };
  }
  return { ok: true, normalized };
}

/** A decoded transaction's genesis hash bytes must equal the request's `genesisHash`. */
export function txnGenesisMatches(
  txnGenesisHash: Uint8Array | undefined,
  normalizedRequestHash: string,
): boolean {
  if (!txnGenesisHash || txnGenesisHash.length !== 32) return false;
  const encoded = Buffer.from(txnGenesisHash)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return encoded === normalizedRequestHash;
}
