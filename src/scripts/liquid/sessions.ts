/**
 * Serializable Liquid Auth pairing records stored in the encrypted wallet blob
 * (`wallet.wc["liquid:sessions"]`). Runtime sockets/WebRTC are never persisted —
 * after a refresh the Connect page hydrates these as disconnected until the user
 * explicitly reconnects.
 */
import type { LiquidPeerMetadata } from "./protocol";

export const LIQUID_SESSIONS_STORAGE_KEY = "liquid:sessions";

export interface StoredLiquidSession {
  requestId: string;
  origin: string;
  address: string;
  device: string;
  peer?: LiquidPeerMetadata;
  dappProviderId?: string;
  createdAt: number;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isPeerMetadata = (value: unknown): value is LiquidPeerMetadata => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const peer = value as {
    name?: unknown;
    description?: unknown;
    url?: unknown;
    icons?: unknown;
  };
  return (
    typeof peer.name === "string" &&
    typeof peer.description === "string" &&
    typeof peer.url === "string" &&
    Array.isArray(peer.icons) &&
    peer.icons.every((icon) => typeof icon === "string")
  );
};

/** Drop runtime-only `status` so a refresh never restores a live "connected" badge. */
export function toStoredLiquidSession(session: {
  requestId: string;
  origin: string;
  address: string;
  device: string;
  peer?: LiquidPeerMetadata;
  dappProviderId?: string;
  createdAt: number;
}): StoredLiquidSession {
  const stored: StoredLiquidSession = {
    requestId: session.requestId,
    origin: session.origin,
    address: session.address,
    device: session.device,
    createdAt: session.createdAt,
  };
  if (session.peer) {
    stored.peer = session.peer;
  }
  if (session.dappProviderId) {
    stored.dappProviderId = session.dappProviderId;
  }
  return stored;
}

/**
 * Parse the value returned by `wallet/wcGetItem` for `liquid:sessions`.
 * Invalid / unexpected shapes become an empty list rather than throwing, so a
 * corrupt blob cannot block the Connect page.
 */
export function parseStoredLiquidSessions(value: unknown): StoredLiquidSession[] {
  let raw: unknown = value;
  if (typeof raw === "string" && raw.length > 0) {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  const sessions: StoredLiquidSession[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as {
      requestId?: unknown;
      origin?: unknown;
      address?: unknown;
      device?: unknown;
      peer?: unknown;
      dappProviderId?: unknown;
      createdAt?: unknown;
    };
    if (
      !isNonEmptyString(record.requestId) ||
      !isNonEmptyString(record.origin) ||
      !isNonEmptyString(record.address)
    ) {
      continue;
    }
    const stored: StoredLiquidSession = {
      requestId: record.requestId,
      origin: record.origin,
      address: record.address,
      device: typeof record.device === "string" ? record.device : "",
      createdAt: typeof record.createdAt === "number" ? record.createdAt : 0,
    };
    if (isPeerMetadata(record.peer)) {
      stored.peer = record.peer;
    }
    if (isNonEmptyString(record.dappProviderId)) {
      stored.dappProviderId = record.dappProviderId;
    }
    sessions.push(stored);
  }
  return sessions;
}
