import Algorand from "@ledgerhq/hw-app-algorand";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";

/**
 * Runs `fn` with an Algorand Ledger app session and always releases the USB device afterwards.
 *
 * `TransportWebUSB.request()` wraps `navigator.usb.requestDevice()`, which needs a fresh user
 * gesture and shows the device chooser every time; once the first `await` has consumed the click,
 * a second `request()` in the same handler fails with "No device selected". It also leaves the
 * device claimed when the transport is never closed, which breaks the next open. So: reuse a
 * device the user already authorised (`openConnected()`, no gesture needed), only fall back to the
 * chooser when none is paired, and close the transport in `finally`.
 */
export async function withLedger<T>(
  fn: (algo: Algorand) => Promise<T>,
): Promise<T> {
  const transport =
    (await TransportWebUSB.openConnected()) ??
    (await TransportWebUSB.request());
  try {
    return await fn(new Algorand(transport));
  } finally {
    await transport.close().catch((err: unknown) => {
      console.error("Failed to close Ledger transport", err);
    });
  }
}

export const ledgerPath = (slot: number): string => `44'/283'/${slot}'/0/0`;
