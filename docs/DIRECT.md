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
| The origin is the identity; name/icon from the dApp are shown as unverified, icons are not rendered | `DirectPopup.vue` |
| Signing needs a prior grant for that origin (`4100` otherwise); every transaction sender / ARC-60 signer must be a granted account | `store/direct.ts` + shared guards (`scripts/liquid/guards.ts`) |
| Network binding: the request `genesisHash` must be the wallet's active network (`4004`), and every transaction's genesis hash must equal it; unknown network fails closed (custom node excepted) | `checkRequestNetwork`, `txnGenesisMatches` |
| ARC-0060: the domain must equal the host of the verified origin | `signer/signArc60Data` with `sessionOrigin = event.origin` |
| An unanswered request is answered `4001` on `pagehide`, logout, auto-lock or when the opener closes | `shared/direct.ts`, `direct/reset` |
| Grants are persisted with a read-modify-write against the stored record so a stale tab cannot overwrite another tab's accounts | `wallet/wcSetItemFresh` |

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
        ◄── { …, reference:"arc0027:enable:response", result:{ providerId, genesisHash, accounts:[{address,name?}] } }
 ──► arc0027:sign_transactions:request  params:{ providerId, genesisHash, txns:[{txn, signers?, authAddr?, msig?, stxn?}] }
        ◄── …:response  result:{ providerId, stxns:[base64url | null] }
 ──► arc0060:sign_data:request          params:{ providerId, items:[StdSigData] }
        ◄── …:response  result:{ providerId, signatures:[base64url | null] }
 ──► arc0027:disable:request            (revokes the grant of the sender's origin)
```

Errors use the Liquid/ARC-0027 codes: `4001` rejected, `4003` method not supported,
`4004` network, `4100` not connected / unauthorized signer, `4200` invalid (also: second request),
`4000` limits.

`genesisHash` is base64 or base64url of the 32-byte hash. Reserved: `capabilities.genesisHashes`
is currently empty.

## Hosting requirements

- Serve the wallet with `Content-Security-Policy: frame-ancestors 'none'` (done in
  `docker/default.conf`).
- **Do not** serve `Cross-Origin-Opener-Policy: same-origin` on the wallet or on the dApp: it
  severs `window.opener`. `same-origin-allow-popups` is fine.

## Testing locally

Run the wallet on `http://localhost:8080` and a dApp on another origin, e.g.
`http://127.0.0.1:5173` or `http://localhost:5173` (different port = different origin). The
Playwright spec `playwright/e2e/direct-popup.spec.ts` does exactly this with a fixture dApp.
