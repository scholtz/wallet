import type { AssetProfile, AssetProfileRule } from "@/store/config";
import type { StoredAsset } from "@/store/indexer";

export type AssetOverviewRowType = "Native" | "ASA" | "ARC200";

export interface AssetOverviewRow {
  accountAddr: string;
  accountName: string;
  assetId: string; // stringified bigint, for stable rule matching
  assetType: AssetOverviewRowType;
  amount: bigint;
  name: string;
  decimals: number;
  unitName: string;
}

// Reads whatever asset metadata is already cached locally (localStorage,
// same format written by `indexer/getAsset`, plus the in-memory
// `indexer` module's asset list) without ever issuing a network request.
// Returns undefined if the asset hasn't been looked up by the app before.
export function getCachedAssetMeta(
  env: string,
  assetIndex: bigint,
  inMemoryAssets: StoredAsset[],
): StoredAsset | undefined {
  const existing = inMemoryAssets.find(
    (a) => a.assetId && BigInt(a.assetId) === assetIndex,
  );
  if (existing) {
    return existing;
  }
  const envPrefix = env === "mainnet" || env === "mainnet-v1.0" ? "" : `${env}-`;
  const cacheKey = `Asset-${envPrefix}${assetIndex}`;
  try {
    const cache = localStorage.getItem(cacheKey);
    if (cache) {
      const cacheObj = JSON.parse(cache) as StoredAsset;
      if (
        cacheObj &&
        cacheObj.assetId &&
        BigInt(cacheObj.assetId) === assetIndex
      ) {
        return cacheObj;
      }
    }
  } catch (error) {
    console.error("getCachedAssetMeta cache parse", error);
  }
  return undefined;
}

export function ruleMatchesRow(
  rule: AssetProfileRule,
  row: AssetOverviewRow,
): boolean {
  return (
    (rule.accountAddr === undefined || rule.accountAddr === row.accountAddr) &&
    (rule.assetId === undefined ||
      (rule.assetId === row.assetId && rule.assetType === row.assetType))
  );
}

export function applyAssetProfile(
  rows: AssetOverviewRow[],
  profile: AssetProfile | undefined,
): AssetOverviewRow[] {
  if (!profile) {
    return rows;
  }
  if (profile.mode === "whitelist") {
    return rows.filter((row) =>
      profile.rules.some((rule) => ruleMatchesRow(rule, row)),
    );
  }
  return rows.filter(
    (row) => !profile.rules.some((rule) => ruleMatchesRow(rule, row)),
  );
}
