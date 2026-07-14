# Hero imagery — provenance and licensing

All images in this folder are **AI-generated** and sourced from
[StockCake](https://stockcake.com), which distributes its AI-generated
library royalty-free for **commercial and personal use with no attribution
required**. AI-generated images with no human author are additionally not
subject to conventional copyright protection in most jurisdictions, making
them the lowest-risk imagery class for an open-source project. Provenance
is recorded below per the standard best practice for AI imagery: document
the source, license, and download date for every asset.

| File | Used on | Source page | Downloaded |
| ---- | ------- | ----------- | ---------- |
| `hero-login.jpg` | Login (open wallet) | <https://stockcake.com/i/businesswoman-with-smartphone_1223472_235483> | 2026-07-14 |
| `hero-new-wallet.jpg` | New wallet | <https://stockcake.com/i/biometric-security-unlocked_3335038_1704571> | 2026-07-14 |
| `hero-import-wallet.jpg` | Import wallet | <https://stockcake.com/i/digital-banking-moment_1599315_1198798> | 2026-07-14 |
| `hero-404.jpg` | 404 page | <https://stockcake.com/i/compass-guided-journey_390241_590975> | 2026-07-14 |

## Rules for adding or replacing images

1. **License first.** Only royalty-free/public-domain sources with explicit
   commercial-use permission and no attribution requirement (StockCake, or
   AI images you generate yourself with a tool whose terms permit
   commercial use). Record the source URL and date in the table above.
2. **No trademarks, no real people.** No recognizable brands, logos, device
   trade dress, celebrities, or private individuals. Prefer AI-generated
   subjects — they avoid model-release questions entirely.
3. **Stay on brand.** Calm, professional, trust-building imagery (the
   "international bank" register): soft light, teal-friendly palette
   (brand: `#14b8a6` light / `#2dd4bf` dark), no aggressive/red "hacker"
   security clichés.
4. **Keep files lean.** Target ≤ 100 KB per image (the current set is
   33–65 KB). ~800 px on the long edge is sufficient — heroes render at
   ≤ 26rem (416 px) CSS width, so ~832 px covers 2× DPR displays.
5. **Bundle locally.** Never hot-link external image URLs at runtime — the
   wallet makes no third-party requests by design.

## Regenerating a brand-consistent set (preferred long-term)

For a fully consistent set, generate replacements with an image model
whose terms permit commercial use, using one shared style suffix so all
screens read as one series:

> …, photorealistic, soft diffused studio light, calm professional
> banking-brand aesthetic, teal accent color #14b8a6, shallow depth of
> field, high detail, no text, no logos, 4:3

Per-screen subjects:

- **Login**: "Smiling professional customer holding a smartphone in front
  of a modern glass bank headquarters, welcoming and confident"
- **New wallet**: "Close-up of a smartphone showing a glowing teal padlock
  being unlocked by a fingertip, dark teal background"
- **Import wallet**: "Hands holding a smartphone restoring a secure
  account, bright modern interior"
- **404**: "Hands holding a brass compass above a soft-focus city skyline"

Document the tool, prompt, and date here when you do.
