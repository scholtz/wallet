// Shared by the aggregators' execute(): see resolveSigningRoute in ../signing/complexSigning.ts.

/** The account has no way to sign inside this wallet (watch-only, rekeyed to an account it does not hold). */
export const NO_SIGNER_MESSAGE =
  "This account cannot sign transactions in this wallet.";
