// Standard decision logic for pages that build transactions and need them signed
// (swap, asset opt-in/out, ...). Pure on purpose: no runtime imports, so it is
// unit-testable under Node (playwright/unit).
//
// Rule: an account whose key lives in the wallet (plain key, HD) is signed for
// in place with `signer/signTransaction` - no ceremony, so the page that built
// the transactions can do it. Everything that needs a ceremony per transaction -
// multisig / 2FA (several signers, `/sign`) and Ledger (confirm on the device) -
// goes through the `/signAll` page, which already knows how to do all of it.
// Falcon-1024 does too: its large signature needs a higher fee than a page's
// transactions usually declare, and only `/signAll` warns about that. See "Signing transactions built by a page" in CLAUDE.md.

/** What `signer/getSignerType` answers. */
export type SignerType = "ledger" | "msig" | "sk" | "hd" | "falcon1024" | "?";

/**
 * - `direct`: sign in place with `signer/signTransaction` (key or HD account).
 * - `signAll`: hand the group over to `/signAll` (multisig / 2FA, Ledger, Falcon-1024).
 * - `none`: the wallet holds no way to sign for this account (watch-only, a
 *   rekey to an account that is not in the wallet).
 */
export type SigningRoute = "direct" | "signAll" | "none";

export const resolveSigningRoute = (signerType: SignerType): SigningRoute => {
  switch (signerType) {
    case "sk":
    case "hd":
      return "direct";
    case "msig":
    case "ledger":
    case "falcon1024":
      return "signAll";
    default:
      return "none";
  }
};

/** Where `/signAll` offers to return to once the user is done. */
export interface SignAllReturn {
  /** Identifies the originating flow (drives the button label). */
  key: string;
  /** Absolute app path to return to (e.g. the swap page with its assets). */
  path?: string;
}

/** Locale key (under `sign_all.`) of the "Return to ..." button; generic for flows without their own label. */
export const signAllReturnLabelKey = (key: string): string => {
  switch (key) {
    case "Swap":
      return "return_to_swap";
    case "ScheduledPayments":
      return "return_to_scheduled_payments";
    default:
      return "return_to_previous";
  }
};

/** App path to navigate to for the return button, or undefined when there is none. */
export const signAllReturnPath = (
  key: string,
  path: string,
  lastActiveAccount: string,
): string | undefined => {
  if (!key) return undefined;
  // Only app-internal absolute paths ("//host" would be protocol-relative).
  if (path && path.startsWith("/") && !path.startsWith("//")) return path;
  if (key === "ScheduledPayments" && lastActiveAccount) {
    return `/accounts/scheduled-payment/${lastActiveAccount}`;
  }
  return undefined;
};
