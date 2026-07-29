// scripts/simulateAssetChanges.ts - Walks an algod `simulateTransactions`
// response (including inner transactions) and nets out every pay/axfer
// amount for a given set of addresses, producing the real, ledger-computed
// asset flow for "the user" reviewing a transaction group before signing -
// e.g. depositing asset A + asset B into an AMM and receiving an LP token,
// withdrawing an LP token for the underlying assets, or a multi-hop
// A->B->C swap, where any pass-through leg (B in, B straight back out)
// nets to zero and only the real A-out/C-in outcome is left standing.
import algosdk from "algosdk";

export interface AssetDeltaRow {
  address: string;
  // 0 = ALGO (native payment).
  assetId: number;
  // Positive = net received, negative = net sent. Excludes network fees -
  // this is asset movement only, matching the existing swap-simulation
  // convention in scripts/aggregators/simulate.ts.
  netAmount: bigint;
}

function addDelta(
  acc: Map<string, Map<number, bigint>>,
  addresses: Set<string>,
  address: string | undefined,
  assetId: number,
  delta: bigint,
): void {
  if (!address || delta === 0n || !addresses.has(address)) return;
  let perAsset = acc.get(address);
  if (!perAsset) {
    perAsset = new Map();
    acc.set(address, perAsset);
  }
  perAsset.set(assetId, (perAsset.get(assetId) ?? 0n) + delta);
}

function walkAssetDeltas(
  result: algosdk.modelsv2.PendingTransactionResponse | undefined,
  addresses: Set<string>,
  acc: Map<string, Map<number, bigint>>,
): void {
  const txn = result?.txn?.txn;
  if (txn) {
    const sender = txn.sender?.toString();
    if (txn.payment) {
      const receiver = txn.payment.receiver?.toString();
      const amount = txn.payment.amount ?? 0n;
      addDelta(acc, addresses, sender, 0, -amount);
      addDelta(acc, addresses, receiver, 0, amount);
    } else if (txn.assetTransfer) {
      const receiver = txn.assetTransfer.receiver?.toString();
      const assetId = Number(txn.assetTransfer.assetIndex);
      const amount = txn.assetTransfer.amount ?? 0n;
      addDelta(acc, addresses, sender, assetId, -amount);
      addDelta(acc, addresses, receiver, assetId, amount);
    }
  }
  for (const inner of result?.innerTxns ?? []) {
    walkAssetDeltas(inner, addresses, acc);
  }
}

// `addresses` should be the set of accounts the review screen is showing the
// outcome to (typically the top-level senders of the group being signed) -
// deltas to/from any other address (e.g. an AMM contract's own account) are
// intentionally not surfaced, since that isn't the user's own balance.
export function summarizeAssetDeltas(
  response: algosdk.modelsv2.SimulateResponse,
  addresses: Iterable<string>,
): AssetDeltaRow[] {
  const addressSet = new Set(addresses);
  const acc = new Map<string, Map<number, bigint>>();

  for (const group of response.txnGroups) {
    for (const txnResult of group.txnResults) {
      walkAssetDeltas(txnResult.txnResult, addressSet, acc);
    }
  }

  const rows: AssetDeltaRow[] = [];
  for (const [address, perAsset] of acc) {
    for (const [assetId, netAmount] of perAsset) {
      // Pass-through legs (e.g. the middle asset of an A->B->C swap) net to
      // zero and are dropped, so only the real, final outcome is shown.
      if (netAmount !== 0n) rows.push({ address, assetId, netAmount });
    }
  }
  return rows;
}
