/**
 * Input guards for the Liquid Auth transport. Everything the signaling service or the remote
 * dApp peer sends is untrusted; these checks keep it from steering what the wallet signs.
 * Kept free of runtime imports so it can be unit-tested in plain Node.
 */

/** Services the wallet will authenticate against regardless of the wallet's own host. */
export const LIQUID_TRUSTED_SERVICE_HOSTS = [
  "liquid.biatec.io",
  "stage.liquid.biatec.io",
];

/**
 * Challenge sizes accepted for raw account-key signing. WebAuthn nonces are 16..64 bytes, but
 * the cap stops at 48: an ARC-60 digest (SHA256(data)||SHA256(authenticatorData)) is exactly
 * 64 bytes, so a longer challenge could be a login signature for another site.
 */
export const LIQUID_CHALLENGE_MIN_BYTES = 16;
export const LIQUID_CHALLENGE_MAX_BYTES = 48;

/** Max characters of one base64url CBOR message from the data channel (~256 KiB decoded). */
export const LIQUID_MAX_PAYLOAD_CHARS = 350_000;
/** Algorand's group size limit; applies to every dApp transport (WalletConnect, Liquid). */
export const MAX_DAPP_TXNS_PER_REQUEST = 16;
/** Pending (unanswered) requests the wallet keeps per transport. */
export const MAX_DAPP_PENDING_REQUESTS = 50;
export const LIQUID_MAX_TXNS_PER_REQUEST = MAX_DAPP_TXNS_PER_REQUEST;
export const LIQUID_MAX_SIGN_DATA_ITEMS = 16;
export const LIQUID_MAX_PENDING_REQUESTS = MAX_DAPP_PENDING_REQUESTS;

const MAX_METADATA_FIELD = 512;
const MAX_METADATA_ICONS = 4;

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Domain-separation prefixes the Algorand protocol signs over that can fit inside the
 * length cap (a LogicSig program can be a few bytes). "TX"/"MX" are not listed: a
 * transaction cannot fit in 64 bytes, and rejecting those two bytes would only add
 * false positives for random nonces.
 */
const FORBIDDEN_SIGNING_PREFIXES = ["Program", "ProgData", "appID", "MultisigAddr"];

/** A local development *name* (never an IP literal: the service host must be a named host). */
function isLocalName(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

/** The wallet itself may be served from a loopback IP during development. */
function isLocalHost(hostname: string): boolean {
  return isLocalName(hostname) || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * The service named in a `liquid://` link receives the wallet's address, a passkey and an
 * account-key signature, so a link must not be able to point it anywhere. Allowed: the
 * trusted Biatec services, a subdomain of the wallet's own host, hosts listed in
 * VITE_LIQUID_SERVICE_HOSTS (self-hosted deployments, see docs/LIQUID_AUTH.md), or localhost
 * while the wallet itself runs on localhost (any port; links are always https://).
 */
export function assertLiquidServiceOrigin(
  origin: string,
  walletHostname: string,
  extraTrustedHosts: string[] = [],
): void {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("The Liquid Auth service address is not a valid URL.");
  }
  const host = url.hostname.toLowerCase();
  const walletHost = walletHostname.toLowerCase();
  if (url.username || url.password) {
    throw new Error("The Liquid Auth service address must not contain credentials.");
  }
  if (url.protocol !== "https:") {
    throw new Error("The Liquid Auth service must use https.");
  }
  // Local development: a localhost service for a localhost wallet, on any port.
  if (isLocalName(host) && isLocalHost(walletHost)) return;
  if (url.port) {
    throw new Error("The Liquid Auth service must use the default https port.");
  }
  if (IPV4.test(host) || host.includes(":") || !host.includes(".")) {
    throw new Error("The Liquid Auth service must be a named host.");
  }
  if (LIQUID_TRUSTED_SERVICE_HOSTS.includes(host)) return;
  // The wallet's own host or one of its subdomains is always its own.
  if (
    !isLocalHost(walletHost) &&
    !IPV4.test(walletHost) &&
    (host === walletHost || host.endsWith(`.${walletHost}`))
  ) {
    return;
  }
  // Self-hosted deployments name their service explicitly (VITE_LIQUID_SERVICE_HOSTS);
  // guessing a "sibling domain" would trust unrelated tenants of shared hosting.
  if (extraTrustedHosts.some((h) => h.trim().toLowerCase() === host)) return;
  throw new Error(
    `Refusing to link with the untrusted Liquid Auth service "${host}". Only liquid.biatec.io, a subdomain of this wallet's host, or a host configured in VITE_LIQUID_SERVICE_HOSTS is accepted.`,
  );
}

/**
 * The challenge is signed with the account's raw ed25519 key. It must be a short random nonce:
 * anything long enough to be a transaction, or starting with a protocol signing prefix, would
 * turn the signature into a valid on-chain authorization.
 */
export function assertLiquidChallenge(challenge: Uint8Array): void {
  if (
    challenge.length < LIQUID_CHALLENGE_MIN_BYTES ||
    challenge.length > LIQUID_CHALLENGE_MAX_BYTES
  ) {
    throw new Error(
      "Refusing to sign: the Liquid Auth challenge is not a valid-length nonce.",
    );
  }
  for (const prefix of FORBIDDEN_SIGNING_PREFIXES) {
    let matches = true;
    for (let i = 0; i < prefix.length; i++) {
      if (challenge[i] !== prefix.charCodeAt(i)) {
        matches = false;
        break;
      }
    }
    if (matches) {
      throw new Error(
        "Refusing to sign: the Liquid Auth challenge looks like an Algorand signing payload.",
      );
    }
  }
}

export interface PeerMetadataLike {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

/** Length-cap peer-supplied metadata and keep only https icon URLs. */
export function sanitizePeerMetadata<T extends PeerMetadataLike>(peer: T): T {
  // unknown: untrusted data from a remote peer; every field is type-checked before use,
  // whatever the declared PeerMetadataLike type says.
  const cap = (value: unknown) =>
    typeof value === "string" ? value.slice(0, MAX_METADATA_FIELD) : "";
  // unknown: same reason - the peer may send anything for `icons`.
  // Cap the array before scanning it, so a flood of entries costs nothing.
  const icons: unknown[] = Array.isArray(peer.icons)
    ? peer.icons.slice(0, MAX_METADATA_ICONS * 4)
    : [];
  return {
    ...peer,
    name: cap(peer.name),
    description: cap(peer.description),
    // Shown as a link and used to label the app: only an https address is kept.
    url: cap(peer.url).toLowerCase().startsWith("https://") ? cap(peer.url) : "",
    icons: icons
      .filter(
        (icon): icon is string =>
          typeof icon === "string" &&
          icon.length <= MAX_METADATA_FIELD &&
          icon.slice(0, 8).toLowerCase() === "https://",
      )
      .slice(0, MAX_METADATA_ICONS),
  };
}

export interface SignRequestEntry {
  sender?: string;
  /** The transaction already carries a signature (co-signer's); the wallet does not sign it. */
  preSigned?: boolean;
  /** ARC-1 `signers`: an empty array means the wallet must not sign this transaction. */
  signers?: string[];
}

/**
 * Indexes of transactions the wallet is asked to sign whose sender is not one of the accounts
 * the dApp session was approved for (AW-2026-016/046/051). Group members the wallet is told not
 * to sign (`signers: []`) are ignored unless the sender is one of the wallet's own accounts.
 */
export function findUnauthorizedSenders(
  entries: SignRequestEntry[],
  approvedAddresses: string[],
  walletAddresses: string[] = [],
): number[] {
  const approved = new Set(approvedAddresses);
  const own = new Set(walletAddresses);
  const rejected: number[] = [];
  entries.forEach((entry, index) => {
    // `signers: []` is not enforced by the signing path, and a pre-signed envelope is just
    // data the dApp sent, so both only exempt transactions of accounts this wallet cannot
    // sign for anyway; an unapproved wallet account is always rejected.
    const exempt =
      entry.preSigned || (Array.isArray(entry.signers) && entry.signers.length === 0);
    if (exempt && !(entry.sender && own.has(entry.sender))) return;
    if (!entry.sender || !approved.has(entry.sender)) rejected.push(index);
  });
  return rejected;
}
