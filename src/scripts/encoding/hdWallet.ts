import algosdk from "algosdk";
import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import {
  fromSeed,
  KeyContext,
  XHDWalletAPI,
} from "@algorandfoundation/xhd-wallet-api";

/**
 * ARC-52 (BIP32-Ed25519) HD wallet helpers.
 *
 * Derivation path is fixed to Algorand's BIP44 coin type: m'/44'/283'/account'/0/keyIndex.
 * Only `account` (hardened, our "iteration") and `keyIndex` (soft) vary.
 */

const walletApi = new XHDWalletAPI();

export function generateHdMnemonic(): string {
  return generateMnemonic(wordlist, 256);
}

export function isValidHdMnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic.trim(), wordlist);
}

export function hdRootKeyFromMnemonic(mnemonic: string): Uint8Array {
  const seed = mnemonicToSeedSync(mnemonic.trim());
  return fromSeed(Buffer.from(seed));
}

export async function hdDeriveAddress(
  mnemonic: string,
  accountIndex: number,
  keyIndex: number = 0,
): Promise<string> {
  const rootKey = hdRootKeyFromMnemonic(mnemonic);
  const publicKey = await walletApi.keyGen(
    rootKey,
    KeyContext.Address,
    accountIndex,
    keyIndex,
  );
  return algosdk.encodeAddress(publicKey);
}

export async function hdSignTransactionBytes(
  mnemonic: string,
  accountIndex: number,
  keyIndex: number,
  prefixEncodedTx: Uint8Array,
): Promise<Uint8Array> {
  const rootKey = hdRootKeyFromMnemonic(mnemonic);
  return await walletApi.signAlgoTransaction(
    rootKey,
    KeyContext.Address,
    accountIndex,
    keyIndex,
    prefixEncodedTx,
  );
}
