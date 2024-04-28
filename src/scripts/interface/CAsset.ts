import IAsset from "./IAsset";

class CAsset implements IAsset {
  "asset-id": number = 0;
  amount: number = 0;
  name: string = "";
  decimals: number = 0;
  "unit-name": string = "";
  type: string = "";
  label: string = "";
}

export default CAsset;
