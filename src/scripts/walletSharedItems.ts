/**
 * wc items shared between wallet tabs (e.g. the Biatec Direct popup and the main tab). They are
 * written only through `wallet/wcUpdateItemFresh` (an atomic read-modify-write against the
 * persisted record). A tab serializing its whole in-memory wallet must therefore take the
 * persisted value of these keys instead of its own, possibly stale, copy.
 */
export const SHARED_WC_KEYS = ["direct:sessions"];

/**
 * The wc map to persist: this tab's items, with every shared key replaced by its persisted value
 * (or removed when the persisted record has none).
 */
export function mergeSharedWcItems(
  memoryWc: Record<string, string> | undefined,
  persistedWc: Record<string, string> | undefined,
  keys: string[] = SHARED_WC_KEYS,
): Record<string, string> {
  const wc = { ...(memoryWc ?? {}) };
  for (const key of keys) {
    if (persistedWc && Object.prototype.hasOwnProperty.call(persistedWc, key)) {
      wc[key] = persistedWc[key];
    } else {
      delete wc[key];
    }
  }
  return wc;
}
