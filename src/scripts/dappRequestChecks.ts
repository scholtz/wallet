/**
 * Checks applied to transactions a dApp asks the wallet to sign (WalletConnect, Liquid Auth,
 * Biatec Direct). Pure, so they are unit-testable under Node.
 */
import algosdk from "algosdk";
import { KNOWN_NETWORKS } from "./direct/networks";
import { normalizeGenesisHash, txnGenesisMatches } from "./direct/protocol";

export type TxGenesisCheck = "ok" | "id_mismatch" | "hash_mismatch" | "missing_id";

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
  const known = Object.prototype.hasOwnProperty.call(KNOWN_NETWORKS, walletEnv)
    ? KNOWN_NETWORKS[walletEnv]
    : undefined;
  if (known) {
    const expected = normalizeGenesisHash(known.hash);
    if (!expected || !txnGenesisMatches(tx.genesisHash, expected)) {
      return "hash_mismatch";
    }
  }
  if (tx.genesisID) return tx.genesisID === walletEnv ? "ok" : "id_mismatch";
  return known ? "missing_id" : "ok";
}

export type TxGroupCheck = "ok" | "incomplete";

/**
 * A request must carry every transaction of any group it mentions (AW-2026-064): the wallet is
 * the only party that can show the user the whole group. Ungrouped transactions are fine; a
 * request mixing grouped and ungrouped ones, several groups, or a group whose recomputed id does
 * not match is refused.
 */
export function checkTransactionGroup(txns: algosdk.Transaction[]): TxGroupCheck {
  const grouped = txns.filter((tx) => tx.group && tx.group.length > 0);
  if (grouped.length === 0) return "ok";
  if (grouped.length !== txns.length) return "incomplete";
  const first = Buffer.from(grouped[0].group!).toString("base64");
  if (grouped.some((tx) => Buffer.from(tx.group!).toString("base64") !== first)) {
    return "incomplete";
  }
  const stripped = txns.map((tx) => {
    const copy = algosdk.decodeUnsignedTransaction(
      algosdk.encodeUnsignedTransaction(tx),
    );
    copy.group = undefined;
    return copy;
  });
  const recomputed = Buffer.from(algosdk.computeGroupID(stripped)).toString("base64");
  return recomputed === first ? "ok" : "incomplete";
}
