// Node-only unit tests for the wallet-at-rest encryption helpers (AW-2026-099 iteration upgrade).
import { test, expect } from "@playwright/test";
import {
  clearDerivedKeys,
  decryptWalletData,
  encryptWalletData,
} from "../../src/scripts/encoding/walletCrypto";

const header = (blob: string) => {
  const [prefix, iterations, salt] = blob.split(".");
  return { prefix, iterations: Number(iterations), salt };
};

test.describe("encryptWalletData", () => {
  test.afterEach(() => clearDerivedKeys());

  test("round-trips and writes the current iteration count", async () => {
    const blob = await encryptWalletData("secret payload", "correct horse battery");
    expect(header(blob)).toMatchObject({ prefix: "AWEv1", iterations: 600000 });
    expect(await decryptWalletData(blob, "correct horse battery")).toBe("secret payload");
    await expect(decryptWalletData(blob, "wrong password")).rejects.toBeTruthy();
  });

  test("a later save reuses the salt of a blob at the current strength", async () => {
    const first = await encryptWalletData("a", "password-123");
    const second = await encryptWalletData("b", "password-123", first);
    expect(header(second).salt).toBe(header(first).salt);
    expect(header(second).iterations).toBe(600000);
  });

  test("a blob imported with fewer iterations is upgraded on its next save", async () => {
    // Only the header is read when the salt is reused, so a stand-in ciphertext is enough.
    const weak = "AWEv1.100000.AAAAAAAAAAAAAAAAAAAAAA==.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
    const upgraded = await encryptWalletData("payload", "password-123", weak);
    expect(header(upgraded).iterations).toBe(600000);
    expect(header(upgraded).salt).not.toBe("AAAAAAAAAAAAAAAAAAAAAA==");
    expect(await decryptWalletData(upgraded, "password-123")).toBe("payload");
  });

  test("a stronger blob keeps its higher iteration count", async () => {
    const strong = "AWEv1.900000.AAAAAAAAAAAAAAAAAAAAAA==.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
    const saved = await encryptWalletData("payload", "password-123", strong);
    expect(header(saved)).toMatchObject({ iterations: 900000, salt: "AAAAAAAAAAAAAAAAAAAAAA==" });
  });

  test("a legacy or unreadable previous blob falls back to a fresh default", async () => {
    for (const previous of ["U2FsdGVkX1+abc", "AWEv1.notanumber.x.y.z", undefined]) {
      const blob = await encryptWalletData("payload", "password-123", previous);
      expect(header(blob).iterations).toBe(600000);
    }
  });
});
