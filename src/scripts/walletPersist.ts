/**
 * Pure helpers for persisting the wallet record (kept free of runtime imports so they are
 * unit-testable under Node).
 */

/** The fields `wallet/openWallet` reads back; nothing else belongs in an encrypted blob. */
export interface PersistableWallet<A extends { addr: string }> {
  privateAccounts: A[];
  lastPayTo: string;
  lastActiveAccount: string;
  wc: Record<string, string>;
}

/**
 * Merge this tab's accounts with the persisted ones so a stale tab neither erases an account
 * another tab created nor resurrects one another tab deleted (AW-2026-059). `known` is the set of
 * addresses this tab has already seen in the persisted record (loaded or saved):
 * - persisted, not in memory, not in `known`: added elsewhere, kept;
 * - in memory and in `known` but no longer persisted: deleted elsewhere, dropped;
 * - in memory, never persisted: new in this tab, kept.
 * This tab's copy wins for accounts present on both sides. Legacy persisted entries whose
 * address is not a string cannot be compared and are ignored (openWallet normalized them).
 */
export function mergePrivateAccounts<A extends { addr: string }>(
  memory: A[],
  persisted: A[] | undefined,
  known: ReadonlySet<string>,
): A[] {
  if (!persisted) return memory;
  const persistedAddrs = new Set(
    persisted.map((a) => a.addr).filter((addr) => typeof addr === "string"),
  );
  // Dropping is only trusted when the persisted list is readable and non-empty.
  const trustworthy =
    persisted.length > 0 && persisted.every((a) => typeof a.addr === "string");
  const kept = trustworthy
    ? memory.filter((a) => !(known.has(a.addr) && !persistedAddrs.has(a.addr)))
    : memory;
  const have = new Set(kept.map((a) => a.addr));
  const added = persisted.filter(
    (a) => typeof a.addr === "string" && !have.has(a.addr) && !known.has(a.addr),
  );
  return kept.length === memory.length && added.length === 0
    ? memory
    : [...kept, ...added];
}

/**
 * JSON for the encrypted wallet blob: an allow-list of what is read back on open, so the
 * wrapped session password, the open flag and the clock never enter a ciphertext
 * (AW-2026-061 / -066).
 */
export function serializePersistedWallet<A extends { addr: string }>(
  wallet: PersistableWallet<A>,
  override: { wc?: Record<string, string>; privateAccounts?: A[] } = {},
): string {
  const data: PersistableWallet<A> = {
    privateAccounts: override.privateAccounts ?? wallet.privateAccounts,
    lastPayTo: wallet.lastPayTo,
    lastActiveAccount: wallet.lastActiveAccount,
    wc: override.wc ?? wallet.wc ?? {},
  };
  return JSON.stringify(data, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

export const MIN_PASSWORD_LENGTH = 8;

/** Why a new wallet password is not acceptable; `undefined` when it is (AW-2026-066). */
export function validateNewPassword(
  pass: string,
): "empty" | "too_short" | undefined {
  if (!pass || pass.trim().length === 0) return "empty";
  if (pass.length < MIN_PASSWORD_LENGTH) return "too_short";
  return undefined;
}
