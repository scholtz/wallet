/**
 * AW-2026-044: the self-consistency check above cannot detect a DApp lying
 * about its own domain, since it only checks the request against itself.
 * This compares the claimed `domain` against the hostname of the actual
 * WalletConnect session peer (`session.peer.metadata.url`), which is set by
 * the DApp at connect time but reported to the wallet by the WalletConnect
 * relay/session record - not something a single malicious request can spoof
 * after the fact.
 */
export function domainMatchesSessionOrigin(
  domain: string,
  sessionOriginUrl: string | undefined | null,
): boolean {
  if (!domain || !sessionOriginUrl) return false;
  try {
    const url = new URL(sessionOriginUrl);
    const claimed = domain.trim().toLowerCase();
    // WebAuthn-style RP IDs are the hostname; use-wallet (and so most dApps) send
    // `location.host`, which carries a non-default port (e.g. "localhost:5173"). Both forms of
    // the same verified origin are accepted; a different host or a different port is not.
    return claimed === url.hostname.toLowerCase() || claimed === url.host.toLowerCase();
  } catch {
    return false;
  }
}
