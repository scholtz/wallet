// Node-only unit tests for Biatec Direct network resolution (any chain is signed; the user is told which).
// Run via `pnpm run test:unit`.
import { test, expect } from "@playwright/test";
import {
  genesisIdConsistent,
  resolveRequestNetwork,
  toNetworkView,
} from "../../src/scripts/direct/networks";
import { DirectErrorCode } from "../../src/scripts/direct/protocol";

const MAINNET = "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";
const TESTNET = "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
const VOI = "r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=";
// Only the first 32 characters (the CAIP-2 reference) identify these; the tail is arbitrary.
const BETANET = "mFgazF-2uRS1tMiL9dsj01hJGySEmPN2AAAAAAAAAAA";
const FNET = "kUt08LxeVAAGHnh4JoAoAMM9ql_hBwSoAAAAAAAAAAA";
const ARAMID = "PgeQVJJgx_LYKJfIEz7dbfNPuXmDyJ-OAAAAAAAAAAA";
const RANDOM = "Zm9vYmFyYmF6cXV4Zm9vYmFyYmF6cXV4Zm9vYmFyYmE";

test.describe("resolveRequestNetwork", () => {
  const cases: [string, string, string, string | undefined, string][] = [
    ["mainnet", MAINNET, "mainnet-v1.0", "Algo", "main"],
    ["testnet", TESTNET, "testnet-v1.0", "Algo", "test"],
    ["betanet", BETANET, "betanet-v1.0", "Algo", "test"],
    ["fnet", FNET, "fnet-v1", "Algo", "test"],
    ["voi", VOI, "voimain-v1.0", "VOI", "main"],
    ["aramid", ARAMID, "aramidmain-v1.0", undefined, "main"],
  ];
  for (const [label, hash, env, token, kind] of cases) {
    test(`${label} is recognised`, () => {
      const result = resolveRequestNetwork(hash);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.network.env).toBe(env);
      expect(result.network.token).toBe(token);
      expect(result.network.kind).toBe(kind);
      expect(result.network.genesisHash).toHaveLength(43);
      expect(result.network.name).not.toBe("Unknown network");
    });
  }

  test("display names", () => {
    const name = (hash: string) => {
      const r = resolveRequestNetwork(hash);
      return r.ok ? r.network.name : "";
    };
    expect(name(MAINNET)).toBe("Algorand Mainnet");
    expect(name(TESTNET)).toBe("Algorand Testnet");
    expect(name(BETANET)).toBe("Algorand Betanet");
    expect(name(FNET)).toBe("Algorand Fnet");
    expect(name(VOI)).toBe("Voi Mainnet");
    expect(name(ARAMID)).toBe("Aramid Mainnet");
  });

  test("padded and unpadded / base64 and base64url spellings resolve to the same network", () => {
    const a = resolveRequestNetwork(MAINNET);
    const b = resolveRequestNetwork("wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8");
    expect(a).toEqual(b);
  });

  test("any other well-formed hash is an unknown network", () => {
    const result = resolveRequestNetwork(RANDOM);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.network).toEqual({
      genesisHash: RANDOM,
      name: "Unknown network",
      kind: "unknown",
    });
  });

  test("malformed hashes are refused with 4200", () => {
    for (const bad of [undefined, null, 5, "", "short", "!".repeat(44), "A".repeat(45), "A".repeat(42), {}]) {
      const result = resolveRequestNetwork(bad);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.code).toBe(DirectErrorCode.invalidInput);
    }
  });
});

test.describe("genesisIdConsistent", () => {
  test("a known network only accepts its own genesis ID (or none)", () => {
    expect(genesisIdConsistent({ env: "testnet-v1.0" }, "testnet-v1.0")).toBe(true);
    expect(genesisIdConsistent({ env: "testnet-v1.0" }, "mainnet-v1.0")).toBe(false);
    expect(genesisIdConsistent({ env: "testnet-v1.0" }, "")).toBe(true);
    expect(genesisIdConsistent({ env: "testnet-v1.0" }, undefined)).toBe(true);
  });

  test("an unknown network accepts any genesis ID", () => {
    expect(genesisIdConsistent({}, "my-private-net-v1")).toBe(true);
    expect(genesisIdConsistent({}, "mainnet-v1.0")).toBe(true);
  });
});

test("toNetworkView: matchesWalletEnv only for a known network equal to the wallet's env", () => {
  const testnet = resolveRequestNetwork(TESTNET);
  const unknown = resolveRequestNetwork(RANDOM);
  if (!testnet.ok || !unknown.ok) throw new Error("unreachable");
  expect(toNetworkView(testnet.network, "testnet-v1.0").matchesWalletEnv).toBe(true);
  expect(toNetworkView(testnet.network, "mainnet-v1.0").matchesWalletEnv).toBe(false);
  expect(toNetworkView(testnet.network, "custom").matchesWalletEnv).toBe(false);
  expect(toNetworkView(unknown.network, "mainnet-v1.0").matchesWalletEnv).toBe(false);
});
