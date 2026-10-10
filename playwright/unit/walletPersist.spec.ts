// Node-only unit tests for the wallet persistence helpers (AW-2026-059 lost update,
// AW-2026-061/-066 what goes into a wallet blob, AW-2026-066 password policy).
import { test, expect } from "@playwright/test";
import {
  mergePrivateAccounts,
  serializePersistedWallet,
  validateNewPassword,
  MIN_PASSWORD_LENGTH,
} from "../../src/scripts/walletPersist";

const acct = (addr: string, extra: Record<string, unknown> = {}) => ({
  addr,
  name: addr,
  ...extra,
});

test.describe("mergePrivateAccounts (AW-2026-059)", () => {
  test("keeps an account another tab added since this tab loaded the wallet", () => {
    const memory = [acct("A")];
    const persisted = [acct("A"), acct("B")];
    const merged = mergePrivateAccounts(memory, persisted, new Set(["A"]));
    expect(merged.map((a) => a.addr)).toEqual(["A", "B"]);
  });

  test("an account this tab knew and removed stays removed", () => {
    const merged = mergePrivateAccounts(
      [acct("A")],
      [acct("A"), acct("B")],
      new Set(["A", "B"]),
    );
    expect(merged.map((a) => a.addr)).toEqual(["A"]);
  });

  test("this tab's copy of an account wins over the persisted one", () => {
    const merged = mergePrivateAccounts(
      [acct("A", { name: "renamed here" })],
      [acct("A", { name: "old" })],
      new Set(["A"]),
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("renamed here");
  });

  test("new accounts of this tab are kept and no duplicates appear", () => {
    const merged = mergePrivateAccounts(
      [acct("A"), acct("C")],
      [acct("A"), acct("B")],
      new Set(["A"]),
    );
    expect(merged.map((a) => a.addr).sort()).toEqual(["A", "B", "C"]);
  });

  test("an account another tab deleted is not written back by this tab", () => {
    const merged = mergePrivateAccounts(
      [acct("A"), acct("B")],
      [acct("A")],
      new Set(["A", "B"]),
    );
    expect(merged.map((a) => a.addr)).toEqual(["A"]);
  });

  test("a new account of this tab (never persisted) is kept even though it is absent", () => {
    const merged = mergePrivateAccounts([acct("A"), acct("N")], [acct("A")], new Set(["A"]));
    expect(merged.map((a) => a.addr)).toEqual(["A", "N"]);
  });

  test("legacy persisted entries with a non-string address are ignored, not duplicated", () => {
    const legacy = { addr: { publicKey: [1, 2, 3] } } as unknown as { addr: string };
    const merged = mergePrivateAccounts([acct("A")], [legacy, acct("A")], new Set());
    expect(merged.map((a) => a.addr)).toEqual(["A"]);
  });

  test("a legacy persisted record does not make this tab drop its known accounts", () => {
    const legacy = { addr: { publicKey: [1, 2, 3] } } as unknown as { addr: string };
    const merged = mergePrivateAccounts([acct("A")], [legacy], new Set(["A"]));
    expect(merged.map((a) => a.addr)).toEqual(["A"]);
  });

  test("an empty persisted list does not wipe this tab's accounts", () => {
    expect(mergePrivateAccounts([acct("A")], [], new Set(["A"]))).toHaveLength(1);
  });

  test("a persisted value that is not a list changes nothing instead of throwing", () => {
    const memory = [acct("A")];
    const broken = "oops" as unknown as { addr: string }[];
    expect(mergePrivateAccounts(memory, broken, new Set(["A"]))).toEqual(memory);
  });

  test("null or primitive entries in the persisted list are ignored", () => {
    const corrupt = [null, 5, acct("B")] as unknown as { addr: string }[];
    // A corrupt list is not trusted for deletions: A (known, not listed) is kept.
    const merged = mergePrivateAccounts([acct("A")], corrupt, new Set(["A"]));
    expect(merged.map((a) => a.addr)).toEqual(["A", "B"]);
  });

  test("a missing persisted list changes nothing", () => {
    const memory = [acct("A")];
    expect(mergePrivateAccounts(memory, undefined, new Set())).toEqual(memory);
  });
});

test.describe("serializePersistedWallet (AW-2026-061 / -066)", () => {
  const wallet = {
    name: "w",
    isOpen: true,
    time: 1,
    pass: "wrapped-secret",
    privateAccounts: [acct("A", { amount: 5n })],
    algodHost: ["h"],
    lastPayTo: "P",
    lastActiveAccount: "A",
    lastActiveAccountName: "n",
    transaction: undefined,
    wc: { k: "v" },
  };

  test("persists only the fields the wallet reads back", () => {
    const parsed = JSON.parse(serializePersistedWallet(wallet));
    expect(Object.keys(parsed).sort()).toEqual([
      "lastActiveAccount",
      "lastPayTo",
      "privateAccounts",
      "wc",
    ]);
  });

  test("never writes the session password, open flag or clock into the blob", () => {
    const text = serializePersistedWallet(wallet);
    expect(text).not.toContain("wrapped-secret");
    expect(text).not.toContain("isOpen");
  });

  test("serializes bigint values and accepts an explicit wc map", () => {
    const parsed = JSON.parse(
      serializePersistedWallet(wallet, { wc: { shared: "1" } }),
    );
    expect(parsed.privateAccounts[0].amount).toBe("5");
    expect(parsed.wc).toEqual({ shared: "1" });
  });
});

test.describe("validateNewPassword (AW-2026-066)", () => {
  test("rejects an empty or whitespace-only password", () => {
    expect(validateNewPassword("")).toBeDefined();
    expect(validateNewPassword("        ")).toBeDefined();
  });

  test("rejects a password shorter than the minimum", () => {
    expect(validateNewPassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBeDefined();
  });

  test("accepts a password of the minimum length", () => {
    expect(validateNewPassword("a".repeat(MIN_PASSWORD_LENGTH))).toBeUndefined();
    expect(validateNewPassword("TestPassword123")).toBeUndefined();
  });
});
