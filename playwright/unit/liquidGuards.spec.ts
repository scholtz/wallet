// Node-only unit tests for the Liquid Auth input guards (AW-2026-049/050/051/052/057).
// Run via `pnpm run test:unit`.
import { test, expect } from "@playwright/test";
import {
  assertLiquidChallenge,
  assertLiquidServiceOrigin,
  findUnauthorizedSenders,
  sanitizePeerMetadata,
} from "../../src/scripts/liquid/guards";

const WALLET = "wallet.biatec.io";

test.describe("assertLiquidServiceOrigin", () => {
  test("accepts the trusted Biatec services", () => {
    expect(() => assertLiquidServiceOrigin("https://liquid.biatec.io", WALLET)).not.toThrow();
    expect(() => assertLiquidServiceOrigin("https://stage.liquid.biatec.io", "x.example")).not.toThrow();
  });

  test("accepts a subdomain of the wallet's own host and explicitly configured hosts", () => {
    expect(() => assertLiquidServiceOrigin("https://liquid.wallet.example.org", "wallet.example.org")).not.toThrow();
    expect(() => assertLiquidServiceOrigin("https://liquid.example.org", "wallet.example.org", [" Liquid.Example.org "])).not.toThrow();
  });

  test("sibling hosts are not trusted unless configured (shared hosting)", () => {
    expect(() => assertLiquidServiceOrigin("https://evil.github.io", "scholtz.github.io")).toThrow();
    expect(() => assertLiquidServiceOrigin("https://evil.vercel.app", "wallet.vercel.app")).toThrow();
    expect(() => assertLiquidServiceOrigin("https://liquid.example.org", "wallet.example.org")).toThrow();
  });

  test("rejects an arbitrary host (phishing link)", () => {
    expect(() => assertLiquidServiceOrigin("https://evil.example", WALLET)).toThrow(/untrusted/);
    expect(() => assertLiquidServiceOrigin("https://liquid.biatec.io.evil.example", WALLET)).toThrow();
  });

  test("rejects http, ports, credentials, IPs", () => {
    expect(() => assertLiquidServiceOrigin("http://liquid.biatec.io", WALLET)).toThrow();
    expect(() => assertLiquidServiceOrigin("https://liquid.biatec.io:8443", WALLET)).toThrow();
    expect(() => assertLiquidServiceOrigin("https://localhost:3000", "localhost")).not.toThrow();
    expect(() => assertLiquidServiceOrigin("https://localhost:3000", "127.0.0.1")).not.toThrow();
    expect(() => assertLiquidServiceOrigin("https://127.0.0.1:3000", "127.0.0.1")).toThrow();
    expect(() => assertLiquidServiceOrigin("https://[::1]:3000", "localhost")).toThrow();
    expect(() => assertLiquidServiceOrigin("https://user:pw@liquid.biatec.io", WALLET)).toThrow();
    expect(() => assertLiquidServiceOrigin("https://10.0.0.5", WALLET)).toThrow();
  });

  test("localhost is only accepted when the wallet itself runs on localhost", () => {
    expect(() => assertLiquidServiceOrigin("https://liquid.localhost", "wallet.localhost")).not.toThrow();
    expect(() => assertLiquidServiceOrigin("https://liquid.localhost", WALLET)).toThrow();
  });
});

test.describe("assertLiquidChallenge", () => {
  test("accepts a random 32-byte nonce", () => {
    const nonce = new Uint8Array(32).fill(7);
    expect(() => assertLiquidChallenge(nonce)).not.toThrow();
  });

  test("rejects a transaction-sized payload with the TX prefix", () => {
    const tx = new Uint8Array(180);
    tx.set(new TextEncoder().encode("TX"), 0);
    expect(() => assertLiquidChallenge(tx)).toThrow();
  });

  test("rejects a short LogicSig-style payload that starts with a signing prefix", () => {
    for (const prefix of ["Program", "ProgData", "appID"]) {
      const bytes = new Uint8Array(32).fill(1);
      bytes.set(new TextEncoder().encode(prefix), 0);
      expect(() => assertLiquidChallenge(bytes)).toThrow(/signing payload/);
    }
  });

  test("does not reject a random nonce that merely starts with TX", () => {
    const nonce = new Uint8Array(32).fill(1);
    nonce.set(new TextEncoder().encode("TX"), 0);
    expect(() => assertLiquidChallenge(nonce)).not.toThrow();
  });

  test("rejects a 64-byte payload that could be an ARC-60 digest", () => {
    expect(() => assertLiquidChallenge(new Uint8Array(64).fill(3))).toThrow();
  });

  test("rejects too short and too long challenges", () => {
    expect(() => assertLiquidChallenge(new Uint8Array(4))).toThrow();
    expect(() => assertLiquidChallenge(new Uint8Array(49).fill(9))).toThrow();
  });
});

test.describe("findUnauthorizedSenders", () => {
  test("flags senders outside the approved accounts", () => {
    expect(
      findUnauthorizedSenders([{ sender: "A" }, { sender: "B" }], ["A"]),
    ).toEqual([1]);
  });

  test("ignores group members of foreign accounts the wallet must not sign", () => {
    expect(
      findUnauthorizedSenders([{ sender: "A" }, { sender: "OTHER", signers: [] }], ["A"]),
    ).toEqual([]);
  });

  test("signers: [] does not exempt an unapproved account of this wallet", () => {
    expect(
      findUnauthorizedSenders(
        [{ sender: "B", signers: [] }],
        ["A"],
        ["A", "B"],
      ),
    ).toEqual([0]);
  });

  test("ignores already-signed co-signer transactions", () => {
    expect(
      findUnauthorizedSenders([{ sender: "A" }, { sender: "OTHER", preSigned: true }], ["A"]),
    ).toEqual([]);
  });

  test("a pre-signed envelope does not exempt an unapproved account of this wallet", () => {
    expect(
      findUnauthorizedSenders([{ sender: "B", preSigned: true }], ["A"], ["A", "B"]),
    ).toEqual([0]);
  });

  test("a missing sender is unauthorized", () => {
    expect(findUnauthorizedSenders([{}], ["A"])).toEqual([0]);
  });
});

test.describe("sanitizePeerMetadata", () => {
  test("caps field length and keeps only https icons", () => {
    const peer = sanitizePeerMetadata({
      name: "n".repeat(2000),
      description: "d",
      url: "https://dapp.example",
      icons: ["http://insecure/x.png", "https://ok/x.png", "javascript:alert(1)"],
    });
    expect(peer.name.length).toBe(512);
    expect(peer.icons).toEqual(["https://ok/x.png"]);
  });

  test("keeps only an https app url", () => {
    const base = { name: "n", description: "d", icons: [] as string[] };
    expect(sanitizePeerMetadata({ ...base, url: "https://dapp.example" }).url).toBe("https://dapp.example");
    expect(sanitizePeerMetadata({ ...base, url: "javascript:alert(1)" }).url).toBe("");
    expect(sanitizePeerMetadata({ ...base, url: "http://dapp.example" }).url).toBe("");
  });

  test("drops over-long icon urls instead of truncating them", () => {
    const peer = sanitizePeerMetadata({
      name: "n",
      description: "d",
      url: "https://dapp.example",
      icons: ["https://x/" + "a".repeat(600), "https://ok/x.png"],
    });
    expect(peer.icons).toEqual(["https://ok/x.png"]);
  });

  test("tolerates malformed metadata", () => {
    // unknown cast: deliberately feeds the wrong types a hostile peer could send.
    const peer = sanitizePeerMetadata({
      name: 5,
      description: null,
      url: undefined,
      icons: "not-an-array",
    } as unknown as Parameters<typeof sanitizePeerMetadata>[0]);
    expect(peer.icons).toEqual([]);
    expect(peer.name).toBe("");
  });
});

import {
  REQUEST_ERROR,
  admitEnvelope,
  admitSignData,
  admitTransactions,
  MAX_DAPP_PENDING_PER_SESSION,
  MAX_DAPP_PENDING_REQUESTS,
  MAX_DAPP_TXNS_PER_REQUEST,
} from "../../src/scripts/liquid/guards";

const envelope = (over: Partial<Parameters<typeof admitEnvelope>[0]> = {}) =>
  admitEnvelope({
    count: 1,
    maxCount: MAX_DAPP_TXNS_PER_REQUEST,
    pendingTotal: 0,
    pendingForSession: 0,
    idInUse: false,
    ...over,
  });

test.describe("admitEnvelope", () => {
  test("admits a normal request", () => {
    expect(envelope().ok).toBe(true);
  });

  test("a duplicate id is dropped silently (an answer would reuse the pending id)", () => {
    const result = envelope({ idInUse: true });
    expect(result).toMatchObject({ ok: false, silent: true });
  });

  test("rejects empty and oversized requests as invalid input", () => {
    for (const count of [0, MAX_DAPP_TXNS_PER_REQUEST + 1]) {
      expect(envelope({ count })).toMatchObject({ ok: false, code: REQUEST_ERROR.invalid });
    }
  });

  test("rejects when the transport or one session is full, with the limit code", () => {
    expect(envelope({ pendingTotal: MAX_DAPP_PENDING_REQUESTS })).toMatchObject({
      ok: false,
      code: REQUEST_ERROR.limit,
    });
    expect(envelope({ pendingForSession: MAX_DAPP_PENDING_PER_SESSION })).toMatchObject({
      ok: false,
      code: REQUEST_ERROR.limit,
    });
    expect(envelope({ pendingTotal: MAX_DAPP_PENDING_REQUESTS - 1 }).ok).toBe(true);
  });
});

test.describe("admitTransactions", () => {
  test("rejects an unapproved sender with the unauthorized code", () => {
    expect(
      admitTransactions({ transactions: [{ sender: "B" }], approved: ["A"], own: ["A", "B"] }),
    ).toMatchObject({ ok: false, code: REQUEST_ERROR.unauthorized });
  });

  test("admits approved senders and foreign co-signer transactions", () => {
    expect(
      admitTransactions({
        transactions: [{ sender: "A" }, { sender: "X", signers: [] }, { sender: "Y", preSigned: true }],
        approved: ["A"],
        own: ["A", "B"],
      }).ok,
    ).toBe(true);
  });
});

test.describe("admitSignData", () => {
  test("rejects when decoding dropped items or produced none", () => {
    expect(admitSignData({ rawCount: 2, signers: ["A"], approved: ["A"] })).toMatchObject({
      ok: false,
      code: REQUEST_ERROR.invalid,
    });
    expect(admitSignData({ rawCount: 1, signers: [], approved: ["A"] })).toMatchObject({
      ok: false,
      code: REQUEST_ERROR.invalid,
    });
  });

  test("rejects a signer that is not approved, admits approved ones", () => {
    expect(admitSignData({ rawCount: 1, signers: ["B"], approved: ["A"] })).toMatchObject({
      ok: false,
      code: REQUEST_ERROR.unauthorized,
    });
    expect(admitSignData({ rawCount: 1, signers: ["A"], approved: ["A"] }).ok).toBe(true);
  });
});
