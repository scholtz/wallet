export default {
  isEncoded(uri) {
    uri = uri || "";
    return uri !== decodeURIComponent(uri);
  },
  parseAlgorandProtocolParameters(result) {
    let ret = {};
    if (result) {
      if (
        result.startsWith("algorand://") ||
        result.startsWith("web+algorand://")
      ) {
        // parse according to https://github.com/emg110/algorand-qrcode
        result = result.replace("web+algorand://", "");
        result = result.replace("algorand://", "");
        const qIndex = result.indexOf("?");
        if (qIndex < 0) {
          ret.payTo = result;
        } else {
          ret.payTo = result.substring(0, qIndex);

          const params = result.substring(qIndex + 1);
          const paramsArr = params.split("&");

          let note = undefined;
          let noteB64 = undefined;
          let amount = undefined;
          let decimals = undefined;
          let asset = undefined;
          let fee = undefined;

          for (const index in paramsArr) {
            const eqIndex = paramsArr[index].indexOf("=");
            if (eqIndex > 0) {
              // valid parameter names starts with letters
              const paramName = paramsArr[index].substring(0, eqIndex);
              const paramValue = paramsArr[index].substring(eqIndex + 1);
              switch (paramName) {
                case "note":
                case "xnote":
                case "label":
                  note = paramValue;
                  if (this.isEncoded(note)) {
                    note = decodeURIComponent(note);
                  }
                  break;
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
                  ret.network = paramValue;
                  break;
              }
            }
          }

          ret.paynote = note;
          ret.paynoteB64 = !!noteB64;
          if (decimals !== undefined) {
            ret.decimals = decimals;
            if (amount) {
              ret.payamount = amount / Math.pow(10, decimals);
              ret.payamountbase = amount;
            }
            if (fee) {
              ret.fee = fee / Math.pow(10, decimals);
              ret.feebase = fee;
            }
          } else {
            if (amount) {
              ret.payamount = amount;
              ret.payamountbase = amount;
            }
            if (fee) {
              ret.fee = fee;
              ret.feebase = fee;
            }
          }
          if (asset) {
            ret.asset = asset;
          }
        }
      } else {
        ret.payTo = result;
      }
    }
    return ret;
  },
};
