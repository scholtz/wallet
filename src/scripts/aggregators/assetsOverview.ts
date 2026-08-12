import type { AssetProfile, AssetProfileRule } from "@/store/config";

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
  usdValue?: number;
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
