/**
 * Checks applied to transactions a dApp asks the wallet to sign (WalletConnect, Liquid Auth,
 * Biatec Direct). Pure, so they are unit-testable under Node.
 */
import algosdk from "algosdk";
import { KNOWN_NETWORKS, isKnownEnvId } from "./direct/networks";
import { normalizeGenesisHash, txnGenesisMatches } from "./direct/protocol";

/**
 * `id_differs` / `missing_id` are warnings only: on an environment without a built-in genesis hash
 * (devnet, localnet, a custom preset) the env id is not guaranteed to equal the chain's real
 * genesis ID, so a difference cannot block signing.
 */
export type TxGenesisCheck =
  | "ok"
  | "id_mismatch"
  | "hash_mismatch"
  | "missing_id"
  | "id_differs";

/** Normalized genesis hash per built-in environment, computed once. */
const EXPECTED_HASH: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(KNOWN_NETWORKS).map(([env, known]) => [env, normalizeGenesisHash(known.hash)]),
);

/** Verdicts that must stop the wallet from signing. */
export const isBlockingGenesisCheck = (check: TxGenesisCheck): boolean =>
  check === "id_mismatch" || check === "hash_mismatch";

/**
 * Whether a dApp transaction is for the wallet's selected network. For a network in the built-in
 * table the full 32-byte genesis hash is compared (the genesis ID is only a label the dApp
 * chooses, AW-2026-063); other environments can only be compared by genesis ID, and a custom
 * node has no expected network at all.
 */
export function checkTxGenesis(
  tx: { genesisID?: string; genesisHash?: Uint8Array },
  walletEnv: string,
): TxGenesisCheck {
  if (!walletEnv || walletEnv === "custom") return "ok";
  const known = isKnownEnvId(walletEnv);
  if (known) {
    const expected = EXPECTED_HASH[walletEnv];
    if (!expected || !txnGenesisMatches(tx.genesisHash, expected)) {
      return "hash_mismatch";
    }
  }
  if (tx.genesisID) {
    if (tx.genesisID === walletEnv) return "ok";
    return known ? "id_mismatch" : "id_differs";
  }
  return known ? "missing_id" : "ok";
}

/**
 * Index of the first transaction in a request that is for another network than the selected one
 * (a blocking verdict), or `undefined` when none is. Used at admission so the whole request is
 * refused rather than partly signed (AW-2026-063).
 */
export function findGenesisMismatch(
  txns: { genesisID?: string; genesisHash?: Uint8Array }[],
  walletEnv: string,
): number | undefined {
  const index = txns.findIndex((tx) => isBlockingGenesisCheck(checkTxGenesis(tx, walletEnv)));
  return index === -1 ? undefined : index;
}

export type TxGroupCheck = "ok" | "incomplete";

/**
 * A request must carry every transaction of any group it mentions (AW-2026-064): the wallet is
 * the only party that can show the user the whole group. Ungrouped transactions are fine and a
 * request may hold several complete groups; each group id is recomputed from its members (in
 * request order) and a group that is incomplete, reordered or tampered with is refused.
 */
export function checkTransactionGroup(txns: algosdk.Transaction[]): TxGroupCheck {
  try {
    const groups = new Map<string, algosdk.Transaction[]>();
    for (const tx of txns) {
      if (!tx.group || tx.group.length === 0) continue;
      const id = Buffer.from(tx.group).toString("base64");
      const members = groups.get(id);
      if (members) members.push(tx);
      else groups.set(id, [tx]);
    }
    for (const [id, members] of groups) {
      const stripped = members.map((tx) => {
        const copy = algosdk.decodeUnsignedTransaction(
          algosdk.encodeUnsignedTransaction(tx),
        );
        copy.group = undefined;
        return copy;
      });
      const recomputed = Buffer.from(algosdk.computeGroupID(stripped)).toString("base64");
      if (recomputed !== id) return "incomplete";
    }
    return "ok";
  } catch (error) {
    // Odd but decodable transactions must be refused, not leave the request unanswered.
    console.error("Could not verify the transaction group", error);
    return "incomplete";
  }
}
