// Node-only unit tests: which wallet accounts Biatec Direct offers to a site. Every account the
// wallet can produce a signature for qualifies (plain, ARC-76 with a stored key, HD, Falcon-1024,
// Ledger, multisig with a local signator, and accounts rekeyed to one of those); watch-only
// accounts, ARC-76 accounts without a stored key, hidden accounts and WalletConnect accounts do not.
import { test, expect } from "@playwright/test";
import {
  canSignData,
  canSignLocally,
  holdsHdKey,
  isDirectEligibleAccount,
  type EligibilityAccount,
} from "../../src/scripts/direct/eligibility";

const acct = (addr: string, extra: Partial<EligibilityAccount> = {}): EligibilityAccount => ({
  addr,
  ...extra,
});
const KEY = new Uint8Array([1, 2, 3]);

test.describe("canSignLocally", () => {
  test("a plain account with a secret key", () => {
    const a = acct("A", { sk: KEY });
    expect(canSignLocally(a, [a])).toBe(true);
  });

  test("an ARC-76 account without a stored key (password not saved)", () => {
    const a = acct("A", { type: "emailPwd" });
    expect(canSignLocally(a, [a])).toBe(false);
  });

  test("an ARC-76 account with its key stored", () => {
    const a = acct("A", { type: "emailPwd", sk: KEY });
    expect(canSignLocally(a, [a])).toBe(true);
  });

  test("an HD root and a derived HD account", () => {
    const root = acct("R", { type: "hd", hdMnemonic: "words", hdRootAddr: "R" });
    const child = acct("C", { type: "hd", hdRootAddr: "R", hdAccountIndex: 1 });
    expect(canSignLocally(root, [root, child])).toBe(true);
    expect(canSignLocally(child, [root, child])).toBe(true);
  });

  test("a derived HD account whose root is missing cannot sign", () => {
    const child = acct("C", { type: "hd", hdRootAddr: "R", hdAccountIndex: 1 });
    expect(canSignLocally(child, [child])).toBe(false);
  });

  test("a Falcon-1024 account needs its private key", () => {
    expect(canSignLocally(acct("F", { type: "falcon1024", falconPrivateKey: KEY }), [])).toBe(true);
    expect(canSignLocally(acct("F", { type: "falcon1024" }), [])).toBe(false);
  });

  test("a Ledger account", () => {
    expect(canSignLocally(acct("L", { type: "ledger" }), [])).toBe(true);
  });

  test("a multisig account needs a signator this wallet holds", () => {
    const local = acct("A", { sk: KEY });
    const msig = acct("M", { type: "msig", params: { addrs: ["A", "X"] } });
    expect(canSignLocally(msig, [local, msig])).toBe(true);
    const foreign = acct("N", { type: "msig", params: { addrs: ["X", "Y"] } });
    expect(canSignLocally(foreign, [local, foreign])).toBe(false);
  });

  test("a multisig whose signator is an HD account", () => {
    const hd = acct("H", { type: "hd", hdMnemonic: "w", hdRootAddr: "H" });
    const msig = acct("M", { type: "msig", params: { addrs: ["H", "X"] } });
    expect(canSignLocally(msig, [hd, msig])).toBe(true);
  });

  test("a multisig with no local signator but rekeyed to a local key can sign", () => {
    const local = acct("L", { type: "ledger" });
    const msig = acct("M", {
      type: "msig",
      params: { addrs: ["X", "Y"] },
      data: { "mainnet-v1.0": { rekeyedTo: "L" } },
    });
    expect(canSignLocally(msig, [local, msig])).toBe(true);
  });

  test("a multisig whose only local signator is a Falcon account is not offered (Falcon cannot be a multisig subsigner)", () => {
    const falcon = acct("F", { type: "falcon1024", falconPrivateKey: KEY });
    const msig = acct("M", { type: "msig", params: { addrs: ["F", "X"] } });
    expect(canSignLocally(msig, [falcon, msig])).toBe(false);
  });

  test("a watch-only account cannot sign", () => {
    const a = acct("W");
    expect(canSignLocally(a, [a])).toBe(false);
  });

  test("a watch-only account rekeyed to a local key can sign (on that network)", () => {
    const falcon = acct("F", { type: "falcon1024", falconPrivateKey: KEY });
    const watched = acct("W", { data: { "mainnet-v1.0": { rekeyedTo: "F" } } });
    expect(canSignLocally(watched, [falcon, watched])).toBe(true);
  });

  test("a rekey to an account that is not in the wallet does not help", () => {
    const watched = acct("W", { data: { "mainnet-v1.0": { rekeyedTo: "Z" } } });
    expect(canSignLocally(watched, [watched])).toBe(false);
  });

  test("a rekey cycle terminates", () => {
    const a = acct("A", { data: { n: { rekeyedTo: "B" } } });
    const b = acct("B", { data: { n: { rekeyedTo: "A" } } });
    expect(canSignLocally(a, [a, b])).toBe(false);
  });
});

test.describe("isDirectEligibleAccount", () => {
  test("WalletConnect and hidden accounts are never offered", () => {
    const wc = acct("A", { type: "wc", sk: KEY });
    const hidden = acct("B", { sk: KEY, isHidden: true });
    expect(isDirectEligibleAccount(wc, [wc, hidden])).toBe(false);
    expect(isDirectEligibleAccount(hidden, [wc, hidden])).toBe(false);
  });

  test("an account that can sign is offered", () => {
    const a = acct("A", { sk: KEY });
    expect(isDirectEligibleAccount(a, [a])).toBe(true);
  });

  test("a watch-only account is not offered", () => {
    const a = acct("A");
    expect(isDirectEligibleAccount(a, [a])).toBe(false);
  });
});

test.describe("holdsHdKey", () => {
  test("true only when the mnemonic is reachable", () => {
    const root = acct("R", { type: "hd", hdMnemonic: "w", hdRootAddr: "R" });
    const child = acct("C", { type: "hd", hdRootAddr: "R" });
    const orphan = acct("O", { type: "hd", hdRootAddr: "Z" });
    expect(holdsHdKey(root, [root, child, orphan])).toBe(true);
    expect(holdsHdKey(child, [root, child, orphan])).toBe(true);
    expect(holdsHdKey(orphan, [root, child, orphan])).toBe(false);
  });

  test("an orphan HD account rekeyed to a local key is still not an HD signer", () => {
    const local = acct("L", { sk: KEY });
    const orphan = acct("O", { type: "hd", hdRootAddr: "Z", data: { n: { rekeyedTo: "L" } } });
    expect(holdsHdKey(orphan, [local, orphan])).toBe(false);
  });

  test("not HD at all", () => {
    expect(holdsHdKey(acct("A", { sk: KEY }), [])).toBe(false);
  });
});

test.describe("canSignData (ARC-60: plain and HD keys only)", () => {
  test("plain and HD accounts", () => {
    const hd = acct("H", { type: "hd", hdMnemonic: "w", hdRootAddr: "H" });
    const plain = acct("A", { sk: KEY });
    expect(canSignData(hd, [hd])).toBe(true);
    expect(canSignData(plain, [plain])).toBe(true);
  });

  test("Ledger, Falcon-1024 and multisig accounts cannot sign data", () => {
    expect(canSignData(acct("L", { type: "ledger" }), [])).toBe(false);
    expect(canSignData(acct("F", { type: "falcon1024", falconPrivateKey: KEY }), [])).toBe(false);
    expect(canSignData(acct("M", { type: "msig", params: { addrs: ["A"] } }), [acct("A", { sk: KEY })])).toBe(false);
  });

  test("a watch-only account rekeyed to a plain key can", () => {
    const plain = acct("A", { sk: KEY });
    const watched = acct("W", { data: { n: { rekeyedTo: "A" } } });
    expect(canSignData(watched, [plain, watched])).toBe(true);
  });

  test("an account rekeyed to a Ledger cannot", () => {
    const ledger = acct("L", { type: "ledger" });
    const watched = acct("W", { data: { n: { rekeyedTo: "L" } } });
    expect(canSignData(watched, [ledger, watched])).toBe(false);
  });
});
