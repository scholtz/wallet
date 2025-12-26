import algosdk from "algosdk";
console.log("indexerModels:", !!algosdk.indexerModels);
if (algosdk.indexerModels) {
  console.log("Transaction:", !!algosdk.indexerModels.Transaction);
}
