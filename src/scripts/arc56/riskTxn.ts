// Pure classification of transactions for the ARC-56 signing-risk verdict.
// Kept out of the Vue component so the security-relevant rules are unit
// tested (playwright/unit/arc56RiskTxn.spec.ts).
import algosdk from "algosdk";

const isZeroAddress = (addr: algosdk.Address | undefined): boolean =>
  !addr || addr.toString() === algosdk.ALGORAND_ZERO_ADDRESS_STRING;

// An app call that is never presented as reassuring, whatever the registry
// says about the approval program behind it: creation (the new program is
// attacker-chosen), Update/Delete (change or destroy the app), and
// ClearState/CloseOut (ClearState runs the clear program, which the
// approval-program hash says nothing about; CloseOut removes the account's
// local state).
export const isSensitiveAppCall = (txn: algosdk.Transaction): boolean => {
  const call = txn.applicationCall;
  if (!call) return false;
  return (
    BigInt(call.appIndex) === 0n ||
    call.onComplete === algosdk.OnApplicationComplete.ClearStateOC ||
    call.onComplete === algosdk.OnApplicationComplete.CloseOutOC ||
    call.onComplete === algosdk.OnApplicationComplete.UpdateApplicationOC ||
    call.onComplete === algosdk.OnApplicationComplete.DeleteApplicationOC
  );
};

// Close-outs, rekeys away from the sender, clawbacks, freezes, asset
// reconfiguration/destruction and key registrations move funds or control
// regardless of which contract is being called. A self-rekey or zero
// rekey is a no-op and ignored.
export const isRiskyTransaction = (txn: algosdk.Transaction): boolean => {
  const rekeysAway =
    !isZeroAddress(txn.rekeyTo) && txn.rekeyTo?.toString() !== txn.sender.toString();
  const reconfiguresAsset =
    txn.type === algosdk.TransactionType.acfg && (txn.assetConfig?.assetIndex ?? 0n) !== 0n;
  return (
    rekeysAway ||
    reconfiguresAsset ||
    !isZeroAddress(txn.assetTransfer?.assetSender) ||
    !isZeroAddress(txn.payment?.closeRemainderTo) ||
    !isZeroAddress(txn.assetTransfer?.closeRemainderTo) ||
    txn.type === algosdk.TransactionType.afrz ||
    txn.type === algosdk.TransactionType.keyreg
  );
};
