// Client for the ARC-56 program-hash / ABI-selector registry
// (https://github.com/scholtz/ARC56Registry). Tries this deployment's
// self-hosted mirror (served at /arc56-registry by the scholtz2/arc56-registry
// docker image, see k8s/*.yaml) first, then falls back to the public GitHub
// Pages mirror, then to the raw GitHub content of the same repo — so lookups
// keep working on deployment targets that can't host a sidecar container
// (Vercel, GitHub Pages, local `pnpm run serve`), and even if the Pages site
// itself is temporarily unavailable/misconfigured.
import type {
  Arc56AbiSignatureEntry,
  Arc56Contract,
  Arc56OwnersEntry,
  Arc56ProgramKind,
} from "./types";

// Same-origin path first (works whenever this wallet build is served behind
// the ingress rule that proxies /arc56-registry/* to the registry
// container), public Pages mirror second, raw githubusercontent.com of the
// same repo/branch as the final fallback.
export const REGISTRY_BASE_URLS: readonly string[] = [
  "/arc56-registry",
  "https://scholtz.github.io/ARC56Registry",
  "https://raw.githubusercontent.com/scholtz/ARC56Registry/refs/heads/main",
];

const FETCH_TIMEOUT_MS = 5_000;

// Thrown by the strict lookups when every mirror was unreachable (offline,
// timeout, 5xx/429) - as opposed to a definitive "not in the registry" (404).
// A caller deciding on signing risk must treat this as "could not verify",
// never as "not registered / no publisher".
export class RegistryUnavailableError extends Error {
  constructor(path: string) {
    super(`ARC-56 registry unavailable for ${path}`);
    this.name = "RegistryUnavailableError";
  }
}

interface FetchResult {
  // `unknown` is unavoidable: one cache holds specs, ABI entries and owners
  // files, each a different shape; fetchJson<T> narrows it per call.
  value: unknown;
  // A null value that may be down to an outage rather than a real 404.
  transient: boolean;
}

const jsonCache = new Map<string, Promise<FetchResult>>();

const fetchJson = async <T>(
  relativePath: string,
  strict = false,
): Promise<T | null> => {
  let promise = jsonCache.get(relativePath);
  if (!promise) {
    const fresh: Promise<FetchResult> = (async (): Promise<FetchResult> => {
      let transient = false;
      // At least one mirror answered a definitive 404: the file is absent,
      // even if another mirror is having an outage.
      let definitiveMiss = false;
      for (const base of REGISTRY_BASE_URLS) {
        let response: Response;
        try {
          response = await fetch(`${base}/${relativePath}`, {
            headers: { Accept: "application/json" },
            // A hung mirror must fall through to the next one (and finally
            // to "not found", i.e. a warning) instead of leaving the
            // signing risk verdict pending forever.
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          });
        } catch {
          // Offline / timeout. A missing self-hosted mirror or an offline
          // public fallback are both expected - try the next base URL.
          transient = true;
          continue;
        }
        if (!response.ok) {
          // 404 is a definitive miss on that mirror; anything else (5xx,
          // 429, ...) is an outage and must not be cached as "not found".
          if (response.status === 404) definitiveMiss = true;
          else transient = true;
          continue;
        }
        try {
          return { value: (await response.json()) as T, transient: false };
        } catch {
          // An HTML body is an SPA fallback answering 200 for a path no
          // mirror serves: a permanently absent mirror. Anything else (a
          // truncated or dropped body) is a transient failure.
          if (!(response.headers.get("content-type") ?? "").includes("html")) {
            transient = true;
          }
        }
      }
      return { value: null, transient: transient && !definitiveMiss };
    })();
    jsonCache.set(relativePath, fresh);
    // A transient miss must not be cached, or a brief outage would show a
    // false warning all session. Identity-checked: only evict our own entry.
    void fresh.then((result) => {
      if (result.value === null && result.transient && jsonCache.get(relativePath) === fresh) {
        jsonCache.delete(relativePath);
      }
    });
    promise = fresh;
  }
  const result = await promise;
  if (strict && result.value === null && result.transient) {
    throw new RegistryUnavailableError(relativePath);
  }
  return result.value as T | null;
};

export const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    // .slice() copies into a plain, non-shared ArrayBuffer-backed view —
    // required because SubtleCrypto rejects BufferSource views over a
    // SharedArrayBuffer, which some Uint8Array sources here could be.
    bytes.slice(),
  );
  return Buffer.from(digest).toString("hex");
};

export const bytesToSelectorHex = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("hex");

// `strict` = throw RegistryUnavailableError instead of returning null when the
// registry could not be reached (see above).
export const fetchArc56SpecByProgramHash = async (
  hash: string,
  kind: Arc56ProgramKind,
  strict = false,
): Promise<Arc56Contract | null> => {
  const folder = kind === "approval" ? "approval-programs" : "clear-programs";
  return fetchJson<Arc56Contract>(
    `${folder}/${hash.slice(0, 3)}/${hash}.arc56.json`,
    strict,
  );
};

export const fetchAbiSignatureEntry = async (
  selectorHex: string,
): Promise<Arc56AbiSignatureEntry | null> =>
  fetchJson<Arc56AbiSignatureEntry>(
    `abi-signatures/${selectorHex.slice(0, 2)}/${selectorHex}.json`,
  );

export const fetchArc56OwnersByProgramHash = async (
  hash: string,
  kind: Arc56ProgramKind,
): Promise<Arc56OwnersEntry | null> => {
  const folder = kind === "approval" ? "approval-programs" : "clear-programs";
  // Always strict: an unreachable registry must never read as "no known
  // publisher" (or hide a ban).
  return fetchJson<Arc56OwnersEntry>(
    `${folder}/${hash.slice(0, 3)}/${hash}.owners.json`,
    true,
  );
};
