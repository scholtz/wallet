// Node-only unit tests for the account deletion policy (AW-2026-119).
import { test, expect } from "@playwright/test";
import { accountDeletionBlocker, accountHoldsSecret } from "../../src/scripts/walletPersist";

test.describe("accountHoldsSecret", () => {
  test("an account with its own key material holds a secret", () => {
    expect(accountHoldsSecret({ addr: "A", sk: new Uint8Array([1]) })).toBe(true);
    expect(accountHoldsSecret({ addr: "A", hdMnemonic: "word word" })).toBe(true);
    expect(accountHoldsSecret({ addr: "A", falconMnemonic: "word word" })).toBe(true);
    expect(accountHoldsSecret({ addr: "A", falconPrivateKey: new Uint8Array([1]) })).toBe(true);
  });

  test("watch, derived HD and empty-key accounts hold none", () => {
    expect(accountHoldsSecret({ addr: "A" })).toBe(false);
    expect(accountHoldsSecret({ addr: "D", hdRootAddr: "R" })).toBe(false);
    expect(accountHoldsSecret({ addr: "A", sk: new Uint8Array() })).toBe(false);
  });
});

test.describe("accountDeletionBlocker", () => {
  const root = { addr: "R", hdMnemonic: "m", hdRootAddr: "R" };
  const child = { addr: "D", hdRootAddr: "R" };

  test("an HD root with derived accounts cannot be deleted", () => {
    expect(accountDeletionBlocker([root, child], "R")).toBe("hd_children");
  });

  test("an HD root without derived accounts, a derived account and other accounts can", () => {
    expect(accountDeletionBlocker([root], "R")).toBeUndefined();
    expect(accountDeletionBlocker([root, child], "D")).toBeUndefined();
    expect(accountDeletionBlocker([root, { addr: "X" }], "X")).toBeUndefined();
    expect(accountDeletionBlocker([root, child], "UNKNOWN")).toBeUndefined();
  });
});
