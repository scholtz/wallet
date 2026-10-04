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

export type OptOutResult =
  | { status: "sent"; txId: string }
  | { status: "creator" }
  | { status: "failed" };

/**
 * The creator receives the whole remaining balance, so the node's answer must be confirmed by
 * the (separately configured) indexer. Refuses when the two disagree or when the indexer could
 * not confirm at all (AW-2026-054). A missing creator (deleted asset) needs no confirmation.
 */
export const confirmAssetCreator = (
  nodeCreator: string | undefined,
  indexerCreator: string | undefined,
): string | undefined => {
  if (!nodeCreator) return undefined;
  if (!indexerCreator) {
    throw new Error(
      "The asset creator could not be confirmed by the indexer. Refusing to opt out.",
    );
  }
  if (nodeCreator !== indexerCreator) {
    throw new Error(
      "The node and the indexer disagree about the asset creator. Refusing to opt out.",
    );
  }
  return nodeCreator;
};
