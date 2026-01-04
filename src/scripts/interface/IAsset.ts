interface IAsset {
  assetId: bigint;
  amount: bigint;
  name: string;
  decimals: number;
  unitName: string;
  type: "Native" | "ASA" | "ARC200";
  label: string;
}
export default IAsset;
