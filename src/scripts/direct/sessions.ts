/**
 * Serializable Biatec Direct site grants, stored in the encrypted wallet blob
 * (`wallet.wc["direct:sessions"]`). A session records which accounts the user exposed to one
 * dApp origin; it is keyed by the browser-verified origin. A grant never allows silent signing:
 * every signature still needs a fresh popup and an explicit approval.
 */
import { MAX_DIRECT_SESSIONS, parseDappOrigin } from "./protocol";

export const DIRECT_SESSIONS_STORAGE_KEY = "direct:sessions";

export interface DirectPeerMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export interface StoredDirectSession {
  origin: string;
  addresses: string[];
  /** Normalized (base64url, unpadded) genesis hash the grant was made on. */
  genesisHash: string;
  peer?: DirectPeerMetadata;
  createdAt: number;
  lastUsedAt: number;
}

const ADDRESS_PATTERN = /^[A-Z2-7]{58}$/;

// unknown: stored/untrusted values are type-checked field by field.
const isPeerMetadata = (value: unknown): value is DirectPeerMetadata => {
  if (!value || typeof value !== "object") return false;
  const peer = value as Record<string, unknown>;
  return (
    typeof peer.name === "string" &&
    typeof peer.description === "string" &&
    typeof peer.url === "string" &&
    Array.isArray(peer.icons) &&
    peer.icons.every((icon) => typeof icon === "string")
  );
};

/** Corrupt or tampered entries are dropped instead of throwing, so one cannot block the page. */
// unknown: the persisted value is parsed from storage and may be tampered with or corrupt.
export function parseStoredDirectSessions(
  value: unknown,
): StoredDirectSession[] {
  let raw: unknown = value;
  if (typeof raw === "string" && raw.length > 0) {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const sessions: StoredDirectSession[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const origin = parseDappOrigin(record.origin);
    if (!origin || seen.has(origin)) continue;
    if (
      !Array.isArray(record.addresses) ||
      record.addresses.length === 0 ||
      !record.addresses.every(
        (a) => typeof a === "string" && ADDRESS_PATTERN.test(a),
      )
    ) {
      continue;
    }
    if (
      typeof record.genesisHash !== "string" ||
      record.genesisHash.length !== 43
    ) {
      continue;
    }
    const session: StoredDirectSession = {
      origin,
      addresses: [...new Set(record.addresses as string[])],
      genesisHash: record.genesisHash,
      createdAt: typeof record.createdAt === "number" ? record.createdAt : 0,
      lastUsedAt: typeof record.lastUsedAt === "number" ? record.lastUsedAt : 0,
    };
    if (isPeerMetadata(record.peer)) {
      session.peer = record.peer;
    }
    seen.add(origin);
    sessions.push(session);
  }
  return sessions.slice(0, MAX_DIRECT_SESSIONS);
}

/** Insert or replace the grant of one origin; beyond the cap the least recently used is dropped. */
export function upsertDirectSession(
  sessions: StoredDirectSession[],
  session: StoredDirectSession,
): StoredDirectSession[] {
  const next = sessions.filter((s) => s.origin !== session.origin);
  next.push(session);
  if (next.length > MAX_DIRECT_SESSIONS) {
    next.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    return next.slice(0, MAX_DIRECT_SESSIONS);
  }
  return next;
}

/** Drop approved addresses the wallet no longer holds; a session with none left disappears. */
export function pruneDirectSessions(
  sessions: StoredDirectSession[],
  walletAddresses: string[],
): StoredDirectSession[] {
  const own = new Set(walletAddresses);
  return sessions
    .map((s) => ({ ...s, addresses: s.addresses.filter((a) => own.has(a)) }))
    .filter((s) => s.addresses.length > 0);
}
