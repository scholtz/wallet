/**
 * Biatec Liquid Auth wire protocol (wallet-side mirror) — the dApp ⇄ wallet message layer over the
 * WebRTC data channel established through a Liquid Auth signaling service.
 *
 * Message envelope: ARC-0027 (`{ id, reference, params }` / `{ id, requestId, reference,
 * result | error }`), encoded as CBOR and transported as a base64url string — the same
 * encoding used by the Algorand Foundation's Liquid Auth clients, so the transaction-signing
 * messages interoperate with any ARC-0027 Liquid Auth peer. ARC-0060 data signing is carried
 * in the same envelope under the `arc0060:sign_data:*` references (a Biatec extension).
 *
 * The canonical specification and the dApp-side implementation live in the
 * biatec-wallet-use-wallet-client repository (docs/LIQUID_AUTH_PROTOCOL.md, src/liquid/protocol.ts).
 * This file is a mirror of that module — keep them in sync. See docs/LIQUID_AUTH.md.
 */

// ---------- Constants ---------------------------------------------- //

/** Deep-link scheme scanned/pasted into the wallet: `liquid://<host>/?requestId=<uuid>` */
export const LIQUID_SCHEME = 'liquid://'
/** Label of the RTCDataChannel that carries the messages (Liquid Auth convention). */
export const LIQUID_DATA_CHANNEL = 'liquid'
/** Biatec-hosted Liquid Auth signaling service used when no `origin` option is given. */
export const DEFAULT_LIQUID_ORIGIN = 'https://liquid.biatec.io'
/** Public Google STUN servers — no TURN by default, so both peers need a reachable path. */
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302'
    ]
  }
]

export const LiquidReference = {
  helloRequest: 'biatec:hello:request',
  helloResponse: 'biatec:hello:response',
  signTransactionsRequest: 'arc0027:sign_transactions:request',
  signTransactionsResponse: 'arc0027:sign_transactions:response',
  signDataRequest: 'arc0060:sign_data:request',
  signDataResponse: 'arc0060:sign_data:response'
} as const

export type LiquidReferenceValue = (typeof LiquidReference)[keyof typeof LiquidReference]

/** ARC-0027 error codes (shared with ARC-0001 / ARC-0060). */
export const LiquidErrorCode = {
  unknown: 4000,
  cancelled: 4001,
  timedOut: 4002,
  methodNotSupported: 4003,
  networkNotSupported: 4004,
  unauthorizedSigner: 4100,
  invalidInput: 4200,
  invalidGroupId: 4201,
  failedToPost: 4300
} as const

// ---------- Messages ----------------------------------------------- //

export interface LiquidErrorPayload {
  code: number
  message: string
  data?: unknown
  providerId?: string
}

export interface LiquidRequestMessage<P = unknown> {
  id: string
  reference: string
  params: P
}

export interface LiquidResponseMessage<R = unknown> {
  id: string
  requestId: string
  reference: string
  result?: R
  error?: LiquidErrorPayload
}

export type LiquidMessage = LiquidRequestMessage | LiquidResponseMessage

/** ARC-0001 `WalletTransaction` as carried by ARC-0027 `sign_transactions` params. */
export interface LiquidWalletTransaction {
  /** base64url (base64 also accepted by the wallet) of the canonical msgpack encoding. */
  txn: string
  authAddr?: string
  msig?: { version: number; threshold: number; addrs: string[] }
  signers?: string[]
  stxn?: string
}

export interface SignTransactionsParams {
  providerId: string
  txns: LiquidWalletTransaction[]
}

export interface SignTransactionsResult {
  providerId: string
  /**
   * Positional results. Each entry is the base64url signed transaction (or, for peers that
   * follow the Android reference wallet, a raw 64-byte signature); `null` marks a position the
   * wallet was asked not to sign (`signers: []`), mirroring ARC-0001.
   */
  stxns: (string | null)[]
}

/** ARC-0060 `StdSigData` with every byte field base64url-encoded for the wire. */
export interface LiquidStdSigData {
  data: string
  signer: string
  domain: string
  authenticatorData: string
  scope: number
  encoding: string
  requestId?: string
  hdPath?: string
}

export interface SignDataParams {
  providerId: string
  items: LiquidStdSigData[]
}

export interface SignDataResult {
  providerId: string
  /** base64url signature per item, `null` where the wallet declined that item. */
  signatures: (string | null)[]
}

export interface LiquidPeerMetadata {
  name: string
  description: string
  url: string
  icons: string[]
}

export interface HelloParams {
  providerId: string
  metadata: LiquidPeerMetadata
}

export interface HelloResult {
  providerId: string
  wallet: string
  name?: string
  version?: string
  methods?: string[]
}

export class LiquidProviderError extends Error {
  code: number
  data?: unknown
  constructor(message: string, code: number, data?: unknown) {
    super(message)
    this.name = 'LiquidProviderError'
    this.code = code
    this.data = data
  }
}

// ---------- Deep link ---------------------------------------------- //

export interface LiquidDeepLink {
  /** `https://<host>[/<path>]` — the signaling service the wallet must authenticate against. */
  origin: string
  requestId: string
}

export function generateLiquidDeepLink(origin: string, requestId: string): string {
  if (!origin) throw new Error('Origin is required')
  if (!requestId) throw new Error('Request id is required')
  const host = origin.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return `${LIQUID_SCHEME}${host}/?requestId=${encodeURIComponent(requestId)}`
}

export function parseLiquidDeepLink(uri: string): LiquidDeepLink {
  const trimmed = uri.trim()
  if (!trimmed.toLowerCase().startsWith(LIQUID_SCHEME)) {
    throw new Error('Not a liquid:// link')
  }
  const rest = trimmed.slice(LIQUID_SCHEME.length)
  const queryIndex = rest.indexOf('?')
  const location = (queryIndex === -1 ? rest : rest.slice(0, queryIndex)).replace(/\/+$/, '')
  const query = queryIndex === -1 ? '' : rest.slice(queryIndex + 1)
  const requestId = new URLSearchParams(query).get('requestId') ?? ''
  if (!location) throw new Error('liquid:// link has no origin')
  if (!requestId) throw new Error('liquid:// link has no requestId')
  return { origin: `https://${location}`, requestId }
}

// ---------- Encoding ----------------------------------------------- //

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Decodes base64url **or** standard base64, with or without padding. */
export function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function newMessageId(): string {
  return crypto.randomUUID()
}

/** CBOR-encode a message and wrap it as a base64url string for the data channel. */
export async function encodeLiquidMessage(message: LiquidMessage): Promise<string> {
  const { encode } = await import('cbor-x')
  return toBase64Url(encode(message))
}

/** Inverse of {@link encodeLiquidMessage}. Throws on malformed input. */
export async function decodeLiquidMessage(payload: string): Promise<LiquidMessage> {
  const { decode } = await import('cbor-x')
  const message = decode(fromBase64Url(payload)) as LiquidMessage
  if (!message || typeof message !== 'object' || typeof message.reference !== 'string') {
    throw new LiquidProviderError('Malformed Liquid message', LiquidErrorCode.invalidInput)
  }
  return message
}

export function isLiquidResponse(message: LiquidMessage): message is LiquidResponseMessage {
  return typeof (message as LiquidResponseMessage).requestId === 'string'
}

export function buildRequest<P>(reference: string, params: P): LiquidRequestMessage<P> {
  return { id: newMessageId(), reference, params }
}

export function buildResponse<R>(
  request: Pick<LiquidRequestMessage, 'id'>,
  reference: string,
  result: R
): LiquidResponseMessage<R> {
  return { id: newMessageId(), requestId: request.id, reference, result }
}

export function buildErrorResponse(
  request: Pick<LiquidRequestMessage, 'id'>,
  reference: string,
  error: LiquidErrorPayload
): LiquidResponseMessage<never> {
  return { id: newMessageId(), requestId: request.id, reference, error }
}
