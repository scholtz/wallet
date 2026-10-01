import algosdk from "algosdk";
import {
  MainnetPoolManagerAppId,
  MainnetPools,
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
 * withdrawal (fUSDC -> USDC). Prepends an opt-in for `optInAssetId` when set
 * (fUSDC before a deposit, USDC before a withdrawal).
 * Withdrawals always pass received_amount = 0 ("variable"): the pool then pays
 * out whatever the fUSDC is worth at the on-chain index, so a client clock that
 * is ahead of chain time can never request more than the pool will pay.
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
  const txns =
    optInAssetId !== undefined
      ? [buildOptInTxn(sender, optInAssetId, suggestedParams), ...poolTxns]
      : poolTxns;
  // The SDK strips group ids so the caller can recompose groups.
  return algosdk.assignGroupID(txns);
};

/**
 * Last line of defence before signing: besides the generic swap safety checks
 * (sender, rekey, close-to), every transaction must be one the flow is meant
 * to produce - a transfer of the pool's own assets to the pool app / self, or
 * a call to the USDC pool application. Anything else is rejected.
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
  for (const tx of txns) {
    if (tx.type === algosdk.TransactionType.appl) {
      if (Number(tx.applicationCall?.appIndex) !== FOLKS_USDC_POOL.appId) {
        throw new Error("Refusing to sign: unexpected application call.");
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
};
