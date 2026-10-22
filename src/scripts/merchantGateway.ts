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
