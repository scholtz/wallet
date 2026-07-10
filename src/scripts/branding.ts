const BIATEC_DOMAIN = "biatec.io";

// Same static build is deployed to K8S, GitHub Pages and Vercel — the
// wallet is white-labeled per domain at runtime rather than per build.
export function isBiatecDomain(
  hostname: string = typeof window !== "undefined"
    ? window.location.hostname
    : ""
): boolean {
  return hostname === BIATEC_DOMAIN || hostname.endsWith(`.${BIATEC_DOMAIN}`);
}

export function getWalletBrandName(): string {
  return isBiatecDomain() ? "Biatec Wallet" : "AWallet";
}

// No protocol, matching the existing WalletConnect metadata `url` convention.
export function getWalletBrandUrl(): string {
  return isBiatecDomain() ? "www.biatec.io" : "www.a-wallet.net";
}

export function getWalletLogo(): string {
  return isBiatecDomain() ? "/img/biatec-wallet.svg" : "/img/logo.svg";
}
