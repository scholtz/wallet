import CryptoJS from "crypto-js";
import { Buffer } from "buffer";

/**
 * Wallet-at-rest encryption helpers.
 *
 * New format ("AWEv1"): AES-256-GCM with a key derived via PBKDF2-SHA256
 * (Web Crypto, 600,000 iterations) from the user's password and a random
 * per-wallet salt. Serialized as:
 *
 *   AWEv1.<iterations>.<salt b64>.<iv b64>.<ciphertext b64>
 *
 * Legacy format: CryptoJS.AES.encrypt(data, pass) passphrase overload
 * (OpenSSL EVP_BytesToKey, single-round MD5 — see audit finding
 * AW-2026-002). Legacy blobs are still decryptable for backward
 * compatibility; every write uses the new format, so existing wallets are
 * transparently upgraded the next time they are opened or saved.
 */

const NEW_FORMAT_PREFIX = "AWEv1";
const PBKDF2_ITERATIONS = 600000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// PBKDF2 with 600k iterations is deliberately slow. saveWallet runs on many
// user actions, so derived keys are cached per (password, salt, iterations)
// to keep the UI responsive; the cache key is a SHA-256 digest so the raw
// password is not used as a map key. Keys are non-extractable CryptoKeys.
const derivedKeyCache = new Map<string, CryptoKey>();

const getCrypto = (): Crypto => {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error("Web Crypto API is not available in this environment");
  }
  return cryptoObj;
};

const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64");

const fromBase64 = (value: string): Uint8Array =>
  new Uint8Array(Buffer.from(value, "base64"));

const cacheKeyFor = async (
  pass: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> => {
  const digestInput = textEncoder.encode(`${iterations}:${pass}`);
  const combined = new Uint8Array(digestInput.length + salt.length);
  combined.set(digestInput);
  combined.set(salt, digestInput.length);
  const digest = await getCrypto().subtle.digest("SHA-256", combined);
  return Buffer.from(new Uint8Array(digest)).toString("hex");
};

const deriveAesKey = async (
  pass: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> => {
  const cacheKey = await cacheKeyFor(pass, salt, iterations);
  const cached = derivedKeyCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const subtle = getCrypto().subtle;
  const baseKey = await subtle.importKey(
    "raw",
    textEncoder.encode(pass),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const aesKey = await subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  derivedKeyCache.set(cacheKey, aesKey);
  return aesKey;
};

/**
 * Drop all cached derived AES keys. Must be called on logout/wallet
 * destruction — without this, an in-origin attacker who can read the
 * IndexedDB-persisted encrypted blob after logout could still decrypt it via
 * a cached key without ever knowing the password (audit finding
 * AW-2026-027).
 */
export const clearDerivedKeys = (): void => {
  derivedKeyCache.clear();
};

/** True when the ciphertext is in the legacy CryptoJS passphrase format. */
export const isLegacyEncryptedData = (encrypted: string): boolean =>
  !encrypted.startsWith(`${NEW_FORMAT_PREFIX}.`);

interface ParsedNewFormat {
  iterations: number;
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

const parseNewFormat = (encrypted: string): ParsedNewFormat => {
  const parts = encrypted.split(".");
  if (parts.length !== 5 || parts[0] !== NEW_FORMAT_PREFIX) {
    throw new Error("Unrecognized wallet encryption format");
  }
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    throw new Error("Invalid wallet encryption iteration count");
  }
  return {
    iterations,
    salt: fromBase64(parts[2]),
    iv: fromBase64(parts[3]),
    ciphertext: fromBase64(parts[4]),
  };
};

/**
 * Encrypt data with the strong (PBKDF2 + AES-GCM) scheme.
 *
 * `reuseSaltFrom` may hold the wallet's previous ciphertext; when it is in
 * the new format its salt (and iteration count) are reused so repeated saves
 * hit the derived-key cache instead of re-running PBKDF2. A fresh random IV
 * is always generated.
 */
export const encryptWalletData = async (
  data: string,
  pass: string,
  reuseSaltFrom?: string
): Promise<string> => {
  const cryptoObj = getCrypto();
  let salt: Uint8Array | undefined;
  let iterations = PBKDF2_ITERATIONS;
  if (reuseSaltFrom && !isLegacyEncryptedData(reuseSaltFrom)) {
    try {
      const parsed = parseNewFormat(reuseSaltFrom);
      salt = parsed.salt;
      iterations = parsed.iterations;
    } catch {
      salt = undefined;
      iterations = PBKDF2_ITERATIONS;
    }
  }
  if (!salt) {
    salt = cryptoObj.getRandomValues(new Uint8Array(SALT_BYTES));
  }
  const iv = cryptoObj.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveAesKey(pass, salt, iterations);
  const ciphertext = new Uint8Array(
    await cryptoObj.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      textEncoder.encode(data)
    )
  );
  return [
    NEW_FORMAT_PREFIX,
    String(iterations),
    toBase64(salt),
    toBase64(iv),
    toBase64(ciphertext),
  ].join(".");
};

const decryptNewFormat = async (
  encrypted: string,
  pass: string
): Promise<string> => {
  const { iterations, salt, iv, ciphertext } = parseNewFormat(encrypted);
  const key = await deriveAesKey(pass, salt, iterations);
  const plain = await getCrypto().subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );
  return textDecoder.decode(plain);
};

const decryptLegacyFormat = (encrypted: string, pass: string): string => {
  const decrypted = CryptoJS.AES.decrypt(encrypted, pass);
  return decrypted.toString(CryptoJS.enc.Utf8);
};

/**
 * Decrypt wallet data in either format. Throws (or returns an empty string,
 * for the legacy format) when the password is wrong.
 */
export const decryptWalletData = async (
  encrypted: string,
  pass: string
): Promise<string> => {
  if (isLegacyEncryptedData(encrypted)) {
    return decryptLegacyFormat(encrypted, pass);
  }
  return decryptNewFormat(encrypted, pass);
};
