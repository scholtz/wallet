// Node-only unit test (no browser, no dev server) for the Falcon-1024
// post-quantum account helpers. Run via `pnpm run test:unit`
// (playwright test -c playwright.unit.config.ts).
import { test, expect } from "@playwright/test";
import algosdk from "algosdk";
import {
  falconAddressFromPublicKey,
  falconKeyPairFromMnemonic,
  falconSignTransaction,
  generateFalconMnemonic,
  isValidFalconMnemonic,
} from "../../src/scripts/encoding/falcon";

test("generated mnemonic is a valid 25-word Algorand mnemonic", () => {
  const mn = generateFalconMnemonic();
  expect(mn.trim().split(/\s+/)).toHaveLength(25);
  expect(isValidFalconMnemonic(mn)).toBe(true);
  expect(isValidFalconMnemonic("not a mnemonic")).toBe(false);
});

test("key derivation is deterministic and differs from the ed25519 account of the same mnemonic", async () => {
  const mn = generateFalconMnemonic();
  const kp1 = await falconKeyPairFromMnemonic(mn);
  const kp2 = await falconKeyPairFromMnemonic(mn);
  expect(Buffer.from(kp1.publicKey).equals(Buffer.from(kp2.publicKey))).toBe(
    true,
  );
  const addr = falconAddressFromPublicKey(kp1.publicKey);
  expect(algosdk.isValidAddress(addr)).toBe(true);
  // Domain separation: the same 25 words must not collapse into the plain
  // ed25519 account a user may already use elsewhere.
  const ed25519Addr = algosdk.mnemonicToSecretKey(mn).addr.toString();
  expect(addr).not.toBe(ed25519Addr);
});

test("signing produces a valid pqsig envelope that authorizes the derived address", async () => {
  const mn = generateFalconMnemonic();
  const keyPair = await falconKeyPairFromMnemonic(mn);
  const addr = falconAddressFromPublicKey(keyPair.publicKey);
  const tx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: addr,
    receiver: addr,
    amount: 0,
    suggestedParams: {
      fee: 1000,
      flatFee: true,
      firstValid: 1,
      lastValid: 1000,
      genesisID: "testnet-v1.0",
      genesisHash: algosdk.base64ToBytes(
        "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      ),
      minFee: 1000,
    },
  });
  const signedBytes = await falconSignTransaction(tx, keyPair);
  const decoded = algosdk.decodeSignedTransaction(signedBytes);
  expect(decoded.pqsig).toBeDefined();
  if (!decoded.pqsig) throw new Error("pqsig missing");
  // The signature is self-describing: the address it authorizes must be the
  // account's own address.
  expect(algosdk.addressFromPQSig(decoded.pqsig).toString()).toBe(addr);
  // And the Falcon signature itself must verify over the TX-tagged bytes.
  const falcon = await import("falcon-1024");
  expect(
    falcon.verifyCompressed(
      keyPair.publicKey,
      decoded.pqsig.sig,
      tx.bytesToSign(),
    ),
  ).toBe(true);
});
