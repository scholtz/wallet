/** `/payWC/:account/:payload` - msig signing page opened from a WalletConnect request. */
export const payWcPath = (
  connectedAccount: string | undefined,
  txnSender: string,
  payloadB64Url: string,
): string => `/payWC/${connectedAccount || txnSender}/${payloadB64Url}`;

/**
 * Where "Return to WalletConnect" goes: keep the account so the request list stays populated.
 * Inside a Biatec Direct popup the request lives on `/direct`, never on the Connect page.
 */
export const connectReturnPath = (
  account: string | undefined,
  inDirectPopup = false,
): string => {
  if (inDirectPopup) return "/direct";
  return account ? `/account/connect/${account}` : "/connect";
};
