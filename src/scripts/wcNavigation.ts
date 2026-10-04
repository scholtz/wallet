/** `/payWC/:account/:payload` - msig signing page opened from a WalletConnect request. */
export const payWcPath = (
  connectedAccount: string | undefined,
  txnSender: string,
  payloadB64Url: string,
): string => `/payWC/${connectedAccount || txnSender}/${payloadB64Url}`;

/** Where "Return to WalletConnect" goes: keep the account so the request list stays populated. */
export const connectReturnPath = (account: string | undefined): string =>
  account ? `/account/connect/${account}` : "/connect";
