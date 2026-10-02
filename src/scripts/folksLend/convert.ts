// Pure fixed-point maths for converting between an underlying asset (e.g.
// USDC) and its Folks Finance deposit token (fUSDC). Mirrors the official
// SDK's calcDepositReturn/calcWithdrawReturn (both floor) so the amounts we
// show are never higher than what the pool contract will pay out.

/** The pool's deposit interest index has 14 decimals of precision. */
export const ONE_14_DP = 10n ** 14n;

export type FolksLendDirection = "deposit" | "withdraw";

/** fToken received for depositing `amount` of the underlying asset (0dp). */
export const calcFAssetReceived = (amount: bigint, depositIndex: bigint): bigint => {
  if (depositIndex <= 0n) throw new Error("Invalid deposit interest index");
  return (amount * ONE_14_DP) / depositIndex;
};

/** Underlying asset received for redeeming `fAmount` of the fToken (0dp). */
export const calcUnderlyingReceived = (fAmount: bigint, depositIndex: bigint): bigint => {
  if (depositIndex <= 0n) throw new Error("Invalid deposit interest index");
  return (fAmount * depositIndex) / ONE_14_DP;
};

/**
 * Direction implied by the swap form's selected assets: USDC -> fUSDC is a
 * deposit, fUSDC -> USDC a withdrawal, any other pair is a normal swap (null).
 */
export const getFolksLendDirection = (
  from: bigint | null,
  to: bigint | null,
  assetId: number,
  fAssetId: number,
): FolksLendDirection | null => {
  if (from === null || to === null) return null;
  if (from === BigInt(assetId) && to === BigInt(fAssetId)) return "deposit";
  if (from === BigInt(fAssetId) && to === BigInt(assetId)) return "withdraw";
  return null;
};

/** Amount received for the chosen direction, in base units of the output asset. */
export const calcFolksLendReceived = (
  direction: FolksLendDirection,
  amount: bigint,
  depositIndex: bigint,
): bigint =>
  direction === "deposit"
    ? calcFAssetReceived(amount, depositIndex)
    : calcUnderlyingReceived(amount, depositIndex);

/** Underlying asset per 1 fToken, as a plain number for display (e.g. 1.0423). */
export const exchangeRate = (depositIndex: bigint): number =>
  Number(depositIndex) / Number(ONE_14_DP);

/**
 * Converts a user-entered decimal amount into base units without float
 * rounding surprises (0.1 + 0.2 style). Returns 0n for non-positive / invalid
 * input and truncates anything beyond `decimals`.
 */
export const toBaseUnits = (value: number, decimals: number): bigint => {
  if (!Number.isFinite(value) || value <= 0) return 0n;
  const fixed = value.toFixed(decimals);
  const [whole, frac = ""] = fixed.split(".");
  return BigInt(whole + frac.padEnd(decimals, "0").slice(0, decimals));
};

/**
 * Base units floored to whole cents (two decimals), for display. Done in
 * bigint math: flooring a float is inexact (0.29 * 100 = 28.999999999999996
 * would show as 0.28).
 */
export const floorToCents = (value: bigint, decimals: number): number => {
  if (decimals < 2) return Number(value) / 10 ** decimals;
  const cents = value / 10n ** BigInt(decimals - 2);
  return Number(cents) / 100;
};

/** Base units to a decimal number for display. */
export const fromBaseUnits = (value: bigint, decimals: number): number =>
  Number(value) / 10 ** decimals;
