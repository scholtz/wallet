// Node-only unit tests for the Biatec Direct (popup + postMessage) protocol guards.
// Run via `pnpm run test:unit`.
import { test, expect } from "@playwright/test";
import {
  DIRECT_ACCEPT_WINDOW_MS,
  DirectErrorCode,
  DirectRequestGate,
  directUnsupportedReason,
  checkRequestNetwork,
  expectedGenesisReference,
  isDevelopmentOrigin,
  isWellKnownNetwork,
  normalizeGenesisHash,
  parseDappOrigin,
  parseOriginHint,
  parseRequestEnvelope,
  responseReference,
  txnGenesisMatches,
} from "../../src/scripts/direct/protocol";

const MAINNET_HASH_B64 = "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";
const TESTNET_PREFIX = "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe";
const TESTNET_HASH_B64 = "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

test.describe("parseDappOrigin", () => {
  test("accepts https origins and loopback http origins", () => {
    expect(parseDappOrigin("https://dapp.example.com")).toBe("https://dapp.example.com");
    expect(parseDappOrigin("https://dapp.example.com:8443")).toBe("https://dapp.example.com:8443");
    expect(parseDappOrigin("http://localhost:5173")).toBe("http://localhost:5173");
    expect(parseDappOrigin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
  });

  test("rejects plain http on a public host, other schemes and the opaque origin", () => {
    expect(parseDappOrigin("http://dapp.example.com")).toBeUndefined();
    expect(parseDappOrigin("javascript:alert(1)")).toBeUndefined();
    expect(parseDappOrigin("data:text/html,x")).toBeUndefined();
    expect(parseDappOrigin("file:///etc/passwd")).toBeUndefined();
    expect(parseDappOrigin("null")).toBeUndefined();
  });

  test("rejects anything that is not already in canonical origin form", () => {
    expect(parseDappOrigin("https://dapp.example.com/")).toBeUndefined();
    expect(parseDappOrigin("https://dapp.example.com/path")).toBeUndefined();
    expect(parseDappOrigin("https://dapp.example.com?x=1")).toBeUndefined();
    expect(parseDappOrigin("https://user:pw@dapp.example.com")).toBeUndefined();
    expect(parseDappOrigin("HTTPS://DAPP.EXAMPLE.COM")).toBeUndefined();
    expect(parseDappOrigin("https://localhost.evil.com@attacker.com")).toBeUndefined();
  });

  test("rejects a trailing-dot hostname (a lookalike of the dotless origin)", () => {
    expect(parseDappOrigin("https://example.com.")).toBeUndefined();
    expect(parseDappOrigin("http://localhost.:5173")).toBeUndefined();
  });

  test("rejects non-strings and absurd lengths", () => {
    expect(parseDappOrigin(undefined)).toBeUndefined();
    expect(parseDappOrigin(42)).toBeUndefined();
    expect(parseDappOrigin("")).toBeUndefined();
    expect(parseDappOrigin("https://" + "a".repeat(3000) + ".com")).toBeUndefined();
  });

  test("a lookalike of a loopback host is not loopback", () => {
    expect(parseDappOrigin("http://localhost.evil.com")).toBeUndefined();
    expect(parseDappOrigin("http://127.0.0.1.evil.com")).toBeUndefined();
  });
});

test("isWellKnownNetwork: built-in networks never need the remote genesis list", () => {
  expect(isWellKnownNetwork("mainnet-v1.0")).toBe(true);
  expect(isWellKnownNetwork("testnet-v1.0")).toBe(true);
  expect(isWellKnownNetwork("privnet-v1")).toBe(false);
  expect(isWellKnownNetwork("constructor")).toBe(false);
  expect(isWellKnownNetwork("__proto__")).toBe(false);
});

test("isDevelopmentOrigin flags loopback origins only", () => {
  expect(isDevelopmentOrigin("http://localhost:5173")).toBe(true);
  expect(isDevelopmentOrigin("http://127.0.0.1:5173")).toBe(true);
  expect(isDevelopmentOrigin("https://dapp.example.com")).toBe(false);
});

test("parseOriginHint reads and validates the ?origin= query parameter", () => {
  expect(parseOriginHint("?origin=" + encodeURIComponent("https://dapp.example.com"))).toBe(
    "https://dapp.example.com",
  );
  expect(parseOriginHint("")).toBeUndefined();
  expect(parseOriginHint("?origin=" + encodeURIComponent("https://dapp.example.com/x"))).toBeUndefined();
  expect(parseOriginHint("?origin=" + encodeURIComponent("http://evil.com"))).toBeUndefined();
});

test.describe("parseRequestEnvelope", () => {
  test("accepts a well-formed envelope", () => {
    expect(
      parseRequestEnvelope({ id: "1", reference: "arc0027:enable:request", params: { a: 1 } }),
    ).toEqual({ id: "1", reference: "arc0027:enable:request", params: { a: 1 } });
  });

  test("rejects malformed envelopes", () => {
    for (const bad of [
      null,
      undefined,
      "str",
      42,
      [],
      {},
      { id: "", reference: "x", params: {} },
      { id: 1, reference: "x", params: {} },
      { id: "a".repeat(129), reference: "x", params: {} },
      { id: "1", reference: 7, params: {} },
      { id: "1", reference: "x".repeat(129), params: {} },
      { id: "1", reference: "x", params: null },
      { id: "1", reference: "x", params: [] },
      { id: "1", reference: "x" },
    ]) {
      expect(parseRequestEnvelope(bad)).toBeUndefined();
    }
  });
});

test("responseReference maps request to response", () => {
  expect(responseReference("arc0027:sign_transactions:request")).toBe(
    "arc0027:sign_transactions:response",
  );
});

test.describe("DirectRequestGate", () => {
  const ORIGIN = "https://dapp.example.com";

  test("admits exactly one request from the right origin and opener", () => {
    const gate = new DirectRequestGate(ORIGIN);
    gate.markReady(1000);
    expect(gate.admit({ origin: ORIGIN, fromOpener: true, now: 1500 })).toEqual({ ok: true });
    const second = gate.admit({ origin: ORIGIN, fromOpener: true, now: 1600 });
    expect(second.ok).toBe(false);
    expect(second.ok === false && second.silent).toBe(false);
  });

  test("ignores silently a sender with the wrong origin or not the opener", () => {
    const gate = new DirectRequestGate(ORIGIN);
    gate.markReady(0);
    const wrongOrigin = gate.admit({ origin: "https://evil.example", fromOpener: true, now: 1 });
    const notOpener = gate.admit({ origin: ORIGIN, fromOpener: false, now: 1 });
    expect(wrongOrigin.ok === false && wrongOrigin.silent).toBe(true);
    expect(notOpener.ok === false && notOpener.silent).toBe(true);
    // ...and those attempts did not consume the single request.
    expect(gate.admit({ origin: ORIGIN, fromOpener: true, now: 2 })).toEqual({ ok: true });
  });

  test("refuses before ready and after the accept window", () => {
    const gate = new DirectRequestGate(ORIGIN);
    expect(gate.admit({ origin: ORIGIN, fromOpener: true, now: 0 }).ok).toBe(false);
    gate.markReady(0);
    const late = gate.admit({
      origin: ORIGIN,
      fromOpener: true,
      now: DIRECT_ACCEPT_WINDOW_MS + 1,
    });
    expect(late.ok).toBe(false);
    expect(
      new DirectRequestGate(ORIGIN, 10).admit({ origin: ORIGIN, fromOpener: true, now: 5 }).ok,
    ).toBe(false);
  });

  test("the window boundary is inclusive", () => {
    const gate = new DirectRequestGate(ORIGIN);
    gate.markReady(0);
    expect(
      gate.admit({ origin: ORIGIN, fromOpener: true, now: DIRECT_ACCEPT_WINDOW_MS }).ok,
    ).toBe(true);
  });
});

test.describe("genesis hash handling", () => {
  test("normalizeGenesisHash accepts base64 and base64url, with or without padding", () => {
    const normalized = normalizeGenesisHash(MAINNET_HASH_B64);
    expect(normalized).toBe("wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8");
    expect(normalizeGenesisHash("wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8")).toBe(normalized);
    expect(normalizeGenesisHash("r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=")).toBe(
      "r20fSQI8gWe_kFZziNonSPCXLwcQmH_nxROvnnueWOk",
    );
  });

  test("normalizeGenesisHash rejects malformed values", () => {
    for (const bad of [undefined, 5, "", "short", "!".repeat(44), "A".repeat(45), "A".repeat(42)]) {
      expect(normalizeGenesisHash(bad)).toBeUndefined();
    }
  });

  test("txnGenesisMatches compares the 32 raw bytes with the request hash", () => {
    const bytes = new Uint8Array(Buffer.from(MAINNET_HASH_B64, "base64"));
    const normalized = normalizeGenesisHash(MAINNET_HASH_B64)!;
    expect(txnGenesisMatches(bytes, normalized)).toBe(true);
    const other = bytes.slice();
    other[5] ^= 1;
    expect(txnGenesisMatches(other, normalized)).toBe(false);
    expect(txnGenesisMatches(undefined, normalized)).toBe(false);
    expect(txnGenesisMatches(bytes.slice(0, 16), normalized)).toBe(false);
  });

  test("expectedGenesisReference: built-in table wins, the remote list only covers unknown networks", () => {
    const poisoned = [
      { network: "mainnet-v1.0", CAIP10: "algorand:ATTACKERCONTROLLED" },
      { network: "privnet-v1", CAIP10: "algorand:PRIVNETREFERENCE" },
    ];
    // A poisoned public list cannot weaken the binding of a well-known network.
    expect(expectedGenesisReference("mainnet-v1.0", poisoned)).toBe("wGHE2Pwdvd7S12BL5FaOP20EGYesN73k");
    expect(expectedGenesisReference("testnet-v1.0", poisoned)).toBe(TESTNET_PREFIX);
    expect(expectedGenesisReference("privnet-v1", poisoned)).toBe("PRIVNETREFERENCE");
    expect(expectedGenesisReference("unknown-net", poisoned)).toBeUndefined();
  });

  test("a poisoned genesis list cannot make a foreign hash pass for mainnet", () => {
    const result = checkRequestNetwork({
      requestGenesisHash: TESTNET_HASH_B64,
      env: "mainnet-v1.0",
      genesisList: [{ network: "mainnet-v1.0", CAIP10: "algorand:" + TESTNET_PREFIX }],
    });
    expect(result.ok).toBe(false);
  });

  test("checkRequestNetwork binds the request to the active network", () => {
    const normalized = normalizeGenesisHash(MAINNET_HASH_B64)!;
    expect(
      checkRequestNetwork({ requestGenesisHash: MAINNET_HASH_B64, env: "mainnet-v1.0", genesisList: [] }),
    ).toEqual({ ok: true, normalized });
    const mismatch = checkRequestNetwork({
      requestGenesisHash: MAINNET_HASH_B64,
      env: "testnet-v1.0",
      genesisList: [],
    });
    expect(mismatch.ok).toBe(false);
    expect(!mismatch.ok && mismatch.code).toBe(DirectErrorCode.networkNotSupported);
    const invalid = checkRequestNetwork({ requestGenesisHash: "nope", env: "mainnet-v1.0", genesisList: [] });
    expect(!invalid.ok && invalid.code).toBe(DirectErrorCode.invalidInput);
  });

  test("an unknown network fails closed, a custom node does not block", () => {
    const unknown = checkRequestNetwork({
      requestGenesisHash: MAINNET_HASH_B64,
      env: "some-private-net",
      genesisList: [],
    });
    expect(unknown.ok).toBe(false);
    expect(
      checkRequestNetwork({ requestGenesisHash: MAINNET_HASH_B64, env: "custom", genesisList: [] }).ok,
    ).toBe(true);
  });
});

test.describe("directUnsupportedReason (what the compact popup can fully show)", () => {
  test("allows payments, asset transfers and calls to existing apps", () => {
    expect(directUnsupportedReason({ type: "pay" })).toBeUndefined();
    expect(directUnsupportedReason({ type: "axfer" })).toBeUndefined();
    expect(
      directUnsupportedReason({ type: "appl", applicationCall: { appIndex: 1234n } }),
    ).toBeUndefined();
    expect(
      directUnsupportedReason({
        type: "appl",
        applicationCall: { appIndex: 5, approvalProgram: new Uint8Array(0), clearProgram: new Uint8Array(0) },
      }),
    ).toBeUndefined();
  });

  test("refuses types whose security-relevant fields are not shown", () => {
    for (const type of ["acfg", "afrz", "keyreg", "stpf", "hb", "unknown", undefined]) {
      expect(directUnsupportedReason({ type })).toMatch(/not supported/);
    }
  });

  test("refuses app creation and program updates", () => {
    expect(directUnsupportedReason({ type: "appl", applicationCall: { appIndex: 0n } })).toMatch(/Creating/);
    expect(directUnsupportedReason({ type: "appl" })).toMatch(/Creating/);
    expect(
      directUnsupportedReason({
        type: "appl",
        applicationCall: { appIndex: 7n, approvalProgram: new Uint8Array([1, 2, 3]) },
      }),
    ).toMatch(/Updating/);
    expect(
      directUnsupportedReason({
        type: "appl",
        applicationCall: { appIndex: 7n, clearProgram: new Uint8Array([1]) },
      }),
    ).toMatch(/Updating/);
  });

  test("a hostile type string is truncated in the message", () => {
    expect(directUnsupportedReason({ type: "x".repeat(500) })!.length).toBeLessThan(120);
  });
});
