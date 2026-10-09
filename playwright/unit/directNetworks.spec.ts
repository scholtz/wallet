// Node-only unit tests for Biatec Direct network resolution (any chain is signed; the user is told which).
// Run via `pnpm run test:unit`.
import { test, expect } from "@playwright/test";
import {
  KNOWN_NETWORKS,
  genesisIdConsistent,
  resolveRequestNetwork,
  signingEnvOf,
  toNetworkView,
} from "../../src/scripts/direct/networks";
import { pickSigningEnv } from "../../src/scripts/signingEnv";
import { DirectErrorCode } from "../../src/scripts/direct/protocol";

const MAINNET = "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";
const TESTNET = "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
const VOI = "r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=";
// Full hashes as published by @txnlab/use-wallet and biatec-wallet-use-wallet-client.
const BETANET = "mFgazF-2uRS1tMiL9dsj01hJGySEmPN2OvOTQHJ6iQg=";
const FNET = "kUt08LxeVAAGHnh4JoAoAMM9ql_hBwSoRrQQKWSVgxk=";
const ARAMID = "PgeQVJJgx/LYKJfIEz7dbfNPuXmDyJ+O7FwQ4XL9tE8=";
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

test.describe("known networks are matched on the FULL hash only", () => {
  const CAIP: Record<string, string> = {
    "mainnet-v1.0": "wGHE2Pwdvd7S12BL5FaOP20EGYesN73k",
    "testnet-v1.0": "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe",
    "betanet-v1.0": "mFgazF-2uRS1tMiL9dsj01hJGySEmPN2",
    "fnet-v1": "kUt08LxeVAAGHnh4JoAoAMM9ql_hBwSo",
    "voimain-v1.0": "r20fSQI8gWe_kFZziNonSPCXLwcQmH_n",
    "aramidmain-v1.0": "PgeQVJJgx_LYKJfIEz7dbfNPuXmDyJ-O",
  };
  const normalize = (h: string) => h.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

  test("each stored hash starts with its published CAIP-2 reference (catches typos)", () => {
    expect(Object.keys(KNOWN_NETWORKS).sort()).toEqual(Object.keys(CAIP).sort());
    for (const [env, known] of Object.entries(KNOWN_NETWORKS)) {
      expect(normalize(known.hash)).toHaveLength(43);
      expect(normalize(known.hash).slice(0, 32)).toBe(CAIP[env]);
    }
  });

  test("a hash with a known prefix but a different tail is UNKNOWN", () => {
    for (const known of Object.values(KNOWN_NETWORKS)) {
      const full = normalize(known.hash);
      const spoofed = full.slice(0, 32) + (full.endsWith("AAAAAAAAAAA") ? "BBBBBBBBBBB" : "AAAAAAAAAAA");
      const result = resolveRequestNetwork(spoofed);
      expect(result.ok && result.network.kind).toBe("unknown");
      expect(result.ok && result.network.env).toBeUndefined();
      expect(result.ok && result.network.name).toBe("Unknown network");
    }
    // 24 bytes of mainnet + 8 junk bytes (the realistic attack).
    const mainnetBytes = Buffer.from(MAINNET, "base64");
    const spoof = Buffer.concat([mainnetBytes.subarray(0, 24), Buffer.alloc(8, 7)]).toString("base64");
    const result = resolveRequestNetwork(spoof);
    expect(result.ok && result.network.kind).toBe("unknown");
  });

  test("padded / unpadded and base64 / base64url spellings of a known hash are the same known network", () => {
    for (const [env, known] of Object.entries(KNOWN_NETWORKS)) {
      const b64 = Buffer.from(known.hash.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("base64");
      const variants = [b64, b64.replace(/=+$/, ""), normalize(b64), normalize(b64) + "="];
      for (const v of variants) {
        const result = resolveRequestNetwork(v);
        expect(result.ok && result.network.env, `${env} ${v}`).toBe(env);
      }
    }
  });
});

test.describe("genesisIdConsistent (unknown networks)", () => {
  test("an unknown network may not carry the genesis ID of a known one", () => {
    expect(genesisIdConsistent({}, "mainnet-v1.0")).toBe(false);
    expect(genesisIdConsistent({}, "voimain-v1.0")).toBe(false);
    expect(genesisIdConsistent({}, "my-private-net-v1")).toBe(true);
    expect(genesisIdConsistent({}, "constructor")).toBe(true);
    expect(genesisIdConsistent({}, "")).toBe(true);
  });
});

test.describe("signing environment", () => {
  test("signingEnvOf: known env id, or the genesis hash of an unknown network", () => {
    expect(signingEnvOf({ env: "testnet-v1.0", genesisHash: "x" })).toBe("testnet-v1.0");
    expect(signingEnvOf({ genesisHash: RANDOM })).toBe(RANDOM);
  });

  test("the verified network wins over the transaction's genesis ID and the wallet's env", () => {
    expect(pickSigningEnv({ verifiedEnv: "testnet-v1.0", txGenesisId: "mainnet-v1.0", walletEnv: "mainnet-v1.0" })).toBe("testnet-v1.0");
    // A transaction without genesis ID on testnet, wallet on mainnet: still testnet.
    expect(pickSigningEnv({ verifiedEnv: "testnet-v1.0", walletEnv: "mainnet-v1.0" })).toBe("testnet-v1.0");
  });

  test("without a verified network: the transaction's genesis ID, then the wallet's env", () => {
    expect(pickSigningEnv({ txGenesisId: "testnet-v1.0", walletEnv: "mainnet-v1.0" })).toBe("testnet-v1.0");
    expect(pickSigningEnv({ walletEnv: "mainnet-v1.0" })).toBe("mainnet-v1.0");
    expect(pickSigningEnv({ txGenesisId: "", walletEnv: "" })).toBeUndefined();
  });
});

test.describe("genesisIdConsistent", () => {
  test("a known network only accepts its own genesis ID (or none)", () => {
    expect(genesisIdConsistent({ env: "testnet-v1.0" }, "testnet-v1.0")).toBe(true);
    expect(genesisIdConsistent({ env: "testnet-v1.0" }, "mainnet-v1.0")).toBe(false);
    expect(genesisIdConsistent({ env: "testnet-v1.0" }, "")).toBe(true);
    expect(genesisIdConsistent({ env: "testnet-v1.0" }, undefined)).toBe(true);
  });

  test("an unknown network accepts a custom genesis ID", () => {
    expect(genesisIdConsistent({}, "my-private-net-v1")).toBe(true);
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
