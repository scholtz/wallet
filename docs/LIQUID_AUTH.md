# Liquid Auth dApp connections

Biatec Wallet can connect to dApps with **Liquid Auth**, the Algorand Foundation's
passkey-authenticated, peer-to-peer alternative to WalletConnect
(<https://liquidauth.com>, <https://github.com/algorandfoundation/liquid-auth>). The dApp side
is the `biatecLiquid()` adapter of
[biatec-wallet-use-wallet-client](https://github.com/scholtz/biatec-wallet-use-wallet-client)
for `@txnlab/use-wallet` v5; the normative protocol description lives there in
`docs/LIQUID_AUTH_PROTOCOL.md`. This page covers the wallet side and deployment.

## User flow

1. The dApp shows a `liquid://liquid.biatec.io/?requestId=<uuid>` link (usually as a QR code).
2. In the wallet: **Connect → Liquid Auth** tab, paste / scan the link, pick the account to
   expose, click **Connect with passkey**.
3. The browser asks for a passkey (Windows Hello, Touch ID, security key…). The first time for a
   given account and service a passkey is created; later connections reuse it.
4. The session appears in the sessions table with status *Connected*. Signing requests from the
   dApp show up in the same request tables as WalletConnect requests (transactions with the
   simulation preview, ARC-60 data-signing requests) and are approved the same way.

Only accounts whose signing key is stored in the wallet (standard ed25519 / ARC-76 / HD
accounts) can be linked: the service requires the account key's signature over its challenge.
Ledger, multisig, 2FA and Falcon accounts are not offered.

## What happens under the hood

- **Authentication** (`src/scripts/liquid/webauthn.ts`): FIDO2 attestation/assertion against the
  service named in the link, with the `liquid` extension `{ type: 'algorand', address,
  signature, requestId, device }`. The challenge is signed by `signer/signLiquidChallenge`
  (raw ed25519 over the challenge bytes, rekeys resolved like ARC-60 signing). The credential
  id is persisted per `(service, address)` in the encrypted wallet blob (key
  `liquid:cred:<origin>:<address>` via the generic `wallet/wcSetItem` storage).
- **Signaling + WebRTC** (`src/shared/liquid.ts`): socket.io to the service with the session
  cookie; the wallet is the *offer* peer: it creates the `liquid` data channel, emits
  `offer-description` / `offer-candidate`, applies the dApp's answer, and renegotiates when the
  service's `presence` event shows both peers present but the channel closed (e.g. the dApp
  reloaded). ICE uses public Google STUN servers.
- **Messages** (`src/scripts/liquid/protocol.ts`, `src/store/liquid.ts`): ARC-0027 envelopes,
  CBOR + base64url. Handled references: `biatec:hello:request` (answered with the connected
  address, wallet name and supported methods), `arc0027:sign_transactions:request` (ARC-0001
  transactions → `StoredRequest` with `ver: "liquid"`), `arc0060:sign_data:request` (ARC-0060
  items → `StoredSignDataRequest`). Anything else gets error `4003`.
- **Responses**: `sign_transactions` returns the signed transaction bytes positionally with
  `null` for unsigned positions; `sign_data` returns one base64url signature per item. User
  rejection returns error `4001`.
- **Trust model**: the service proves *the wallet* to the dApp (passkey + account signature),
  not the dApp to the wallet. The dApp's name/URL come from its hello message and are shown to
  the user; ARC-60 signing additionally requires the request's domain to match that declared
  URL (`signer/signArc60Data` with `sessionOrigin`), mirroring the WalletConnect checks.
- **Lifecycle**: `liquid/reset` closes every connection on logout / wallet switch (next to
  `wc/reset`); `liquid/disconnect` closes one pairing.

## Deploying the Liquid Auth service

Passkeys can only be created for the domain of the page that creates them, so the service
used with this web wallet must be hosted under the wallet's domain. Biatec runs it at
`https://liquid.biatec.io` for `https://wallet.biatec.io`; a self-hosted wallet needs its own
instance. Use the stock server image from `algorandfoundation/liquid-auth` with:

```
RP_NAME="Biatec Wallet"
HOSTNAME=biatec.io                 # WebAuthn RP ID: the wallet's registrable domain
ORIGIN=https://wallet.biatec.io    # WebAuthn origin the passkeys are created from
SESSION_SECURE=true
SESSION_SECRET=<random secret>
DB_HOST=… DB_USERNAME=… DB_PASSWORD=… DB_NAME=liquid   # MongoDB
REDIS_HOST=… REDIS_PORT=6379                           # Redis (socket.io adapter + auth events)
ALGOD_SERVER=https://mainnet-api.4160.nodely.dev       # resolves rekeyed accounts when verifying signatures
```

Reverse proxy / ingress requirements (both the wallet and every dApp are cross-origin to the
service):

- CORS with credentials for the wallet origin on `/attestation/*`, `/assertion/*`, `/auth/*`:
  `Access-Control-Allow-Origin: https://wallet.biatec.io`,
  `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Headers: Content-Type`, and
  answer `OPTIONS` preflights — the stock server does not enable CORS on its REST routes
  (socket.io is already open to any origin).
- WebSocket upgrades for `/socket.io/`.
- HTTPS only (secure cookies, WebAuthn).

`wallet.biatec.io` → `liquid.biatec.io` is same-site, so the default (Lax) session cookie is
sent on the wallet's fetches; no `SameSite=None` change is needed.

### Kubernetes / CI

`k8s/deployment-liquid-auth-stage.yaml` (`https://stage.liquid.biatec.io`, passkey origin
`https://stage.wallet.biatec.io`) and `k8s/deployment-liquid-auth-stable.yaml`
(`https://liquid.biatec.io`, passkey origin `https://wallet.biatec.io`) deploy the service
(API + MongoDB + Redis) into the `awallet` namespace with the two ingresses implementing the
CORS and WebSocket requirements above. `.github/workflows/liquid-auth.yml` applies them with
the wallet's Stage → Production flow; the GitHub secrets to configure and the domain/passkey
caveats are documented in `k8s/README.md` → "Liquid Auth service".

## Testing locally

1. Run the service (`docker compose` in the liquid-auth repo) behind an HTTPS hostname that is a
   parent/sibling of the wallet's dev hostname (e.g. `liquid.wallet.localhost` with mkcert,
   `HOSTNAME=wallet.localhost`, `ORIGIN=https://wallet.localhost:8080`), or an ngrok domain.
2. Run the dApp example from the adapter repo (`examples/react-ts`) with
   `biatecLiquid({ origin: 'https://<your service>' })`.
3. In the wallet, open **Connect → Liquid Auth**, paste the link from the example, approve the
   passkey, then sign the example's 0 ALGO self-payment and ARC-60 message.

Unit tests for the protocol codec: `pnpm run test:unit` (`playwright/unit/liquidProtocol.spec.ts`).
