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

/** Challenge sizes accepted for raw account-key signing (WebAuthn nonces are 16..64 bytes). */
export const LIQUID_CHALLENGE_MIN_BYTES = 16;
export const LIQUID_CHALLENGE_MAX_BYTES = 64;

/** Max characters of one base64url CBOR message from the data channel (~256 KiB decoded). */
export const LIQUID_MAX_PAYLOAD_CHARS = 350_000;
/** Algorand's group size limit. */
export const LIQUID_MAX_TXNS_PER_REQUEST = 16;
export const LIQUID_MAX_SIGN_DATA_ITEMS = 16;
/** Pending (unanswered) requests the wallet keeps across all Liquid sessions. */
export const LIQUID_MAX_PENDING_REQUESTS = 50;

const MAX_METADATA_FIELD = 512;
const MAX_METADATA_ICONS = 4;

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Prefixes the Algorand protocol (and ARC standards) sign over; never valid in a challenge. */
const FORBIDDEN_SIGNING_PREFIXES = [
  "TX",
  "MX",
  "Program",
  "ProgData",
  "appID",
  "arc",
  "ARC",
];

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

function parentDomain(hostname: string): string {
  const labels = hostname.split(".");
  return labels.slice(-2).join(".");
}

/**
 * The service named in a `liquid://` link receives the wallet's address, a passkey and an
 * account-key signature, so a link must not be able to point it anywhere. Allowed: the
 * trusted Biatec services, a host in the wallet's own registrable domain (self-hosted
 * deployments, see docs/LIQUID_AUTH.md), or localhost while the wallet itself runs on localhost.
 */
export function assertLiquidServiceOrigin(
  origin: string,
  walletHostname: string,
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
  if (url.protocol !== "https:" || url.port) {
    throw new Error("The Liquid Auth service must use https on the default port.");
  }
  if (isLocalHost(host) && isLocalHost(walletHost)) return;
  if (IPV4.test(host) || host.includes(":") || !host.includes(".")) {
    throw new Error("The Liquid Auth service must be a named host.");
  }
  if (LIQUID_TRUSTED_SERVICE_HOSTS.includes(host)) return;
  if (
    !isLocalHost(walletHost) &&
    !IPV4.test(walletHost) &&
    walletHost.includes(".") &&
    (host === walletHost ||
      host.endsWith(`.${parentDomain(walletHost)}`) ||
      host === parentDomain(walletHost))
  ) {
    return;
  }
  throw new Error(
    `Refusing to link with the untrusted Liquid Auth service "${host}". Only liquid.biatec.io or a service on this wallet's own domain is accepted.`,
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
  const cap = (value: unknown) =>
    typeof value === "string" ? value.slice(0, MAX_METADATA_FIELD) : "";
  const icons: unknown[] = Array.isArray(peer.icons) ? peer.icons : [];
  return {
    ...peer,
    name: cap(peer.name),
    description: cap(peer.description),
    url: cap(peer.url),
    icons: icons
      .filter(
        (icon): icon is string =>
          typeof icon === "string" && /^https:\/\//i.test(icon),
      )
      .slice(0, MAX_METADATA_ICONS)
      .map(cap),
  };
}

export interface SignRequestEntry {
  sender?: string;
  /** ARC-1 `signers`: an empty array means the wallet must not sign this transaction. */
  signers?: string[];
}

/**
 * Indexes of transactions the wallet is asked to sign whose sender is not one of the accounts
 * the dApp session was approved for (AW-2026-016/046/051). Group members the wallet is told not
 * to sign (`signers: []`) are ignored.
 */
export function findUnauthorizedSenders(
  entries: SignRequestEntry[],
  approvedAddresses: string[],
): number[] {
  const approved = new Set(approvedAddresses);
  const rejected: number[] = [];
  entries.forEach((entry, index) => {
    if (Array.isArray(entry.signers) && entry.signers.length === 0) return;
    if (!entry.sender || !approved.has(entry.sender)) rejected.push(index);
  });
  return rejected;
}
