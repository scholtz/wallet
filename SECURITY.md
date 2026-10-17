# Security Policy

Biatec Wallet (AWallet) is a non-custodial wallet: all key material is encrypted and stored locally on the user's device. We take the security of the application and of our users' funds very seriously, and we appreciate the work of security researchers who help us keep it safe.

## Supported Versions

Security fixes are provided for the latest production release only (deployed continuously from the `master` branch). Please verify that an issue reproduces on the latest version before reporting it.

| Version                               | Supported          |
| ------------------------------------- | ------------------ |
| Latest release (`master`)             | :white_check_mark: |
| Older releases and unmaintained forks | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, pull requests, or social media.**

Use one of the following private channels:

1. **GitHub Private Vulnerability Reporting (preferred):** [Report a vulnerability](https://github.com/scholtz/wallet/security/advisories/new)
2. **Email:** [wallet-security@biatec.io](mailto:wallet-security@biatec.io)

### What to include

To help us triage quickly, please provide as much of the following as possible:

- A clear description of the vulnerability and its potential impact (e.g. key disclosure, unauthorized signing, XSS, phishing vector).
- The affected component, page, or file, and the version or commit you tested.
- Step-by-step instructions to reproduce, including a proof of concept where possible.
- Your browser, operating system, and network (Mainnet, Testnet, etc.) if relevant.
- Any suggested mitigation or fix.

Please **do not include real private keys, mnemonics, or passwords** in your report. Use test accounts and test networks.

## Our Commitment

| Stage                          | Target                                        |
| ------------------------------ | --------------------------------------------- |
| Acknowledgement of your report | Within 3 business days                        |
| Initial assessment and triage  | Within 7 days                                 |
| Status updates                 | At least every 14 days until resolution       |
| Fix and coordinated disclosure | Depends on severity; typically within 90 days |

We will keep you informed of our progress, credit you in the published advisory (unless you prefer to remain anonymous), and coordinate the public disclosure date with you.

## Scope

In scope:

- The AWallet web application in this repository and its official deployments.
- Wallet and account handling: encryption, key derivation, signing, backup/export, and Ledger integration.
- DApp connectivity (WalletConnect and Liquid Auth) and transaction display/signing flows.
- Client-side vulnerabilities such as XSS, injection, insecure storage, and dependency vulnerabilities with a demonstrable impact.

Out of scope:

- Vulnerabilities in third-party services, the Algorand network, or dependencies that have no demonstrable impact on AWallet (please report these upstream).
- Social engineering, phishing of users, or physical attacks on a user's device.
- Denial-of-service or volumetric attacks, and automated scanner output without a demonstrated impact.
- Issues requiring a compromised device, browser, or browser extension.
- Missing best-practice headers or configurations without a practical exploit.

## Safe Harbor

We will not pursue legal action against researchers who act in good faith and:

- Make a good-faith effort to avoid privacy violations, data destruction, and service disruption.
- Only test against accounts they own, preferably on test networks.
- Report the vulnerability privately and give us reasonable time to remediate before any public disclosure.

## Security Audits

Findings from our internal audits are tracked in the [`audits/`](audits/) directory of this repository.
