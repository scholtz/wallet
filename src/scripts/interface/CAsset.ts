import IAsset from "./IAsset";

class CAsset implements IAsset {
  assetId: bigint = 0n;
  amount: bigint = 0n;
  name: string = "";
  decimals: number = 0;
  unitName: string = "";
  type: "Native" | "ASA" | "ARC200" = "Native";
  label: string = "";
}

export default CAsset;
