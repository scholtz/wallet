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

const jsonCache = new Map<string, Promise<unknown | null>>();

const fetchJson = async <T>(relativePath: string): Promise<T | null> => {
  const cached = jsonCache.get(relativePath);
  if (cached) return cached as Promise<T | null>;

  // Set when any mirror failed at the network level (offline, timeout) rather
  // than answering 404 - the resulting "not found" is then transient and must
  // not be cached, or a brief outage would show a false warning all session.
  let transientFailure = false;
  const promise = (async (): Promise<T | null> => {
    for (const base of REGISTRY_BASE_URLS) {
      let response: Response;
      try {
        response = await fetch(`${base}/${relativePath}`, {
          headers: { Accept: "application/json" },
          // A hung mirror must fall through to the next one (and finally to
          // "not found", i.e. a warning) instead of leaving the signing
          // risk verdict pending forever.
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
      } catch {
        // Offline / timeout: transient, so a resulting "not found" must not
        // be cached. A missing self-hosted mirror or an offline public
        // fallback are both expected, not errors - try the next base URL.
        transientFailure = true;
        continue;
      }
      if (!response.ok) continue;
      try {
        return (await response.json()) as T;
      } catch {
        // Not JSON (e.g. an SPA fallback answering 200 for a path no mirror
        // serves): a permanently absent mirror, not a transient failure.
      }
    }
    return null;
  })();

  jsonCache.set(relativePath, promise);
  void promise.then((value) => {
    if (value === null && transientFailure) jsonCache.delete(relativePath);
  });
  return promise;
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

export const fetchArc56SpecByProgramHash = async (
  hash: string,
  kind: Arc56ProgramKind,
): Promise<Arc56Contract | null> => {
  const folder = kind === "approval" ? "approval-programs" : "clear-programs";
  return fetchJson<Arc56Contract>(
    `${folder}/${hash.slice(0, 3)}/${hash}.arc56.json`,
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
  return fetchJson<Arc56OwnersEntry>(
    `${folder}/${hash.slice(0, 3)}/${hash}.owners.json`,
  );
};
