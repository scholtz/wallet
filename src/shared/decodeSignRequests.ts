/**
 * Decoders shared by every dApp-connection transport (WalletConnect v2 in src/store/wc.ts,
 * Liquid Auth in src/store/liquid.ts) that turn incoming ARC-0001 `algo_signTxn` transaction
 * lists and ARC-0060 `algo_signData` items into the summaries the Connect page renders.
 */
import algosdk from "algosdk";
import {
  decodeArc60Request,
  validateAuthenticatorDataDomain,
  type Arc60StdSigData,
} from "../scripts/encoding/arc60";

// algosdk.decodeUnsignedTransaction()'s declared return type doesn't expose
// the type-specific fields (payment.*, assetTransfer.*, etc.) even though
// they exist on the actual decoded object at runtime (see CLAUDE.md's
// "algosdk.decodeUnsignedTransaction()" gotcha) - algosdk's own
// `Transaction` class carries these as optional properties, so intersecting
// with it (rather than `Record<string, any>`) gives real field types.
export type DecodedAlgorandTransaction = ReturnType<
  typeof algosdk.decodeUnsignedTransaction
> &
  algosdk.Transaction & {
    // algosdk.Transaction only exposes the sender as `.sender: Address`, not
    // `.from` - this optional field preserves the pre-existing (and, at
    // runtime, always-undefined) `.from` read below rather than changing
    // behavior; a real fix would switch that read to `.sender`.
    from?: { publicKey: Uint8Array };
  };

export interface DecodedTransactionSummary {
  index: number;
  type: string;
  from?: string;
  fee?: number;
  asset: string | number;
  amount?: number | string;
  rekeyTo?: string;
  /** closeRemainderTo (pay) / assetCloseTo (axfer) — drains the entire remaining balance/holding. */
  closeTo?: string;
  txn: DecodedAlgorandTransaction;
  txnB64: string;
}

/** One decoded item from an ARC-60 `algo_signData` request. */
export interface StoredSignDataItem {
  index: number;
  data: string; // base64
  dataText?: string;
  signer: string; // resolved Algorand address
  domain: string;
  requestId?: string;
  authenticatorData: string; // base64
  hdPath?: string;
  scope: number;
  encoding: string;
  domainValid: boolean;
  signature?: string; // base64, set once signed
}

/** One entry of an ARC-0001 `algo_signTxn` / ARC-0027 `sign_transactions` params array. */
export interface AlgoSignTxnParam {
  txn: string;
  signers?: string[];
  authAddr?: string;
}

/**
 * Shape of the raw msgpack-decoded object returned by `algosdk.decodeObj()`
 * for a transaction that may or may not already be signature-wrapped
 * (`{ txn: {...}, sig: ... }`) - `algosdk.decodeObj()` itself is typed to
 * return `unknown` since it can decode arbitrary msgpack, so this describes
 * only the envelope fields this code actually reads before re-encoding and
 * passing the inner txn through `algosdk.decodeUnsignedTransaction()`.
 */
type RawDecodedTxnEnvelope = Record<string, unknown> & {
  type?: string;
  txn?: RawDecodedTxnEnvelope;
  sig?: Uint8Array;
};

/**
 * Accepts standard base64 (WalletConnect) as well as base64url with or without padding
 * (Liquid Auth / ARC-0027 peers) and returns the decoded bytes.
 */
export function decodeBase64Flexible(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

/**
 * Decode a list of ARC-0001 wallet transactions into displayable summaries. When an entry is
 * already a signed transaction, `onPreSigned` receives its bytes so the caller can register
 * the existing signature (mirrors the historical WalletConnect behaviour).
 */
export function decodeSignTxnTransactions(
  rawTransactions: AlgoSignTxnParam[],
  onPreSigned?: (signed: Uint8Array) => void
): DecodedTransactionSummary[] {
  return rawTransactions.map((item, index) => {
    const txnB64 = String(item?.txn ?? "");
    const txnBuffer = decodeBase64Flexible(txnB64);
    const decodedObj = algosdk.decodeObj(txnBuffer) as RawDecodedTxnEnvelope;
    let decodedTx = decodedObj;
    if (!decodedTx.type && decodedTx.txn?.type) {
      if (decodedTx.sig && onPreSigned) {
        onPreSigned(new Uint8Array(txnBuffer));
      }
      decodedTx = decodedTx.txn;
    }
    const decoded = algosdk.decodeUnsignedTransaction(
      algosdk.encodeObj(decodedTx)
    ) as DecodedAlgorandTransaction;

    let asset: string | number = "";
    switch (decoded.type) {
      case "pay":
        asset = "ALGO";
        break;
      case "axfer":
        asset = decoded.assetTransfer?.assetIndex?.toString() ?? "";
        break;
      default:
        asset = decoded.type ?? "";
        break;
    }

    const rawAmount = decoded.payment?.amount ?? decoded.assetTransfer?.amount;
    let amount: number | string | undefined =
      typeof rawAmount === "bigint" ? rawAmount.toString() : rawAmount;
    if (decoded.type === "pay" || decoded.type === "axfer") {
      if (!amount) {
        amount = "0";
      }
    }

    let from: string | undefined;
    if (decoded.from?.publicKey) {
      from = algosdk.encodeAddress(decoded.from.publicKey);
    }

    let rekeyTo: string | undefined;
    if (decoded.rekeyTo?.publicKey) {
      rekeyTo = algosdk.encodeAddress(decoded.rekeyTo.publicKey);
    }

    let closeTo: string | undefined;
    const closeAddr =
      decoded.payment?.closeRemainderTo ?? decoded.assetTransfer?.closeRemainderTo;
    if (closeAddr?.publicKey) {
      closeTo = algosdk.encodeAddress(closeAddr.publicKey);
    }

    const feeValue = decoded.fee ?? 0;

    return {
      index,
      type: decoded.type ?? "",
      from,
      fee: typeof feeValue === "bigint" ? Number(feeValue) : feeValue,
      asset,
      amount,
      rekeyTo,
      closeTo,
      txn: decoded,
      txnB64,
    };
  });
}

/**
 * Decode ARC-60 `StdSigData` items (byte fields base64 or base64url), resolving the signer
 * public key to an address and pre-validating the authenticator-data domain binding.
 * Items that fail to decode are skipped (logged), matching the WalletConnect behaviour.
 */
export async function decodeArc60Items(
  rawItems: Arc60StdSigData[]
): Promise<StoredSignDataItem[]> {
  const items: StoredSignDataItem[] = [];
  for (let index = 0; index < rawItems.length; index += 1) {
    const rawItem = rawItems[index];
    try {
      const normalizedItem: Arc60StdSigData = {
        ...rawItem,
        data: decodeBase64Flexible(rawItem.data).toString("base64"),
        authenticatorData: decodeBase64Flexible(rawItem.authenticatorData).toString(
          "base64"
        ),
      };
      const decoded = decodeArc60Request(normalizedItem);
      const domainValid = await validateAuthenticatorDataDomain(
        decoded.authenticatorData,
        decoded.domain
      );
      let dataText: string | undefined;
      try {
        const text = Buffer.from(decoded.data).toString("utf-8");
        if (/^[\x20-\x7E\s]*$/.test(text)) {
          dataText = text;
        }
      } catch {
        dataText = undefined;
      }
      let signer = rawItem.signer;
      try {
        signer = algosdk.encodeAddress(
          new Uint8Array(decodeBase64Flexible(rawItem.signer))
        );
      } catch {
        signer = rawItem.signer;
      }
      items.push({
        index,
        data: normalizedItem.data,
        dataText,
        signer,
        domain: decoded.domain,
        requestId: decoded.requestId,
        authenticatorData: normalizedItem.authenticatorData,
        hdPath: decoded.hdPath,
        scope: decoded.scope,
        encoding: decoded.encoding,
        domainValid,
      });
    } catch (error) {
      console.error("Failed to decode algo_signData item", error);
    }
  }
  return items;
}
