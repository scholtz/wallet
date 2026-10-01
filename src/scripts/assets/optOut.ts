import algosdk from "algosdk";

/**
 * Address the remaining asset balance is closed to when opting out.
 * - the asset creator, normally;
 * - the sender itself when the asset no longer exists (nobody to return to);
 * - undefined when the sender is the creator, which can never opt out of its own asset.
 */
export const resolveOptOutCloseTo = (
  sender: string,
  creator: string | undefined,
): string | undefined => {
  if (!creator) return sender;
  if (creator === sender) return undefined;
  return creator;
};

export interface AssetOptOutParams {
  sender: string;
  assetId: bigint | number | string;
  closeTo: string;
  suggestedParams: algosdk.SuggestedParams;
  note?: Uint8Array;
}

/** Zero-amount asset transfer to self with AssetCloseTo set, i.e. an opt-out. */
export const buildAssetOptOutTxn = ({
  sender,
  assetId,
  closeTo,
  suggestedParams,
  note,
}: AssetOptOutParams): algosdk.Transaction => {
  const assetIndex = BigInt(assetId);
  if (assetIndex <= 0n) {
    throw new Error("The native token cannot be opted out");
  }
  return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender,
    receiver: sender,
    assetIndex,
    amount: 0n,
    closeRemainderTo: closeTo,
    note,
    suggestedParams,
  });
};

/** True when an algod/indexer error means "asset does not exist" (deleted). */
// A catch clause only ever yields an untyped value, so it has to be narrowed here.
export const isAssetNotFoundError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { status?: number }).status === 404;
