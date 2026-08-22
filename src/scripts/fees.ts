// Helpers for Algorand's usage-based fee model (go-algorand v5.0 consensus).
//
// Since v5.0 the network prices a transaction by its "usage", reported by the
// simulate endpoint as a fixed-point multiplier on the minimum fee expressed
// in millionths: a plain ed25519 payment has usage 1,000,000 (one min fee),
// while e.g. a Falcon-1024 post-quantum signature adds 2,000,000 of usage
// (three min fees total, typically 0.003 ALGO). The fee declared on a
// transaction is always spent in full — there is no on-chain "max fee with
// refund" mechanism — so the wallet must declare exactly the required fee,
// and any "max fee" can only be a client-side safety cap on how far the
// wallet will auto-raise a fee.

/** One minimum fee expressed in usage millionths. */
export const USAGE_PER_MIN_FEE = 1_000_000n;

/** Extra usage charged for a Falcon-1024 (post-quantum) signature. */
export const FALCON1024_EXTRA_USAGE = 2_000_000n;

/**
 * Client-side cap (microalgos, 0.1 ALGO) on how high the wallet will
 * auto-adjust a basic transaction's fee based on simulation. Never used as
 * the declared fee itself — declaring it would spend it in full.
 */
export const MAX_AUTO_FEE_MICROALGOS = 100_000n;

/**
 * Fee (microalgos) required for the given usage, rounded up to a whole
 * microalgo: ceil(minFee * usage / 1,000,000).
 */
export const requiredFeeFromUsage = (
  minFee: bigint,
  usageMillionths: bigint,
): bigint =>
  (minFee * usageMillionths + USAGE_PER_MIN_FEE - 1n) / USAGE_PER_MIN_FEE;

/**
 * Minimum usage a single transaction will incur given its signature type.
 * Used as a floor under the simulated usage: simulate with
 * allowEmptySignatures cannot tell that the sender will attach a Falcon-1024
 * signature (the address alone does not reveal the key scheme), so the
 * signature surcharge must be accounted for client-side.
 */
export const minimumUsageForSigner = (falcon1024: boolean): bigint =>
  USAGE_PER_MIN_FEE + (falcon1024 ? FALCON1024_EXTRA_USAGE : 0n);

export interface ResolveRequiredFeeInput {
  /** Network minimum fee in microalgos (from suggested params). */
  minFee: bigint;
  /** groupUsage reported by simulate, if available. */
  groupUsage?: bigint;
  /** Whether the sender signs with a Falcon-1024 (post-quantum) key. */
  falcon1024Signer: boolean;
}

/**
 * The fee (microalgos) a transaction must declare: the larger of the
 * simulate-reported usage cost and the client-side floor for the sender's
 * signature type.
 */
export const resolveRequiredFee = ({
  minFee,
  groupUsage,
  falcon1024Signer,
}: ResolveRequiredFeeInput): bigint => {
  const floor = requiredFeeFromUsage(
    minFee,
    minimumUsageForSigner(falcon1024Signer),
  );
  if (groupUsage === undefined || groupUsage <= 0n) {
    return floor;
  }
  const simulated = requiredFeeFromUsage(minFee, groupUsage);
  return simulated > floor ? simulated : floor;
};

export interface FeeEstimate {
  /** Fee in microalgos the transaction must declare to be accepted. */
  requiredFee: bigint;
  /** Raw usage reported by simulate (millionths of a min fee), if any. */
  groupUsage?: bigint;
  /** Failure message reported by simulate, if the dry-run failed. */
  failureMessage?: string;
}
