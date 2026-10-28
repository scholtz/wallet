/**
 * Pure helpers for the public /gateway (Merchant.vue) payment page (AW-2026-076). The page decodes
 * a payment URI and optional redirect settings from the URL, so every value is attacker-controlled
 * and must be validated before it reaches an `href`, a form `action` or a network request.
 */

export interface GatewaySettings {
  /** Validated absolute http(s) URL the "cancel" button links to. */
  cancel?: string;
  /** Validated absolute http(s) URL the paid form POSTs to. */
  success?: string;
}

export interface GatewayIndexerEndpoint {
  server: string;
  token: string;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** True only for payment URIs the page may link to; `javascript:`, `data:` etc. are refused. */
export function isAlgorandPaymentUri(uri: string): boolean {
  return uri.startsWith("algorand://") || uri.startsWith("web+algorand://");
}

/**
 * Normalised URL when `value` is safe to navigate to: `https:` anywhere, `http:` only on loopback,
 * and never with embedded credentials (which are used to spoof the visible host).
 */
// `unknown`: the value comes from JSON.parse of a URL segment, so its type is not known until checked.
export function sanitizeRedirectUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return undefined;
  }
  if (url.username || url.password) return undefined;
  if (url.protocol === "https:") return url.href;
  if (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname)) {
    return url.href;
  }
  return undefined;
}

/** Reduces the decoded `:settings` JSON to the two validated URLs; anything else is dropped. */
// `unknown`: untrusted JSON.parse output, narrowed below before any field is read.
export function sanitizeGatewaySettings(raw: unknown): GatewaySettings {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const settings: GatewaySettings = {};
  const cancel = sanitizeRedirectUrl(input.cancel);
  if (cancel) settings.cancel = cancel;
  const success = sanitizeRedirectUrl(input.success);
  if (success) settings.success = success;
  return settings;
}

const SANDBOX_TOKEN =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

/**
 * Indexer the payment poll uses for the network named in the URI. The page queries it through its
 * own client instead of rewriting the user's persisted node settings (`config/setHosts` writes
 * localStorage). `undefined` means "no/unknown network": the caller keeps the configured indexer.
 */
export function gatewayIndexerEndpoint(
  network: string | undefined,
): GatewayIndexerEndpoint | undefined {
  switch (network) {
    case "mainnet":
    case "mainnet-v1.0":
      return { server: "https://mainnet-idx.algonode.cloud", token: "" };
    case "aramidmain":
      return {
        server: "https://indexer.aramidmain.a-wallet.net",
        token: "",
      };
    case "testnet":
    case "testnet-v1.0":
      return { server: "https://testnet-idx.algonode.cloud", token: "" };
    case "sandbox":
      return { server: "http://localhost:8980", token: SANDBOX_TOKEN };
    default:
      return undefined;
  }
}

/** What a payment must contain before the gateway calls an order paid (AW-2026-084). */
export interface GatewayExpectedPayment {
  payTo: string;
  /** 0n for ALGO. */
  assetId: bigint;
  /** Smallest acceptable amount in base units; 0n when the link names no amount. */
  minAmount: bigint;
}

// Structural subset of the indexer transaction model (algosdk v3 camelCase, bigint amounts).
export interface IndexerPaymentTxLike {
  id?: string;
  sender?: string;
  paymentTransaction?: { receiver: string; amount: bigint | number };
  assetTransferTransaction?: {
    receiver: string;
    amount: bigint | number;
    assetId: bigint | number;
  };
}

const toBigIntOrZero = (value: string | number | bigint | null | undefined): bigint => {
  try {
    if (typeof value === "bigint") return value >= 0n ? value : 0n;
    if (typeof value === "string" && !/^\d{1,30}$/.test(value.trim())) return 0n;
    if (typeof value === "number" && !Number.isFinite(value)) return 0n;
    const parsed = BigInt(typeof value === "number" ? Math.round(value) : String(value ?? "0"));
    return parsed >= 0n ? parsed : 0n;
  } catch {
    return 0n;
  }
};

/**
 * Whether the amount / asset of a payment link is usable: absent, or a whole non-negative number.
 * A malformed value must make the link invalid rather than silently mean "no minimum" or "ALGO"
 * (AW-2026-084).
 */
export function isWholeNumberParam(value: string | number | bigint | null | undefined): boolean {
  if (value === undefined || value === null || value === "") return true;
  return /^\d{1,30}$/.test(String(value).trim());
}

/** Reads the expected asset and minimum base-unit amount from the parsed payment link. */
export function gatewayExpectedPayment(link: {
  payTo?: string;
  asset?: string | number;
  amountBase?: string | number;
}): GatewayExpectedPayment {
  return {
    payTo: link.payTo ?? "",
    assetId: toBigIntOrZero(link.asset),
    minAmount: toBigIntOrZero(link.amountBase),
  };
}

/**
 * True when the transaction pays the link's receiver in the link's asset, at least the requested
 * amount. A transaction that merely touches the payee (0 amount, another asset, sent *by* the
 * payee, an unrelated note match) is not a payment.
 */
export function isExpectedPayment(
  tx: IndexerPaymentTxLike,
  expected: GatewayExpectedPayment,
): boolean {
  // The payee paying itself (a consolidation, a refund looping back) is not a customer payment.
  if (tx.sender === expected.payTo) return false;
  if (expected.assetId === 0n) {
    const pay = tx.paymentTransaction;
    return (
      !!pay &&
      pay.receiver === expected.payTo &&
      BigInt(pay.amount) >= expected.minAmount &&
      BigInt(pay.amount) > 0n
    );
  }
  const axfer = tx.assetTransferTransaction;
  return (
    !!axfer &&
    axfer.receiver === expected.payTo &&
    BigInt(axfer.assetId) === expected.assetId &&
    BigInt(axfer.amount) >= expected.minAmount &&
    BigInt(axfer.amount) > 0n
  );
}
