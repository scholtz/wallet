import nacl from "tweetnacl";
import {
  Encoding as HdEncoding,
  KeyContext,
  XHDWalletAPI,
} from "@algorandfoundation/xhd-wallet-api";
import { hdRootKeyFromMnemonic } from "./hdWallet";

/**
 * ARC-60 (Algorand Wallet Arbitrary Signing API) helpers.
 * https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0060.md
 *
 * Only the AUTH scope is implemented (the only scope the ARC currently
 * defines) - other scope values are rejected with ERROR_INVALID_SCOPE.
 */

export enum Arc60ScopeType {
  AUTH = 1,
}

export interface Arc60Metadata {
  scope: number;
  encoding: string;
}

/** Request payload as decoded from a WalletConnect `algo_signData` request item. */
export interface Arc60StdSigData {
  data: string; // base64-encoded bytes to sign
  signer: string; // base64-encoded ed25519 public key, or an Algorand address
  domain: string;
  requestId?: string;
  authenticatorData: string; // base64-encoded WebAuthn-style authenticator data
  hdPath?: string;
  scope: number;
  encoding: string;
}

export class Arc60Error extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "Arc60Error";
  }
}

const xhdWalletApi = new XHDWalletAPI();

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
  );
  return new Uint8Array(digest);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function base64ToBytes(value: string): Uint8Array {
  try {
    return new Uint8Array(Buffer.from(value, "base64"));
  } catch {
    throw new Arc60Error("ERROR_FAILED_DECODING", "Failed to decode base64 value.");
  }
}

export function bytesToBase64(value: Uint8Array): string {
  return Buffer.from(value).toString("base64");
}

/**
 * Builds a minimal WebAuthn-style authenticatorData buffer for domain
 * binding: 32-byte SHA-256(domain) rpIdHash + 1 flags byte (User Present).
 */
export async function buildAuthenticatorData(domain: string): Promise<Uint8Array> {
  const rpIdHash = await sha256(new TextEncoder().encode(domain));
  const flags = new Uint8Array([0x01]);
  const result = new Uint8Array(rpIdHash.length + flags.length);
  result.set(rpIdHash, 0);
  result.set(flags, rpIdHash.length);
  return result;
}

/**
 * ARC-60 requires wallets to validate that the first 32 bytes of
 * authenticatorData are SHA-256(domain) before signing (domain binding),
 * so a malicious dApp cannot claim a different domain than it actually is.
 */
export async function validateAuthenticatorDataDomain(
  authenticatorData: Uint8Array,
  domain: string,
): Promise<boolean> {
  if (authenticatorData.length < 32) return false;
  const expected = await sha256(new TextEncoder().encode(domain));
  return bytesEqual(authenticatorData.slice(0, 32), expected);
}

/** EdDSA(SHA256(data) + SHA256(authenticatorData)), per ARC-60's AUTH scope. */
export async function computeArc60Digest(
  data: Uint8Array,
  authenticatorData: Uint8Array,
): Promise<Uint8Array> {
  const dataHash = await sha256(data);
  const authHash = await sha256(authenticatorData);
  const digest = new Uint8Array(dataHash.length + authHash.length);
  digest.set(dataHash, 0);
  digest.set(authHash, dataHash.length);
  return digest;
}

export interface DecodedArc60Request {
  data: Uint8Array;
  authenticatorData: Uint8Array;
  domain: string;
  requestId?: string;
  hdPath?: string;
  scope: number;
  encoding: string;
}

/** Validates and decodes a raw StdSigData request item per ARC-60's MUST-validate rules. */
export function decodeArc60Request(item: Arc60StdSigData): DecodedArc60Request {
  if (item.scope !== Arc60ScopeType.AUTH) {
    throw new Arc60Error("ERROR_INVALID_SCOPE", `Unsupported scope: ${item.scope}`);
  }
  if (!item.domain) {
    throw new Arc60Error("ERROR_MISSING_DOMAIN", "Missing domain in sign data request.");
  }
  if (!item.authenticatorData) {
    throw new Arc60Error(
      "ERROR_MISSING_AUTHENTICATED_DATA",
      "Missing authenticatorData in sign data request.",
    );
  }
  const data = base64ToBytes(item.data);
  const authenticatorData = base64ToBytes(item.authenticatorData);
  return {
    data,
    authenticatorData,
    domain: item.domain,
    requestId: item.requestId,
    hdPath: item.hdPath,
    scope: item.scope,
    encoding: item.encoding,
  };
}

export function signArc60DigestWithSk(digest: Uint8Array, sk: Uint8Array): Uint8Array {
  return nacl.sign.detached(digest, sk);
}

export async function signArc60DigestWithHd(
  mnemonic: string,
  accountIndex: number,
  digest: Uint8Array,
): Promise<Uint8Array> {
  const rootKey = hdRootKeyFromMnemonic(mnemonic);
  return await xhdWalletApi.signData(
    rootKey,
    KeyContext.Address,
    accountIndex,
    0,
    digest,
    { encoding: HdEncoding.NONE, schema: {} },
  );
}
