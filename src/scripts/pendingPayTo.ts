/**
 * The recipient the user just submitted on the Pay page, handed to the Sign page that follows.
 * Only a transaction that pays exactly this address is remembered as the "last recipient": a
 * transaction decoded from a link, a dApp or a multisig return never matches, so an address the
 * user did not enter cannot become the pre-filled default. In memory only.
 */
let pending: string | undefined;

export const setPendingPayTo = (address: string | undefined): void => {
  pending = address || undefined;
};

/** Returns the pending recipient once; a second call returns undefined. */
export const takePendingPayTo = (): string | undefined => {
  const value = pending;
  pending = undefined;
  return value;
};
