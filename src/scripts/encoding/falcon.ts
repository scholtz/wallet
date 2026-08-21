import algosdk from "algosdk";

/**
 * Falcon-1024 post-quantum account helpers (algosdk 3.7.0 PQ signature scheme "f1").
 *
 * The key pair is derived deterministically from a standard 25-word Algorand
 * mnemonic via algosdk.pq25WordMnemonicToSeed (domain-separated per scheme, so
 * the same mnemonic yields a different key than the ed25519 account it would
 * produce through mnemonicToSecretKey). The actual Falcon crypto comes from the
 * `falcon-1024` package (WASM bindings over Algorand's deterministic Falcon-1024
 * C implementation) — algosdk only provides the envelope/address plumbing.
 */

// falcon-1024 instantiates its embedded WASM module with a top-level await at
// import time, so it's loaded lazily (and code-split by Vite) instead of being
// pulled into the main bundle for users who never touch Falcon accounts.
let falconModulePromise: Promise<typeof import("falcon-1024")> | undefined;
const loadFalcon = () => (falconModulePromise ??= import("falcon-1024"));

export interface FalconKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/** Generate a fresh 25-word Algorand mnemonic to derive a Falcon account from. */
export function generateFalconMnemonic(): string {
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  return algosdk.mnemonicFromSeed(seed);
}

/** Whether the string is a checksum-valid 25-word Algorand mnemonic. */
export function isValidFalconMnemonic(mnemonic: string): boolean {
  try {
    algosdk.pq25WordMnemonicToSeed(mnemonic.trim(), algosdk.FALCON_1024_SCHEME);
    return true;
  } catch {
    return false;
  }
}

/** Deterministically derive the Falcon-1024 key pair from a 25-word mnemonic. */
export async function falconKeyPairFromMnemonic(
  mnemonic: string,
): Promise<FalconKeyPair> {
  const seed = algosdk.pq25WordMnemonicToSeed(
    mnemonic.trim(),
    algosdk.FALCON_1024_SCHEME,
  );
  const falcon = await loadFalcon();
  return falcon.generateKey(seed);
}

/** Derive the Algorand address of a Falcon-1024 account from its public key. */
export function falconAddressFromPublicKey(publicKey: Uint8Array): string {
  const { address } = algosdk.addressFromPQKey(
    algosdk.FALCON_1024_SCHEME,
    publicKey,
  );
  return address.toString();
}

/**
 * Sign a transaction with a Falcon-1024 key pair and return the encoded
 * signed-transaction bytes (msgpack SignedTransaction carrying a `pqsig`
 * envelope instead of an ed25519 `sig`).
 */
export async function falconSignTransaction(
  tx: algosdk.Transaction,
  keyPair: FalconKeyPair,
): Promise<Uint8Array> {
  const falcon = await loadFalcon();
  const { txnSigner } = algosdk.addressWithSignersFromRawFalcon1024Signer({
    falcon1024PublicKey: keyPair.publicKey,
    falcon1024Signer: (bytesToSign: Uint8Array) =>
      Promise.resolve(falcon.signCompressed(keyPair.privateKey, bytesToSign)),
  });
  const signed = await txnSigner([tx], [0]);
  return signed[0];
}
