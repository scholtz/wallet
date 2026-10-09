# Biatec Direct — relay-free popup transport

A third way for dApps to reach the wallet, next to WalletConnect and Liquid Auth. The dApp opens
the wallet in a **popup** on the same device and both pages talk over `window.postMessage`.
No relay server, no signaling server, no internet round-trip: it works for `http://localhost`
dApps and offline (PWA) installs. The dApp side is the `direct` method of
[`biatec-wallet-use-wallet-client`](https://github.com/scholtz/biatec-wallet-use-wallet-client)
(normative copy of the protocol: `docs/DIRECT_PROTOCOL.md` there).

Design rationale and the comparison with Lute, Pera Web, Coinbase Wallet SDK, Porto, Albedo,
Safe, EIP-6963/7039: issue [#192](https://github.com/scholtz/wallet/issues/192).

## User flow

1. On the dApp the user clicks **Connect → Biatec Wallet → Open wallet** (a real click: browsers
   block popups opened without a user gesture).
2. The wallet opens at `/direct`. If it is locked the normal login is shown **in the popup**;
   after unlocking the popup stays on `/direct`.
3. The popup shows the dApp's **browser-verified address** (`event.origin`), the network and the
   accounts to share (only the last active account is pre-selected). Approve or reject.
4. The popup answers and closes itself. The grant (origin → accounts) is stored in the encrypted
   wallet and listed, revocable, on **Connect → Direct**.
5. Every signature opens a **new** popup with the request, the same review tables as WalletConnect
   and an explicit approval. There is never silent signing.

## Security model

| Rule | Where enforced |
| --- | --- |
| Popup only (never an iframe): clickjacking, partitioned storage, Safari WebAuthn | `shared/direct.ts` refuses when `window.top !== window`; nginx `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| Needs an opener and a valid `?origin=` hint (https, or http on loopback only, canonical form) | `shared/direct.ts`, `scripts/direct/protocol.ts` `parseDappOrigin` |
| Every inbound message must have `event.origin === hint` **and** `event.source === window.opener`, otherwise it is ignored with no reply | `shared/direct.ts` |
| Every outbound message uses the hinted origin as `targetOrigin`, never `"*"`; `ready` carries nothing secret | `shared/direct.ts` |
| Exactly **one** request per popup, within 30 s of `ready`; a second one is answered `4200` | `DirectRequestGate` |
| The channel is **single-use for the window's lifetime**: a reload or a lock/unlock cycle never announces `ready` again (the popup then asks the user to start over from the site) | `shared/direct.ts` (`sessionStorage` + in-page flag) |
| The origin is the identity; name/icon from the dApp are shown as unverified, icons are not rendered | `DirectPopup.vue` |
| Signing needs a prior grant for that origin (`4100` otherwise); every transaction sender / ARC-60 signer must be a granted account | `store/direct.ts` + shared guards (`scripts/liquid/guards.ts`) |
| Any network is supported: the wallet signs on every chain a dApp uses and never compares the request with its selected network. The request `genesisHash` must be well-formed (`4200` otherwise), every transaction must carry exactly that genesis hash (`4200`) and, for a **known** network, a non-empty genesis ID must be that network's (e.g. `testnet-v1.0`; `4200`), so a request cannot show one network and sign for another. The popup shows the network on every request (name, "Test network" badge, a warning for an unrecognised network with its genesis hash, a note when it differs from the wallet's selected network). Asset names, ARC-56 details and the node preview come from the wallet's own network and are shown only when the request is on the wallet's selected network. The site grant is per origin and accounts, not per network | `resolveRequestNetwork`, `genesisIdConsistent`, `txnGenesisMatches`, `store/direct.ts` |
| ARC-0060: the domain must equal the verified origin's `hostname` or its `host` (hostname plus a non-default port, which is what use-wallet sends); another host or port is refused | `signer/signArc60Data` with `sessionOrigin = event.origin` |
| An unanswered request is answered `4001` on `pagehide`, logout, auto-lock or when the opener closes | `shared/direct.ts`, `direct/reset` |
| Grants are persisted with a read-modify-write against the stored record (under a cross-tab Web Lock), and `saveWallet` takes the persisted value of shared items, so neither a stale main tab nor a concurrent popup can restore a revoked grant or drop a new one | `wallet/wcUpdateItemFresh`, `wallet/saveWallet` |
| Only transactions the compact popup shows **completely** are signed: payments, asset transfers (with the clawback source) and calls to existing apps (with their OnComplete). Asset configuration, freeze, key registration, state proofs, heartbeats and app creation/update are refused with `4200` (use WalletConnect for those) | `directUnsupportedReason`, `store/direct.ts` |
| Responses are idempotent: a request is answered once; an unexpected failure answers `4000` and ends the request instead of leaving the site waiting | `store/direct.ts` |

### What this does not protect against

- **A compromised wallet origin** (the MyAlgo lesson: CDN/front-end injection). The transport does
  not change that risk; keep CSP/SRI/pinned dependencies on the wallet origin.
- **A phishing wallet** that imitates this one. The adapter pins the wallet origin; the user must
  still open the wallet from the real address.
- **Any script on the dApp page** can read messages the popup sends to that origin (`message`
  events are page-wide). A `MessagePort` hand-off is a possible hardening (v1.1).

## Protocol

Messages are plain objects (structured clone), ARC-0027 envelopes:
`{ id, reference, params }` → `{ id, requestId, reference, result | error }`.

```
dApp                                            wallet popup
 window.open(wallet/direct?origin=<dApp origin>)
                                                (unlock if locked)  → posts to opener, targetOrigin = hint
        ◄── { v:1, reference:"biatec:direct:ready", capabilities:{ methods, genesisHashes } }
 ──► { id, reference:"arc0027:enable:request", params:{ providerId, genesisHash, metadata } }
        ◄── { …, reference:"arc0027:enable:response", result:{ providerId, genesisHash, accounts:[{address}] } }   (addresses only; account names are private)
 ──► arc0027:sign_transactions:request  params:{ providerId, genesisHash, txns:[{txn, signers?, authAddr?, msig?, stxn?}] }
        ◄── …:response  result:{ providerId, stxns:[base64url | null] }
 ──► arc0060:sign_data:request          params:{ providerId, genesisHash?, items:[StdSigData] }   (genesisHash optional; if present it must be well-formed and is shown to the user)
        ◄── …:response  result:{ providerId, signatures:[base64url | null] }
 ──► arc0027:disable:request            (revokes the grant of the sender's origin)
```

Errors use the Liquid/ARC-0027 codes: `4001` rejected, `4003` method not supported,
`4100` not connected / unauthorized signer, `4200` invalid (malformed `genesisHash`, a transaction for another
genesis hash or with a contradicting genesis ID, second request), `4000` limits. `4004` (network not supported)
is no longer returned: a request for a different network than the wallet's selected one is signed.

`genesisHash` is base64 or base64url of the 32-byte hash, padded or not. **Compare hashes by decoded
bytes**: the wallet answers `enable` with a *normalized* hash (base64url, no padding).

`providerId` in a **response** identifies the *wallet* (a fixed id) and is not an echo of the dApp's
`providerId`; the dApp must not compare the two. Authenticity of a response comes from the browser
(`event.origin` + `event.source`) and from the `requestId` correlation.

Reserved: `capabilities.genesisHashes` is currently empty; `capabilities.methods` lists the full
request references the wallet implements. Error payloads are `{ code, message, providerId }`.

## Rules for dApp implementers

- Open every request with `window.open` from a real user gesture, with a **unique window name per
  request** and the popup URL `<wallet>/direct?origin=<encodeURIComponent(location.origin)>`. A reused
  name can navigate a popup that is still open from an earlier request; the wallet treats a window
  as single-use and will not announce `ready` again (the user sees "start over from the site").
- Only `https:` origins and `http:` loopback origins (`localhost`, `*.localhost`, `127.0.0.1`, `[::1]`;
  no trailing dot) are accepted; anything else gets an error page in the popup and **no message**.
- Wait for `ready` (checking `event.origin` and `event.source`), then send the single request
  immediately; close the popup yourself if the request fails locally.
- `biatec-wallet-use-wallet-client` implements all of this.

## Hosting requirements

- Serve the wallet with `Content-Security-Policy: frame-ancestors 'none'` (done in
  `docker/default.conf`).
- **Do not** serve `Cross-Origin-Opener-Policy: same-origin` on the wallet or on the dApp: it
  severs `window.opener`. `same-origin-allow-popups` is fine.

## Testing locally

Run the wallet on `http://localhost:8080` and a dApp on another origin, e.g.
`http://127.0.0.1:5173` or `http://localhost:5173` (different port = different origin). The
Playwright spec `playwright/e2e/direct-popup.spec.ts` does exactly this with a fixture dApp.
