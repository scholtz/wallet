/**
 * Networks seen by Biatec Direct (pure logic, no runtime imports beyond the protocol module, so
 * it is unit-testable under Node).
 *
 * The popup signs for ANY chain the dApp uses: it does not compare the request with the network
 * selected in the wallet. What it does instead is to work out which network the request names,
 * show it to the user on every request, and say so when it does not recognise it.
 */
import { DirectErrorCode, normalizeGenesisHash } from "./protocol";

export type DirectNetworkKind = "main" | "test" | "unknown";

export interface DirectNetwork {
  /** Normalized genesis hash (43 base64url chars, no padding). */
  genesisHash: string;
  /** Wallet environment / genesis ID of a known network (e.g. `testnet-v1.0`). */
  env?: string;
  name: string;
  /** Native token symbol when known (`Algo`, `VOI`). */
  token?: string;
  kind: DirectNetworkKind;
}

/** The network as shown in the popup. */
export interface DirectNetworkView extends DirectNetwork {
  /** True when the request is on the network currently selected in the wallet. */
  matchesWalletEnv: boolean;
}

interface KnownNetwork {
  /**
   * The FULL genesis hash (base64 or base64url, as published). Only an exact match of all 32
   * bytes makes a network "known": a dApp supplies the whole hash, so matching just a prefix
   * (the CAIP-2 reference) would let it impersonate a known network.
   */
  hash: string;
  name: string;
  token?: string;
  kind: Exclude<DirectNetworkKind, "unknown">;
}

/**
 * Built-in table of well-known networks, keyed by wallet environment id (= genesis ID).
 * Hashes: @txnlab/use-wallet default network configs (mainnet, testnet, betanet, fnet) and
 * BIATEC_EXTRA_NETWORKS of biatec-wallet-use-wallet-client (voimain, aramidmain).
 */
export const KNOWN_NETWORKS: Record<string, KnownNetwork> = {
  "mainnet-v1.0": {
    hash: "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
    name: "Algorand Mainnet",
    token: "Algo",
    kind: "main",
  },
  "testnet-v1.0": {
    hash: "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
    name: "Algorand Testnet",
    token: "Algo",
    kind: "test",
  },
  "betanet-v1.0": {
    hash: "mFgazF-2uRS1tMiL9dsj01hJGySEmPN2OvOTQHJ6iQg=",
    name: "Algorand Betanet",
    token: "Algo",
    kind: "test",
  },
  "fnet-v1": {
    hash: "kUt08LxeVAAGHnh4JoAoAMM9ql_hBwSoRrQQKWSVgxk=",
    name: "Algorand Fnet",
    token: "Algo",
    kind: "test",
  },
  "voimain-v1.0": {
    hash: "r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=",
    name: "Voi Mainnet",
    token: "VOI",
    kind: "main",
  },
  "aramidmain-v1.0": {
    hash: "PgeQVJJgx/LYKJfIEz7dbfNPuXmDyJ+O7FwQ4XL9tE8=",
    name: "Aramid Mainnet",
    kind: "main",
  },
};

const hasOwn = (object: object, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key);

/** True when `genesisId` is the env id of a network in the built-in table. */
export const isKnownEnvId = (genesisId: string): boolean =>
  hasOwn(KNOWN_NETWORKS, genesisId);

export const UNKNOWN_NETWORK_NAME = "Unknown network";

export type NetworkResolution =
  | { ok: true; network: DirectNetwork }
  | { ok: false; code: number; reason: string };

/**
 * Which network a request names. A malformed hash is refused; any well-formed 32-byte hash is
 * accepted (a hash outside the built-in table is an `unknown` network the user is warned about).
 */
// unknown: the genesis hash is untrusted request data, validated by normalizeGenesisHash.
export function resolveRequestNetwork(
  requestGenesisHash: unknown,
): NetworkResolution {
  const genesisHash = normalizeGenesisHash(requestGenesisHash);
  if (!genesisHash) {
    return {
      ok: false,
      code: DirectErrorCode.invalidInput,
      reason: "Invalid genesisHash.",
    };
  }
  for (const [env, known] of Object.entries(KNOWN_NETWORKS)) {
    if (normalizeGenesisHash(known.hash) === genesisHash) {
      return {
        ok: true,
        network: {
          genesisHash,
          env,
          name: known.name,
          token: known.token,
          kind: known.kind,
        },
      };
    }
  }
  return {
    ok: true,
    network: { genesisHash, name: UNKNOWN_NETWORK_NAME, kind: "unknown" },
  };
}

/**
 * A transaction's `genesisID` must not contradict the network its genesis hash identifies, so a
 * request cannot show one network label and sign for another. A known network accepts only its
 * own ID; an unknown network accepts any ID except one that belongs to a known network (a
 * foreign hash labelled `mainnet-v1.0`). An absent / empty ID is accepted (the hash is what the
 * chain verifies).
 */
export function genesisIdConsistent(
  network: Pick<DirectNetwork, "env">,
  genesisId: string | undefined,
): boolean {
  if (!genesisId) return true;
  if (!network.env) return !isKnownEnvId(genesisId);
  return genesisId === network.env;
}

/**
 * The environment id whose per-account data (rekey mappings) applies to a request on this
 * network: the known env id, or the genesis hash of an unknown network (which has no data).
 * Derived from the verified network, never from a dApp-chosen string.
 */
export const signingEnvOf = (network: Pick<DirectNetwork, "env" | "genesisHash">) =>
  network.env ?? network.genesisHash;

export interface DirectNetworkChange {
  /** The network the site was connected on. */
  granted: DirectNetwork;
  /** The network the current request is on. */
  requested: DirectNetwork;
}

/**
 * A site's connection is granted on one network; when a later request names another, the user is
 * told explicitly (AW-2026-068). `undefined` when the request is on the granted network or names
 * no network (sign_data without a genesis hash).
 */
export function describeNetworkChange(
  grantedGenesisHash: string,
  requested: DirectNetwork | null,
): DirectNetworkChange | undefined {
  if (!requested) return undefined;
  const granted = resolveRequestNetwork(grantedGenesisHash);
  if (!granted.ok) return undefined;
  if (granted.network.genesisHash === requested.genesisHash) return undefined;
  return { granted: granted.network, requested };
}

/**
 * Application calls on a network the wallet does not recognise cannot be explained to the user
 * (no ARC-56 data, no simulation, nothing is known about the app), so they are refused
 * (AW-2026-069). Returns the refusal reason, or `undefined` when the transaction may proceed.
 */
export function applicationCallRefusedOnNetwork(
  network: Pick<DirectNetwork, "kind">,
  txType: string,
): string | undefined {
  if (network.kind === "unknown" && txType === "appl") {
    return "Application calls are not supported on a network the wallet does not recognise.";
  }
  return undefined;
}

/** The view shown in the popup: the network plus whether it is the wallet's selected one. */
export function toNetworkView(
  network: DirectNetwork,
  walletEnv: string,
): DirectNetworkView {
  return {
    ...network,
    matchesWalletEnv: network.env !== undefined && network.env === walletEnv,
  };
}
