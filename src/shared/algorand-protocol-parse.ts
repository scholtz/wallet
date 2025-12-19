export interface AlgorandProtocolParameters {
  payTo?: string;
  network?: string;
  paynote?: string;
  paynoteB64?: boolean;
  decimals?: number;
  payamount?: number | string;
  payamountbase?: number | string;
  fee?: number | string;
  feebase?: number | string;
  asset?: string;
}

const isEncoded = (uri: string = ""): boolean => {
  return uri !== decodeURIComponent(uri);
};

const parseAlgorandProtocolParameters = (
  input?: string | null
): AlgorandProtocolParameters => {
  const payload: AlgorandProtocolParameters = {};
  if (!input) {
    return payload;
  }

  let result = input;
  const isAlgorandUri =
    result.startsWith("algorand://") || result.startsWith("web+algorand://");

  if (!isAlgorandUri) {
    payload.payTo = result;
    return payload;
  }

  // parse according to https://github.com/emg110/algorand-qrcode
  result = result.replace("web+algorand://", "");
  result = result.replace("algorand://", "");
  const qIndex = result.indexOf("?");
  if (qIndex < 0) {
    payload.payTo = result;
    return payload;
  }

  payload.payTo = result.substring(0, qIndex);

  const params = result.substring(qIndex + 1);
  const paramsArr = params.split("&");

  let note: string | undefined;
  let noteB64: string | undefined;
  let amount: string | undefined;
  let decimals: number | undefined;
  let asset: string | undefined;
  let fee: string | undefined;

  for (const entry of paramsArr) {
    const eqIndex = entry.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const paramName = entry.substring(0, eqIndex);
    const paramValue = entry.substring(eqIndex + 1);
    switch (paramName) {
      case "note":
      case "xnote":
      case "label": {
        note = paramValue;
        if (isEncoded(note)) {
          note = decodeURIComponent(note);
        }
        break;
      }
      case "noteB64":
        noteB64 = paramValue;
        break;
      case "amount":
        amount = paramValue;
        break;
      case "asset":
        asset = paramValue;
        break;
      case "fee":
        fee = paramValue;
        break;
      case "network":
        payload.network = paramValue;
        break;
      case "decimals": {
        const parsed = Number(paramValue);
        if (!Number.isNaN(parsed)) {
          decimals = parsed;
        }
        break;
      }
    }
  }

  payload.paynote = note;
  payload.paynoteB64 = !!noteB64;
  if (decimals !== undefined) {
    payload.decimals = decimals;
    if (amount) {
      const numericAmount = Number(amount);
      if (!Number.isNaN(numericAmount)) {
        payload.payamount = numericAmount / Math.pow(10, decimals);
        payload.payamountbase = numericAmount;
      }
    }
    if (fee) {
      const numericFee = Number(fee);
      if (!Number.isNaN(numericFee)) {
        payload.fee = numericFee / Math.pow(10, decimals);
        payload.feebase = numericFee;
      }
    }
  } else {
    if (amount) {
      payload.payamount = amount;
      payload.payamountbase = amount;
    }
    if (fee) {
      payload.fee = fee;
      payload.feebase = fee;
    }
  }

  if (asset) {
    payload.asset = asset;
  }

  return payload;
};

export default {
  isEncoded,
  parseAlgorandProtocolParameters,
};
