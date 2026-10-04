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

  test("accepts a host on the wallet's own registrable domain", () => {
    expect(() => assertLiquidServiceOrigin("https://liquid.example.org", "wallet.example.org")).not.toThrow();
  });

  test("rejects an arbitrary host (phishing link)", () => {
    expect(() => assertLiquidServiceOrigin("https://evil.example", WALLET)).toThrow(/untrusted/);
    expect(() => assertLiquidServiceOrigin("https://liquid.biatec.io.evil.example", WALLET)).toThrow();
  });

  test("rejects http, ports, credentials, IPs", () => {
    expect(() => assertLiquidServiceOrigin("http://liquid.biatec.io", WALLET)).toThrow();
    expect(() => assertLiquidServiceOrigin("https://liquid.biatec.io:8443", WALLET)).toThrow();
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

  test("rejects a short payload that starts with a signing prefix", () => {
    const bytes = new Uint8Array(32).fill(1);
    bytes.set(new TextEncoder().encode("MX"), 0);
    expect(() => assertLiquidChallenge(bytes)).toThrow(/signing payload/);
    const program = new Uint8Array(32).fill(1);
    program.set(new TextEncoder().encode("Program"), 0);
    expect(() => assertLiquidChallenge(program)).toThrow();
  });

  test("rejects too short and too long challenges", () => {
    expect(() => assertLiquidChallenge(new Uint8Array(4))).toThrow();
    expect(() => assertLiquidChallenge(new Uint8Array(65).fill(9))).toThrow();
  });
});

test.describe("findUnauthorizedSenders", () => {
  test("flags senders outside the approved accounts", () => {
    expect(
      findUnauthorizedSenders([{ sender: "A" }, { sender: "B" }], ["A"]),
    ).toEqual([1]);
  });

  test("ignores group members the wallet must not sign", () => {
    expect(
      findUnauthorizedSenders([{ sender: "A" }, { sender: "OTHER", signers: [] }], ["A"]),
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
