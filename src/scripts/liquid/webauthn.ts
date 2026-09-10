/**
 * Liquid Auth passkey ceremonies for the wallet side.
 *
 * A Liquid Auth service (github.com/algorandfoundation/liquid-auth) authenticates a wallet with
 * a FIDO2/WebAuthn passkey that carries the "liquid" extension: the wallet also signs the
 * server's challenge with the Algorand account key, which binds the passkey to the account and
 * — through the `requestId` scanned from the dApp's QR code — links the wallet's session to
 * the dApp's pairing request.
 *
 * Because WebAuthn only lets a page create passkeys for its own registrable domain, the
 * service used with this web wallet must be hosted under the wallet's domain (RP ID
 * `biatec.io`, e.g. https://liquid.biatec.io) — see docs/LIQUID_AUTH.md.
 *
 * Every request is sent with `credentials: "include"`: the service keeps the challenge and the
 * resulting wallet session in an HTTP-only cookie, and the signaling socket must reuse it.
 */
import algosdk from "algosdk";
import { fromBase64Url, toBase64Url } from "./protocol";

export interface LiquidPasskeyCredential {
  credId: string;
  publicKey: string;
  prevCounter: number;
  device?: string;
}

export interface LiquidUser {
  id?: string;
  wallet: string;
  credentials: LiquidPasskeyCredential[];
}

export interface LiquidAuthResult {
  user: LiquidUser;
  /** Credential id the wallet authenticated with — persist it to use `assertion` next time. */
  credId: string;
}

export interface LiquidAttestationInput {
  address: string;
  requestId: string;
  /** Human readable device name stored with the passkey (shown to the user by the service). */
  device: string;
  /** Sign the service's challenge with the account's Algorand key (raw ed25519 signature). */
  signChallenge: (challenge: Uint8Array) => Promise<Uint8Array>;
}

export interface LiquidAssertionInput {
  credId: string;
  requestId: string;
}

export class LiquidAuthServiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "LiquidAuthServiceError";
    this.status = status;
  }
}

const jsonHeaders = { "Content-Type": "application/json" };

/** WebAuthn wants `BufferSource` backed by a plain ArrayBuffer (not a shared one). */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { error?: string; reason?: string };
      detail = payload?.error ?? payload?.reason ?? "";
    } catch {
      /* not JSON */
    }
    throw new LiquidAuthServiceError(
      `Liquid Auth service responded ${response.status}${detail ? `: ${detail}` : ""}`,
      response.status
    );
  }
  return (await response.json()) as T;
}

interface AttestationOptionsJson {
  challenge: string;
  rp: { name: string; id?: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  excludeCredentials?: { id: string; type: string; transports?: string[] }[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
}

interface AssertionOptionsJson {
  challenge: string;
  allowCredentials?: { id: string; type: string; transports?: string[] }[];
  rpId?: string;
  timeout?: number;
  userVerification?: UserVerificationRequirement;
}

function assertWebAuthn(): void {
  if (
    typeof navigator === "undefined" ||
    !navigator.credentials ||
    typeof PublicKeyCredential === "undefined"
  ) {
    throw new Error("Passkeys (WebAuthn) are not supported in this browser");
  }
}

/**
 * Register a new passkey with the service and link the wallet session to `requestId`.
 * Prompts the user's platform authenticator (Windows Hello, Touch ID, security key…).
 */
export async function liquidAttestation(
  origin: string,
  input: LiquidAttestationInput
): Promise<LiquidAuthResult> {
  assertWebAuthn();
  const base = origin.replace(/\/+$/, "");
  const options = await postJson<AttestationOptionsJson>(`${base}/attestation/request`, {
    username: input.address,
    displayName: input.device,
    authenticatorSelection: { userVerification: "required" },
    extensions: { liquid: true },
  });

  const challenge = fromBase64Url(options.challenge);
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: toArrayBuffer(challenge),
    rp: options.rp,
    user: {
      id: toArrayBuffer(algosdk.decodeAddress(input.address).publicKey),
      name: input.address,
      displayName: input.device,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    authenticatorSelection: {
      ...(options.authenticatorSelection ?? {}),
      userVerification: "required",
    },
  };
  if (options.timeout) publicKey.timeout = options.timeout;
  if (options.attestation) publicKey.attestation = options.attestation;
  if (options.excludeCredentials?.length) {
    publicKey.excludeCredentials = options.excludeCredentials.map((cred) => ({
      id: toArrayBuffer(fromBase64Url(cred.id)),
      type: "public-key",
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    }));
  }

  const credential = (await navigator.credentials.create({ publicKey })) as
    | PublicKeyCredential
    | null;
  if (!credential) {
    throw new Error("Passkey creation was cancelled");
  }
  const response = credential.response as AuthenticatorAttestationResponse;
  const signature = await input.signChallenge(challenge);

  const user = await postJson<LiquidUser>(`${base}/attestation/response`, {
    id: credential.id,
    rawId: toBase64Url(new Uint8Array(credential.rawId)),
    type: credential.type,
    response: {
      clientDataJSON: toBase64Url(new Uint8Array(response.clientDataJSON)),
      attestationObject: toBase64Url(new Uint8Array(response.attestationObject)),
      transports:
        typeof response.getTransports === "function" ? response.getTransports() : undefined,
    },
    clientExtensionResults: {
      liquid: {
        type: "algorand",
        address: input.address,
        signature: toBase64Url(signature),
        requestId: input.requestId,
        device: input.device,
      },
    },
  });
  return { user, credId: credential.id };
}

/**
 * Authenticate with a passkey registered earlier and link the session to `requestId`.
 * Throws `LiquidAuthServiceError` (404/401) when the service no longer knows the credential —
 * callers should fall back to {@link liquidAttestation}.
 */
export async function liquidAssertion(
  origin: string,
  input: LiquidAssertionInput
): Promise<LiquidAuthResult> {
  assertWebAuthn();
  const base = origin.replace(/\/+$/, "");
  const options = await postJson<AssertionOptionsJson>(
    `${base}/assertion/request/${encodeURIComponent(input.credId)}`,
    {}
  );
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: toArrayBuffer(fromBase64Url(options.challenge)),
    userVerification: options.userVerification ?? "required",
  };
  if (options.rpId) publicKey.rpId = options.rpId;
  if (options.timeout) publicKey.timeout = options.timeout;
  if (options.allowCredentials?.length) {
    publicKey.allowCredentials = options.allowCredentials.map((cred) => ({
      id: toArrayBuffer(fromBase64Url(cred.id)),
      type: "public-key",
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    }));
  }

  const credential = (await navigator.credentials.get({ publicKey })) as
    | PublicKeyCredential
    | null;
  if (!credential) {
    throw new Error("Passkey authentication was cancelled");
  }
  const response = credential.response as AuthenticatorAssertionResponse;
  const user = await postJson<LiquidUser>(`${base}/assertion/response`, {
    id: credential.id,
    rawId: toBase64Url(new Uint8Array(credential.rawId)),
    type: credential.type,
    response: {
      clientDataJSON: toBase64Url(new Uint8Array(response.clientDataJSON)),
      authenticatorData: toBase64Url(new Uint8Array(response.authenticatorData)),
      signature: toBase64Url(new Uint8Array(response.signature)),
      userHandle: response.userHandle
        ? toBase64Url(new Uint8Array(response.userHandle))
        : undefined,
    },
    clientExtensionResults: { liquid: { requestId: input.requestId } },
  });
  return { user, credId: credential.id };
}

/** Ends the wallet's session with the service (best effort). */
export async function liquidLogout(origin: string): Promise<void> {
  try {
    await fetch(`${origin.replace(/\/+$/, "")}/auth/logout`, {
      method: "GET",
      credentials: "include",
      redirect: "manual",
    });
  } catch {
    /* ignore */
  }
}
