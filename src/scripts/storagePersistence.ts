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

/** True when the browser may silently delete the wallet, i.e. the user should keep a backup. */
export function isStorageAtRisk(status: PersistenceStatus): boolean {
  return status === "denied" || status === "unsupported";
}
