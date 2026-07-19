// Client for the ARC-56 program-hash / ABI-selector registry
// (https://github.com/scholtz/ARC56Registry). Tries this deployment's
// self-hosted mirror (served at /arc56-registry by the scholtz2/arc56-registry
// docker image, see k8s/*.yaml) first, then falls back to the public GitHub
// Pages mirror — so lookups keep working on deployment targets that can't
// host a sidecar container (Vercel, GitHub Pages, local `pnpm run serve`).
import type {
  Arc56AbiSignatureEntry,
  Arc56Contract,
  Arc56ProgramKind,
} from "./types";

// Same-origin path first (works whenever this wallet build is served behind
// the ingress rule that proxies /arc56-registry/* to the registry
// container), public mirror second.
export const REGISTRY_BASE_URLS: readonly string[] = [
  "/arc56-registry",
  "https://scholtz.github.io/ARC56Registry",
];

const jsonCache = new Map<string, Promise<unknown | null>>();

const fetchJson = async <T>(relativePath: string): Promise<T | null> => {
  const cached = jsonCache.get(relativePath);
  if (cached) return cached as Promise<T | null>;

  const promise = (async (): Promise<T | null> => {
    for (const base of REGISTRY_BASE_URLS) {
      try {
        const response = await fetch(`${base}/${relativePath}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) continue;
        return (await response.json()) as T;
      } catch {
        // Try the next base URL — a missing self-hosted mirror or an
        // offline public fallback are both expected, not errors.
      }
    }
    return null;
  })();

  jsonCache.set(relativePath, promise);
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
