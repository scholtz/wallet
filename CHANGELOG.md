# Changelog

This document tracks the evolution of AWallet, an open-source Algorand wallet, since its first commit in May 2021. It is a running history of the features that have shipped over time, written for people who use the wallet rather than people who build it.

## 2026-07

- Added HD wallet support (BIP32-Ed25519 / ARC-52), allowing a single 24-word recovery phrase to generate multiple independent accounts ("iterations"), with the ability to generate additional accounts on demand.
- Added an account rekey synchronization check so the wallet keeps rekeyed-account status up to date automatically.
- Migrated the end-to-end test suite to Playwright alongside existing Cypress tests, and added a locale-synchronization check to keep all language files consistent.
- Major UI framework upgrade to PrimeVue 4, including a new light/dark mode toggle, refreshed navigation, and consistent page styling across the app.
- Added an Assets Overview page for browsing and managing asset profiles across accounts, with selectable rows for quick actions.
- Added an in-app Changelog page (linked from the Help menu) so users can see the wallet's feature history at a glance.

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
