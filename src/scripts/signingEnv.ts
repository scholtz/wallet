/**
 * Which network's per-account data (rekey mappings) applies to a transaction being signed.
 * Pure so it is unit-testable under Node.
 *
 * `verifiedEnv` is the network the wallet itself worked out and showed to the user (Biatec
 * Direct: the known env id, or the genesis hash of an unknown network). It wins over anything the
 * transaction claims. Otherwise the transaction's own genesis ID is used, and only when it has
 * none the network currently selected in the wallet.
 */
export function pickSigningEnv(input: {
  verifiedEnv?: string;
  txGenesisId?: string;
  walletEnv?: string;
}): string | undefined {
  if (input.verifiedEnv) return input.verifiedEnv;
  if (input.txGenesisId) return input.txGenesisId;
  return input.walletEnv || undefined;
}
