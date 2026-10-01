import algosdk from "algosdk";
import {
  MainnetOpUp,
  MainnetPoolManagerAppId,
  MainnetPools,
  prefixWithOpUp,
  prepareDepositIntoPool,
  prepareWithdrawFromPool,
  retrievePoolInfo,
} from "@folks-finance/algorand-sdk";
import { assertSwapTransactionsSafe } from "../aggregators/validate";

/** Folks Finance USDC lending pool on Algorand mainnet (underlying USDC <-> fUSDC). */
export const FOLKS_USDC_POOL = MainnetPools.USDC;
export const FOLKS_POOL_MANAGER_APP_ID = MainnetPoolManagerAppId;

/** Folks lending only has a mainnet deployment. */
export const isFolksLendNetwork = (env: string): boolean =>
  env === "mainnet-v1.0" || env === "mainnet";

export interface FolksPoolRate {
  depositIndex: bigint;
  /** Yearly deposit yield as a fraction (0.05 = 5%). */
  apy: number;
}

export const fetchFolksPoolRate = async (
  algod: algosdk.Algodv2,
): Promise<FolksPoolRate> => {
  const info = await retrievePoolInfo(algod, FOLKS_USDC_POOL);
  // The SDK returns the 16dp yield as a bigint.
  return {
    depositIndex: info.interest.depositInterestIndex,
    apy: Number(info.interest.depositInterestYield) / 1e16,
  };
};

/** Inner OpUp transactions added in front of the pool call (see buildFolksLendTxns). */
const OPUP_INNER_TXNS = 1;

const MIN_BALANCE_PER_ENTRY = 100_000n;
// Worst-case group fees: opt-in 0.001 + OpUp 0.002 + pool call up to 0.005
// (withdraw) = 0.008 ALGO, rounded up.
const OPT_IN_FEES_MICROALGO = 10_000n;
/** Highest fee any single call of this flow may carry (the pool's withdraw). */
const MAX_APP_CALL_FEE = 5_000n;

/**
 * Pre-check that an account can afford one more opt-in, so the user gets a
 * friendly message instead of a raw algod error. It is an approximation (the
 * Swap page's basis: 0.1 ALGO base + 0.1 per held asset) that ignores opted-in
 * apps, created assets/apps and boxes, so it can only under-block: algod stays
 * authoritative and its rejection is still shown if the real minimum is higher.
 */
export const hasAlgoForOptIn = (
  microAlgo: bigint,
  heldAssetCount: number,
): boolean =>
  microAlgo >=
  MIN_BALANCE_PER_ENTRY * BigInt(heldAssetCount + 1) +
    MIN_BALANCE_PER_ENTRY +
    OPT_IN_FEES_MICROALGO;

/** Zero-amount self transfer opting the account into an asset. */
export const buildOptInTxn = (
  sender: string,
  assetId: number,
  suggestedParams: algosdk.SuggestedParams,
): algosdk.Transaction =>
  algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender,
    receiver: sender,
    assetIndex: assetId,
    amount: 0n,
    suggestedParams,
  });

/**
 * Builds the unsigned, grouped transactions for a deposit (USDC -> fUSDC) or
 * withdrawal (fUSDC -> USDC), laid out as [opt-in?, OpUp, ...pool calls].
 *
 * - The optional opt-in is for `optInAssetId` (fUSDC before a deposit, USDC
 *   before a withdrawal).
 * - The pool's program needs more opcode budget than a single app call
 *   provides ("dynamic cost budget exceeded"), so the pool calls are prefixed
 *   with one OpUp call. Verified by simulating both directions on mainnet:
 *   without it deposit and withdraw fail, with one inner OpUp txn both pass
 *   with plenty of headroom.
 * - Withdrawals always pass received_amount = 0 ("variable"): the pool then
 *   pays out whatever the fUSDC is worth at the on-chain index, so a client
 *   clock that is ahead of chain time can never request more than the pool
 *   will pay.
 */
export const buildFolksLendTxns = (args: {
  direction: "deposit" | "withdraw";
  sender: string;
  amount: bigint;
  optInAssetId?: number;
  suggestedParams: algosdk.SuggestedParams;
}): algosdk.Transaction[] => {
  const { direction, sender, amount, optInAssetId, suggestedParams } = args;
  const poolTxns =
    direction === "deposit"
      ? prepareDepositIntoPool(
          FOLKS_USDC_POOL,
          FOLKS_POOL_MANAGER_APP_ID,
          sender,
          sender,
          amount,
          suggestedParams,
        )
      : prepareWithdrawFromPool(
          FOLKS_USDC_POOL,
          FOLKS_POOL_MANAGER_APP_ID,
          sender,
          sender,
          amount,
          0n,
          suggestedParams,
        );
  const budgetedTxns = prefixWithOpUp(
    MainnetOpUp,
    sender,
    poolTxns,
    OPUP_INNER_TXNS,
    suggestedParams,
  );
  const txns =
    optInAssetId !== undefined
      ? [buildOptInTxn(sender, optInAssetId, suggestedParams), ...budgetedTxns]
      : budgetedTxns;
  // The SDK strips group ids so the caller can recompose groups.
  return algosdk.assignGroupID(txns);
};

/**
 * Last line of defence before signing: besides the generic swap safety checks
 * (sender, rekey, close-to), every transaction must be one the flow is meant
 * to produce - a transfer of the pool's own assets to the pool app / self, a
 * plain NoOp call to the USDC pool application, or the single OpUp call that
 * prefixes it (one inner txn, referencing only its base app). Anything else is
 * rejected.
 */
export const assertFolksLendTxnsSafe = (
  txns: algosdk.Transaction[],
  sender: string,
): void => {
  assertSwapTransactionsSafe(txns, sender);
  const poolAddr = algosdk.getApplicationAddress(FOLKS_USDC_POOL.appId).toString();
  const allowedAssets = new Set<number>([
    FOLKS_USDC_POOL.assetId,
    FOLKS_USDC_POOL.fAssetId as number,
  ]);
  let poolCalls = 0;
  let opUpCalls = 0;
  for (const tx of txns) {
    if (tx.type === algosdk.TransactionType.appl) {
      const call = tx.applicationCall;
      const appId = Number(call?.appIndex);
      const isPool = appId === FOLKS_USDC_POOL.appId;
      const isOpUp = appId === MainnetOpUp.callerAppId;
      if (
        !call ||
        (!isPool && !isOpUp) ||
        call.onComplete !== algosdk.OnApplicationComplete.NoOpOC ||
        tx.fee > MAX_APP_CALL_FEE
      ) {
        throw new Error("Refusing to sign: unexpected application call.");
      }
      if (isOpUp) {
        opUpCalls++;
        if (
          call.appArgs.length !== 1 ||
          call.foreignApps.length !== 1 ||
          Number(call.foreignApps[0]) !== MainnetOpUp.baseAppId
        ) {
          throw new Error("Refusing to sign: unexpected OpUp call.");
        }
      } else {
        poolCalls++;
      }
    } else if (tx.type === algosdk.TransactionType.axfer) {
      const at = tx.assetTransfer;
      const receiver = at?.receiver.toString();
      if (
        !at ||
        !allowedAssets.has(Number(at.assetIndex)) ||
        (receiver !== poolAddr && receiver !== sender)
      ) {
        throw new Error("Refusing to sign: unexpected asset transfer.");
      }
    } else {
      throw new Error("Refusing to sign: unexpected transaction type.");
    }
  }
  if (poolCalls > 1 || opUpCalls > 1) {
    throw new Error("Refusing to sign: unexpected number of application calls.");
  }
};
