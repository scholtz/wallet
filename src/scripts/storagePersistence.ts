/**
 * Persistent-storage helpers. The wallet lives only in IndexedDB; without the "persistent" flag
 * Chrome treats the whole origin as best-effort and may evict it (under disk pressure, or for a
 * rarely visited site) without any notice - the user then finds the wallet gone. Requesting
 * persistence exempts the origin from automatic eviction.
 */

/** The subset of `navigator.storage` this module uses (injectable for tests). */
export interface StorageManagerLike {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

export type PersistenceStatus =
  /** persistence was already granted */
  | "already"
  /** the browser granted it now */
  | "granted"
  /** the browser refused (Chrome decides by site engagement); data may still be evicted */
  | "denied"
  /** the API is missing or threw */
  | "unsupported";

export async function requestPersistentStorage(
  storage: StorageManagerLike | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.storage
): Promise<PersistenceStatus> {
  if (!storage?.persist || !storage.persisted) return "unsupported";
  try {
    if (await storage.persisted()) return "already";
    return (await storage.persist()) ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

/**
 * True when the browser positively refused persistence, i.e. it may silently delete the wallet and
 * the user should keep a backup. An unsupported API (e.g. insecure context) is not a known risk.
 */
export function isStorageAtRisk(status: PersistenceStatus): boolean {
  return status === "denied";
}

/**
 * Read-only check (never prompts): is the storage already persistent? Used on the login screen,
 * where an unsolicited `persist()` could raise a permission prompt (Firefox) before any user action.
 */
export async function checkPersistentStorage(
  storage: StorageManagerLike | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.storage
): Promise<PersistenceStatus> {
  if (!storage?.persisted) return "unsupported";
  try {
    return (await storage.persisted()) ? "already" : "denied";
  } catch {
    return "unsupported";
  }
}

/**
 * A browser evicting the origin's storage wipes IndexedDB *and* localStorage together, but not
 * cookies, so a long-lived flag cookie is what still tells us "a wallet used to be here". It holds
 * no wallet data or name - only the fact that one existed.
 */
const HAD_WALLET_COOKIE = "awallet_had_wallet";

export interface CookieJarLike {
  cookie: string;
}

export function setHadWalletMarker(
  jar: CookieJarLike | undefined = typeof document === "undefined"
    ? undefined
    : document
) {
  if (!jar) return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  jar.cookie = `${HAD_WALLET_COOKIE}=1; max-age=31536000; path=/; SameSite=Strict${secure}`;
}

export function clearHadWalletMarker(
  jar: CookieJarLike | undefined = typeof document === "undefined"
    ? undefined
    : document
) {
  if (!jar) return;
  jar.cookie = `${HAD_WALLET_COOKIE}=; max-age=0; path=/; SameSite=Strict`;
}

export function hasHadWalletMarker(
  jar: CookieJarLike | undefined = typeof document === "undefined"
    ? undefined
    : document
): boolean {
  if (!jar) return false;
  return jar.cookie
    .split(";")
    .some((part) => part.trim() === `${HAD_WALLET_COOKIE}=1`);
}
