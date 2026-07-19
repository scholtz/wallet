// scripts/aggregators/simulate.ts - Builds simulate-ready (unsigned, no secret
// key required) transaction groups from each aggregator's prepared execute
// transactions, and summarizes an algod `simulateTransactions` response into
// the real, ledger-computed input/output amounts for the swap - as opposed to
// the aggregator's own advertised quote, which is only an estimate.
import algosdk from "algosdk";
import { Buffer } from "buffer";

export interface SimulatedOutcome {
  success: boolean;
  failureMessage?: string;
  // Real net amount of toAsset that ended up in the sender's account, in base units.
  netReceived?: number;
  // Real net amount of fromAsset that left the sender's account, in base units.
  netSent?: number;
}

// deflex/Haystack execute txns may span multiple atomic groups (e.g. an
// opt-in group followed by the swap group) - mirrors the grouping logic in
// aggregators/deflex.ts's execute().
export function extractDeflexSimulateGroups(txs: any): Uint8Array[][] {
  if (!Array.isArray(txs?.txns) || txs.txns.length === 0) return [];
  const byGroup = new Map<string, any[]>();
  for (const txn of txs.txns) {
    const list = byGroup.get(txn.group) ?? [];
    list.push(txn);
    byGroup.set(txn.group, list);
  }
  return [...byGroup.values()].map((group) =>
    group.map((txn) => {
      if (txn.logicSigBlob !== false) {
        return Uint8Array.from(Object.values(txn.logicSigBlob) as number[]);
      }
      const bytes = new Uint8Array(Buffer.from(txn.data, "base64"));
      const decoded = algosdk.decodeUnsignedTransaction(bytes);
      return algosdk.encodeUnsignedSimulateTransaction(decoded);
    })
  );
}

export function extractFolksSimulateGroups(folksTxns: any): Uint8Array[][] {
  if (!Array.isArray(folksTxns) || folksTxns.length === 0) return [];
  const group = folksTxns.map((txn: string) => {
    const decoded = algosdk.decodeUnsignedTransaction(
      new Uint8Array(Buffer.from(txn, "base64"))
    );
    return algosdk.encodeUnsignedSimulateTransaction(decoded);
  });
  return [group];
}

export function extractBiatecSimulateGroups(biatecQuotes: any): Uint8Array[][] {
  const txsToSign: string[] | undefined = biatecQuotes?.route?.txsToSign;
  if (!Array.isArray(txsToSign) || txsToSign.length === 0) return [];
  const group = txsToSign.map((txBase64) => {
    const decoded = algosdk.decodeUnsignedTransaction(
      new Uint8Array(Buffer.from(txBase64, "base64"))
    );
    return algosdk.encodeUnsignedSimulateTransaction(decoded);
  });
  return [group];
}

interface AssetDelta {
  received: bigint;
  sent: bigint;
}

function walkAssetDelta(
  result: algosdk.modelsv2.PendingTransactionResponse | undefined,
  address: string,
  assetId: number,
  acc: AssetDelta
): void {
  const txn = result?.txn?.txn;
  if (txn) {
    const sender = txn.sender?.toString();
    if (assetId === 0) {
      if (txn.payment) {
        const receiver = txn.payment.receiver?.toString();
        if (receiver === address) acc.received += txn.payment.amount;
        if (sender === address) acc.sent += txn.payment.amount;
      }
    } else if (txn.assetTransfer && Number(txn.assetTransfer.assetIndex) === assetId) {
      const receiver = txn.assetTransfer.receiver?.toString();
      if (receiver === address) acc.received += txn.assetTransfer.amount;
      if (sender === address) acc.sent += txn.assetTransfer.amount;
    }
  }
  for (const inner of result?.innerTxns ?? []) {
    walkAssetDelta(inner, address, assetId, acc);
  }
}

export function summarizeSimulation(
  response: algosdk.modelsv2.SimulateResponse,
  address: string,
  fromAssetId: number,
  toAssetId: number
): SimulatedOutcome {
  const toDelta: AssetDelta = { received: 0n, sent: 0n };
  const fromDelta: AssetDelta = { received: 0n, sent: 0n };
  let failureMessage: string | undefined;

  for (const group of response.txnGroups) {
    if (group.failedAt) {
      failureMessage = group.failureMessage || "Simulation failed";
    }
    for (const txnResult of group.txnResults) {
      walkAssetDelta(txnResult.txnResult, address, toAssetId, toDelta);
      walkAssetDelta(txnResult.txnResult, address, fromAssetId, fromDelta);
    }
  }

  if (failureMessage) {
    return { success: false, failureMessage };
  }

  return {
    success: true,
    netReceived: Number(toDelta.received - toDelta.sent),
    netSent: Number(fromDelta.sent - fromDelta.received),
  };
}
