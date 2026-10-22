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
 * This tab's copy wins for accounts present on both sides (AW-2026-073, accepted: secret key
 * fields are fixed when an account is created; what a stale save can undo is newer metadata such as
 * a name, a hidden flag or the cached rekey data, which `wallet/syncAccountSigner` refreshes).
 * A persisted list that is empty is not trusted for dropping: a stale tab then re-adds accounts
 * another tab deleted. That is deliberate: losing a key the user still needs is worse than
 * a deleted one lingering until they delete it again. Legacy persisted entries whose
 * address is not a string cannot be compared and are ignored (openWallet normalized them).
 */
export function mergePrivateAccounts<A extends { addr: string }>(
  memory: A[],
  persisted: A[] | undefined,
  known: ReadonlySet<string>,
): A[] {
  if (!Array.isArray(persisted)) return memory;
  // Corrupt entries (null, primitives) cannot be compared and are ignored.
  const readable = persisted.filter((a) => typeof a === "object" && a !== null);
  const hadCorrupt = readable.length !== persisted.length;
  persisted = readable;
  const persistedAddrs = new Set(
    persisted.map((a) => a.addr).filter((addr) => typeof addr === "string"),
  );
  // Dropping is only trusted when the persisted list is readable and non-empty.
  const trustworthy =
    !hadCorrupt &&
    persisted.length > 0 &&
    persisted.every((a) => typeof a.addr === "string");
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

/**
 * Removes the account with this address in place and reports whether one was found. Matching is
 * by address only: the name is a mutable label, and `splice(-1, 1)` on a miss would silently delete
 * the wallet's last account together with its key (AW-2026-079).
 */
export function removeAccountByAddr<A extends { addr: string }>(
  accounts: A[],
  addr: string,
): boolean {
  const index = accounts.findIndex((acc) => acc.addr === addr);
  if (index === -1) return false;
  accounts.splice(index, 1);
  return true;
}

/** Largest wallet backup file accepted on import. Real blobs are a few kB to a few hundred kB. */
export const MAX_WALLET_IMPORT_BYTES = 10 * 1024 * 1024;

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
// Sizes `encryptWalletData` writes (walletCrypto.ts) and the most PBKDF2 iterations an import may
// ask for: an absurd count would freeze the tab on unlock.
const WALLET_SALT_BYTES = 16;
const WALLET_IV_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;
// "Salted__" + 8 byte salt + at least one 16 byte AES block, base64 encoded.
const MIN_LEGACY_BLOB_LENGTH = 44;
const MAX_WALLET_PBKDF2_ITERATIONS = 2_000_000;

const base64ByteLength = (value: string): number =>
  Math.floor((value.length * 3) / 4) - (value.match(/=+$/)?.[0].length ?? 0);
// Every CryptoJS passphrase-encrypted string is base64 of "Salted__" + salt + data.
const LEGACY_PREFIX = "U2FsdGVkX1";

/**
 * Checks that an uploaded wallet backup looks like something `wallet/openWallet` can decrypt: the
 * AWEv1 envelope `AWEv1.<iterations>.<salt>.<iv>.<ciphertext>` or a legacy CryptoJS base64
 * string, within the size cap. Returns the trimmed blob to store, or the reason it was refused
 * (AW-2026-078). It cannot prove the password fits; it only rejects non-wallet files early.
 */
export function validateWalletBlob(
  data: string,
): { ok: true; data: string } | { ok: false; reason: "too_large" | "invalid" } {
  if (data.length > MAX_WALLET_IMPORT_BYTES) {
    return { ok: false, reason: "too_large" };
  }
  const blob = data.trim();
  const parts = blob.split(".");
  if (parts[0] === "AWEv1") {
    const [, iterations, salt, iv, ciphertext] = parts;
    const valid =
      parts.length === 5 &&
      /^[1-9][0-9]{0,8}$/.test(iterations) &&
      Number(iterations) <= MAX_WALLET_PBKDF2_ITERATIONS &&
      [salt, iv, ciphertext].every((p) => BASE64_PATTERN.test(p)) &&
      base64ByteLength(salt) === WALLET_SALT_BYTES &&
      base64ByteLength(iv) === WALLET_IV_BYTES &&
      base64ByteLength(ciphertext) >= AES_GCM_TAG_BYTES;
    return valid ? { ok: true, data: blob } : { ok: false, reason: "invalid" };
  }
  if (
    blob.startsWith(LEGACY_PREFIX) &&
    blob.length >= MIN_LEGACY_BLOB_LENGTH &&
    BASE64_PATTERN.test(blob)
  ) {
    return { ok: true, data: blob };
  }
  return { ok: false, reason: "invalid" };
}
