/**
 * Networks seen by Biatec Direct (pure logic, no runtime imports beyond the protocol module, so
 * it is unit-testable under Node).
 *
 * The popup signs for ANY chain the dApp uses: it does not compare the request with the network
 * selected in the wallet. What it does instead is to work out which network the request names,
 * show it to the user on every request, and say so when it does not recognise it.
 */
import {
  DirectErrorCode,
  genesisCaipReference,
  normalizeGenesisHash,
} from "./protocol";

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
  /** CAIP-2 reference: the first 32 base64url chars of the genesis hash. */
  prefix: string;
  name: string;
  token?: string;
  kind: Exclude<DirectNetworkKind, "unknown">;
}

/** Built-in table of well-known networks, keyed by wallet environment id (= genesis ID). */
const KNOWN_NETWORKS: Record<string, KnownNetwork> = {
  "mainnet-v1.0": {
    prefix: "wGHE2Pwdvd7S12BL5FaOP20EGYesN73k",
    name: "Algorand Mainnet",
    token: "Algo",
    kind: "main",
  },
  "testnet-v1.0": {
    prefix: "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe",
    name: "Algorand Testnet",
    token: "Algo",
    kind: "test",
  },
  "betanet-v1.0": {
    prefix: "mFgazF-2uRS1tMiL9dsj01hJGySEmPN2",
    name: "Algorand Betanet",
    token: "Algo",
    kind: "test",
  },
  "fnet-v1": {
    prefix: "kUt08LxeVAAGHnh4JoAoAMM9ql_hBwSo",
    name: "Algorand Fnet",
    token: "Algo",
    kind: "test",
  },
  "voimain-v1.0": {
    prefix: "r20fSQI8gWe_kFZziNonSPCXLwcQmH_n",
    name: "Voi Mainnet",
    token: "VOI",
    kind: "main",
  },
  "aramidmain-v1.0": {
    prefix: "PgeQVJJgx_LYKJfIEz7dbfNPuXmDyJ-O",
    name: "Aramid Mainnet",
    kind: "main",
  },
};

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
  const reference = genesisCaipReference(genesisHash);
  for (const [env, known] of Object.entries(KNOWN_NETWORKS)) {
    if (known.prefix === reference) {
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
 * request cannot show one network label and sign for another. Unknown networks accept any ID;
 * an absent / empty ID is accepted (the hash is what the chain verifies).
 */
export function genesisIdConsistent(
  network: Pick<DirectNetwork, "env">,
  genesisId: string | undefined,
): boolean {
  if (!network.env) return true;
  if (!genesisId) return true;
  return genesisId === network.env;
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
