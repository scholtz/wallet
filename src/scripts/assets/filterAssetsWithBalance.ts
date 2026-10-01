type BalanceAsset = {
  assetId: bigint | number | string;
  amount?: bigint | number | string;
};

const hasBalance = (amount: BalanceAsset["amount"]): boolean => {
  if (amount === undefined || amount === null || amount === "") return false;
  try {
    return BigInt(amount) > 0n;
  } catch {
    return false;
  }
};

const normalizeId = (id: BalanceAsset["assetId"] | undefined): string =>
  id === undefined || id === "" ? "0" : String(id);

/**
 * Returns only the assets with a non-zero balance when `onlyWithBalance` is set.
 * The asset identified by `keepAssetId` (e.g. the currently selected one) is
 * always kept, so a selection never disappears from its own dropdown.
 * An empty/undefined `keepAssetId` refers to the native token (id 0).
 */
export const filterAssetsWithBalance = <T extends BalanceAsset>(
  assets: T[],
  onlyWithBalance: boolean,
  keepAssetId?: BalanceAsset["assetId"],
): T[] => {
  if (!onlyWithBalance) return assets;
  const keep = normalizeId(keepAssetId);
  return assets.filter(
    (a) => hasBalance(a.amount) || normalizeId(a.assetId) === keep,
  );
};
