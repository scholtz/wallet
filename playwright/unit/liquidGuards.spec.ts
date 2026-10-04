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

  test("tolerates malformed metadata", () => {
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
