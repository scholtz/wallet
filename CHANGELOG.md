# Changelog

This document tracks the evolution of AWallet, an open-source Algorand wallet, since its first commit in May 2021. It is a running history of the features that have shipped over time, written for people who use the wallet rather than people who build it.

## 2026-10

- Security hardening from the latest audit: wallets opened in two browser tabs no longer lose an account created in the other tab, a stale tab can no longer undo a password change (it is locked and asks you to sign in again), passwords must be at least 8 characters, creating a new wallet never copies the keys of an open wallet, dApp requests with an incomplete transaction group (send the whole group) or a foreign network hash are refused, creating a second wallet closes the open one first, WalletConnect v1 requests now get the same safety checks as v2, and the Direct window warns when a site asks you to sign on a different network than it was connected on and refuses app calls on unrecognised networks.
- The "Direct" window now signs on every network, not only the one selected in the wallet: a site can ask for a signature on Algorand Testnet, Voi, Aramid or any other chain, and the window always tells you clearly which network you are signing on (with a "Test network" badge, and a warning when the network is not one the wallet knows). For a network other than the selected one, asset names and app details from the wallet's own network are not shown, and amounts use that network's own currency.
- The "Direct" window that a website opens to use your wallet is now much larger and easier to read: it grows to a comfortable size on its own (even when the website opens it small), and the notice at the top of the unlock screen is a clear card that names the website, instead of small blue text on the teal background.
- New "Direct" way to use the wallet with websites and apps (dApps) running in your own browser: a site opens the wallet in a small popup window, you review its verified address and approve, and the signature goes straight back to that site. Nothing is sent through the internet or a relay server, it works with locally-run dApps (`localhost`) and when you are offline, and every signature needs your explicit approval in a fresh popup. Connected sites are listed (and can be disconnected) on the Connect page's new "Direct" tab.
- Security hardening from the latest audit: Liquid Auth now only links with trusted services and refuses unsafe challenges, dApp sign requests for accounts outside the approved session are rejected, asset opt-out shows where the remaining balance will go and needs the indexer to confirm the asset creator, and the ARC-56 "trusted" badge is no longer shown on custom nodes.
- Fixed signing a group of WalletConnect transactions with a multisig account: after signing one transaction and choosing "Return to WalletConnect", you now return to the Connect page with your account selected, so signing the next transaction in the group no longer ends in a 404 page.
- The account overview now suggests converting USDC you hold to Folks Finance fUSDC to earn a yield on it: a message with a "Convert USDC to fUSDC" button opens the Swap page with USDC (and fUSDC, once your account has opted in) preselected. The Folks lending panel on the Swap page was also redesigned to match the regular swap form, with its Deposit/Withdraw button in the second column.
- Signing with a Ledger device now shows a spinner and a clear "confirm on your Ledger" message on the Connect, Pay and other signing pages, so you know to look at the device and approve the transaction.
- The Swap page can now convert USDC to Folks Finance fUSDC (and back): pick USDC and fUSDC as the source and destination asset and the quote form is replaced by a Folks Finance lending panel that shows the fUSDC you receive, the current exchange rate and the APY. The assets you select choose the direction (deposit or withdraw), and the "⇅" button flips it. Selecting USDC as the source offers a one-click "Opt in to fUSDC" button when your account has not opted in yet, and fUSDC is then selected as the destination automatically. The FAQ (Swapping & DeFi) explains step by step how it works and what the risks are. Mainnet only. Fixed deposits and withdrawals failing with "dynamic cost budget exceeded" by adding the extra budget call the Folks pool needs.
- You can now opt out of an asset directly from the account asset list (red cross button on ASA rows), which frees the 0.1 ALGO minimum balance it was holding. A confirmation dialog warns you if you still hold a balance, since the remainder is returned to the asset creator.
- Zero-balance assets are now hidden by default in the account asset list, and the asset dropdowns when making a payment or scheduling one only offer assets you actually hold. A "Show only assets with a balance" checkbox lets you bring the empty ones back.

## 2026-09

- The FAQ page has been expanded and revised: new sections on the Algorand and Voi ecosystem (what Voi is, the ARC-56 registry and the risk icon, ARC-200 tokens, governance) plus new answers on opt-in, minimum balance, failed transactions, exchange memos, scams and recovery. Several existing answers were corrected and clarified. You can also switch the language with the flags at the top of the FAQ, without unlocking the wallet.
- A risk icon now appears next to "Sign all" on smart-contract requests, so you no longer need to open the transaction list: a green verified badge for a registry-verified contract from a low-risk GitHub publisher, an orange warning when the contract is not in the ARC-56 registry or its publisher is unknown or low-reputation, a red icon when the publisher is on the registry ban list or the called method is not part of the registered contract, and a warning for app creation/update/delete or a close-out/rekey in the same request, and an orange question mark when none of the calls follow the ABI format (so they cannot be verified). Publishers now also show their registry reputation rating.
- WalletConnect/Liquid Auth requests that call a smart contract now show an application-call summary above the transaction table, so you can see whether the app's code is verified in the public ARC-56 registry - and, if so, which GitHub account(s) published it - without expanding every transaction to check. If no known publisher is found, you'll see a clear warning instead.
- ARC-14 app authentication requests (e.g. "Authenticate to BiatecDEX") now also show which account is being asked to sign, so it's clear which one you're logging in with when the wallet holds several. Clicking Authenticate now signs and sends the result back to the dApp immediately, instead of requiring a separate "Send back" click.
- Liquid Auth pairings as alternative to wallet connect.
- Fixed Liquid Auth sessions getting stuck connecting after a page refresh when a dApp requests a signature; unavailable peers now return to a retryable waiting state.

## 2026-08

- Added post-quantum secure accounts using the Falcon 1024 signature scheme (New account > Advanced > Post-Quantum Account (Falcon 1024)). The key pair is derived from a standard 25-word Algorand mnemonic, which you can back up and restore like any other account; signatures are designed to resist attacks by quantum computers. Note that Falcon 1024 signatures are larger than regular ones, so transactions from these accounts pay a higher network fee.
- The wallet now simulates every payment on the Algorand node before signing and automatically raises an insufficient fee to exactly what the network requires (for example 0.003 ALGO for post-quantum Falcon 1024 accounts under the network's new usage-based fee model), up to a safety cap of 0.1 ALGO — never more than the network actually charges. The transaction review screen shows the simulated network fee and the maximum fee alongside the declared fee, and tells you when the fee was adjusted.
- Fixed the Biatec Router route summary on the Swap page: when the router splits a swap across several legs, the displayed INPUT amount now shows the total paid across all legs instead of only the first leg's input, so quotes are no longer misread as worse than they are.
- Added support for ARC-60 arbitrary data signing over WalletConnect: connected DApps can now request an authentication signature over arbitrary data (not just transactions), which the wallet displays with the requesting domain, purpose, and full data preview before signing — and refuses to sign if the request's domain binding doesn't match, to protect against spoofed sign-in requests.
- Improved DEX aggregator swaps (Deflex, Folks Router, Biatec Router, Biatec Stage Router)
- Biatec Router swaps are now available on Testnet, not just Mainnet.
- When using a custom network (Settings > Network > Custom), the Swap page now asks whether your custom network behaves like Mainnet or Testnet, so swaps can be enabled there too.
- The Swap page now has a slippage protection toggle, enabled by default. Turning it off shows a clear warning that a simulated quote can differ from the actual on-chain result and removes the minimum-received safeguard across all three swap providers (Deflex, Folks Router, Biatec Router).
- Transaction review screens (the sign page, sign-all page, and WalletConnect requests) now label an asset opt-in for what it is: a zero-amount asset transfer you send to yourself to start accepting a token is shown as "Asset opt-in" instead of a generic asset transfer, so it's clearer what a DApp is actually asking you to sign.
- Made the app easier to scan visually: major screens (accounts, payments, swap, settings, WalletConnect, asset lists and more) now have a teal icon badge next to their title, every account-creation option shows a distinctive icon, empty lists show a friendly illustration-style placeholder instead of a bare text line, and the payment-success screen got a celebratory checkmark illustration.
- The account Assets list and the wallet-wide Assets Overview now show a USD Value column for each held asset, sorted from highest to lowest value by default, so it's easier to see what your holdings are worth at a glance.

## 2026-07

- Added HD wallet support (BIP32-Ed25519 / ARC-52), allowing a single 24-word recovery phrase to generate multiple independent accounts ("iterations"), with the ability to generate additional accounts on demand.
- Added an account rekey synchronization check so the wallet keeps rekeyed-account status up to date automatically.
- Migrated the end-to-end test suite to Playwright alongside existing Cypress tests, and added a locale-synchronization check to keep all language files consistent.
- Major UI framework upgrade to PrimeVue 4, including a new light/dark mode toggle, refreshed navigation, and consistent page styling across the app.
- Added an Assets Overview page for browsing and managing asset profiles across accounts, with selectable rows for quick actions.
- Added an in-app Changelog page (linked from the Help menu) so users can see the wallet's feature history at a glance.
- Fixed the navbar staying in English after switching language on the login screen.
- Fixed the WalletConnect signature-request notification badge not appearing for incoming requests unless the Connect page had already been visited in that session; WalletConnect now connects as soon as the wallet is opened.
- The footer now shows the wallet's build version (git commit and build date), so you can always see exactly which version you're running — including a clear "local build" label when running the wallet from source. The build version is also shown at the top of the Changelog page.
- Redesigned the footer into a single line highlighting our security audits, Biatec Group, and our Discord community, with the wallet automatically branding itself as "Biatec Wallet" when accessed on a biatec.io domain.
- The FAQ, Changelog and Privacy Policy pages are now directly accessible from the top-level navigation menu before logging in.
- Redesigned the login, new-wallet and import-wallet screens into a compact centered card with clearer labels and full-width buttons, keeping the form fully visible and centered on any screen size.
- Improved the mobile experience across the app: QR codes now scale to fit the screen instead of forcing horizontal scrolling, wide transaction/asset tables scroll within their own area, long addresses and payment links wrap instead of overflowing, and the camera view for scanning a mnemonic stacks below the form on small screens.
- Added professional imagery to the login, new-wallet, import-wallet and "page not found" screens on desktop, and made the bottom status bar match the top navigation bar's rounded, translucent styling for a more consistent look.
- Added ARC-56 smart contract call decoding to the transaction-review screens (WalletConnect requests and multi-signature signing): when you're about to sign a call to a smart contract, the wallet now looks up the contract's method and argument names/descriptions from the public ARC-56 registry and shows them to you in plain language instead of raw bytes, with addresses linking to the Biatec Algorand explorer. Every explanation is clearly labeled as either verified against the exact contract you're calling, only a suggestion from a similarly-named contract, or completely unrecognized, so you always know how much to trust it — the raw, unmodified call data is still shown alongside it either way.
- Added an "Explore routes" button to the Swap page: after getting a quote, you can expand an inline (mobile-friendly, no popup) breakdown showing exactly which pools and protocols each enabled DEX aggregator (Haystack, Folks Router, Biatec Router) plans to route your swap through, including the amount moving in and out of each hop, price impact, and network fees — with one-click copy buttons on every figure and on the raw quote data. It also dry-runs the actual prepared swap transactions against the live network (no signature or funds movement needed) to show the real simulated amount you'd pay and receive, alongside the aggregator's own estimate.
- Added a Simulation section to every "transactions to sign" screen (WalletConnect requests and multi-signature signing): before you sign, the wallet dry-runs the exact transaction group against the current network state and shows your real net asset outcome — e.g. depositing two assets into a pool and receiving an LP token, withdrawing an LP token for the underlying assets, or a multi-hop swap collapsing to what you'd actually pay and receive — plus every application state change it would cause, with variable names and properly-typed values (e.g. large numbers) looked up from the app's public ARC-56 contract description when available, including changes made by inner transactions. If the group would fail, the failure reason is shown up front instead of only after signing and submitting. A disclaimer makes clear the simulated outcome isn't guaranteed and that DeFi transactions should still use an in-app minimum-received or slippage setting for protection.

## 2026-01

- Upgraded the underlying Algorand SDK (algosdk) to a newer major version.
- Added a progress spinner shown while a transaction is being signed.
- Added a "copy token" convenience action with localization on the ARC-14 developer page.
- Improved reliability of asset selection and asset-type handling in the swap feature.
- After opting into an asset, the wallet now takes the user directly to that asset's detail page.
- Switched ARC-200 asset transfers to use algosdk's transaction composer for more reliable transaction building.

## 2025-11 to 2025-12

- Added the ability to copy a WalletConnect request payload to the clipboard for troubleshooting.
- Added the Biatec Router as a new swap option, alongside Deflex and Folks Finance, with a redesigned swap screen (separate, clearer steps for choosing assets, entering amounts, setting slippage, and reviewing/executing the trade).
- Improved swap asset selection reliability and precision for token amounts.
- Added a session-timeout warning dialog that appears shortly before an inactive session is automatically locked.

## 2025-07 to 2025-09

- Switched the Deflex swap integration to its updated endpoint.
- Added comprehensive contributor/developer documentation and upgraded the underlying Node.js tooling.
- Upgraded the automated test suite (Cypress) with TypeScript support for more reliable testing.
- Fixed a Czech translation issue.

## 2025-01

- Added Algorand staking support directly in the wallet.
- Updated Voi network token symbol display.

## 2024-09 to 2024-11

- Fixed WalletConnect multisig payment handling.
- Added the ability to bring a multisig account online for participation directly from the wallet.
- Added a custom key registration (participation key) form for setting up consensus participation.
- Improved the multisig review screen and overall swap experience, including better swap quote accuracy.
- Improved account-import experience when a recovery phrase word is mistyped.

## 2024-07

- Rebranded visual assets (new logo, teal color scheme) as the project became known as "Biatec Wallet".
- Improved handling of asset boxes for smart-contract based assets.
- Added support for using multiple addresses within a single WalletConnect session.

## 2024-05 to 2024-06

- Improved the basic (standard) account creation flow.
- Added a dedicated create/open-wallet screen redesign, simplifying onboarding.
- Improved the transaction signing experience.

## 2024-04

- Fixed account export links and improved the account refresh behavior after swaps and logins.
- Added a transaction scheduler for setting up payments to be sent later.

## 2024-03

- Fixed handling of rekeyed accounts across the app.
- Added security hardening (X-Frame-Options) to help prevent clickjacking.

## 2024-02

- Added Spanish (es) language support.
- Major visual redesign: introduced 10 selectable themes and removed the old Bootstrap-based styling in favor of a modern component library.
- Added progress spinners for long-running actions.
- Reworked how account and network data are structured internally, improving reliability of account data shown across pages.
- Added ARC-200 smart-contract token support (view balances, transfer, opt in).
- Added Turkish (tr) language support.
- Added a JSON viewer for inspecting an account's local state and application data on the Account Overview page.
- Added keyword search on the Account Overview page.

## 2024-01

- Fixed and improved multisig transaction signing, including support for multisig accounts to create new assets.
- Added multisig support for rekeyed accounts on other networks.

## 2023-10 to 2023-12

- Fixed asset lists to correctly reflect the selected network.
- Added full account export together with Shamir's Secret Sharing backup, letting users split their backup into multiple recoverable shares.

## 2023-07 to 2023-09

- Added the ability to sign and submit multiple transactions in one batch ("Sign All").
- Added a small delay between successive signature requests to better support Ledger hardware wallets.
- Improved detection of whether an account (including rekeyed accounts) is currently able to sign.
- Added a clearer online/offline participation status dialog.
- Improved the payment gateway feature.
- Added multi-chain currency formatting so amounts display correctly across different networks/locales.
- Added support for the Folks Finance router and a configurable Deflex API key in the swap feature.

## 2023-04 to 2023-06

- Added WalletConnect support, allowing the wallet to connect to and sign for external decentralized apps (DApps).
- Added a network-environment indicator so users can see at a glance which network (Mainnet/Testnet/etc.) they're on.
- Improved the new-account creation flow to take fewer steps.
- Added ARC-76 (email + password based deterministic) accounts, letting users derive an Algorand account from just an email and password instead of managing a seed phrase directly.
- Upgraded to WalletConnect v2.

## 2023-01 to 2023-03

- Added token swapping via the Deflex swap aggregator.
- Added a dedicated ARC-14 (authenticated API request signing) developer page.
- Switched default network configuration to use AlgoNode by default.
- Added hardware wallet support via Ledger devices.
- Set up a new CI/CD pipeline for automated deployment.

## 2022-09 to 2022-11

- Added the ability to make an account "online" for Algorand consensus participation, directly from the wallet.
- Added developer-mode settings, hidden from regular users by default.
- Improved handling of empty/zero balances so accounts don't show stale information.
- General translation fixes for American English.
- Better error messaging when an asset isn't configured correctly.

## 2022-04 to 2022-06

- General reliability fixes around account information lookups and default network configuration.
- Added automated end-to-end testing (Cypress) to help catch regressions before release.
- Added finer precision options when creating new assets.

## 2022-01 to 2022-03

- Added sanity checks before sending a payment (e.g. verifying the destination address).
- Added multisig opt-in support and fixed multisig asset sending.
- Added the ability to send an already-signed (offline-prepared) transaction.
- Added account rekeying support for both standard and multisig accounts.
- Raised the maximum number of assets a wallet can track.

## 2021-10 to 2021-12

- Improved asset (ASA) creation flow and cleaned up related screens.
- Added the ability to see asset transfer amounts directly in the transaction list, and to view transaction groups in the transaction detail screen.
- Added local caching of asset information for faster loading.
- Added ASA statistics and vote-coin (governance token) improvements.
- General payment screen improvements, including better note/encoding handling.

## 2021-09

- Added a governance/voting system for participating in Algorand community votes.
- Added a donation page.
- Published AMS-0001 / ARC-0002-related documentation and links for the community.
- Added governance tooling and a DAO list.

## 2021-07 to 2021-08

- General stability and dependency updates; no major new user-facing features.

## 2021-06

- Added multi-language support (i18n), with initial translations for several languages including Slovak, Hungarian, and Dutch.
- Added the ability to create Algorand Standard Assets (ASAs) and to opt in, transfer, and view ASA balances.
- Added a QR code generator/scanner for receiving payments and for scanning payment requests.
- Added the ability to export an account's recovery phrase (mnemonic) as a QR code for paper backup, and to import a mnemonic via QR scan.
- Added support for custom node/indexer server and token configuration.
- Added a "vanity address" generator (search for an account address with a chosen pattern).
- Added a payment gateway feature for accepting Algorand payments.
- Registered the wallet as a browser handler for `algorand:` payment links.
- Added country flags and quick language switching on the login screen.
- Installed as a Progressive Web App (PWA) with offline/update support.

## 2021-05

- First public version of the wallet: create and open a wallet, protect it with a password, and view basic account information.
- Added support for multisig (multi-signature) accounts.
- Added standard ALGO payments between accounts.
- Added account import/export.
- Added a transaction detail view.
