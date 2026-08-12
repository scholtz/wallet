// Maps the active network env id (store.state.config.env) to the matching
// scan.biatec.io block-explorer instance, so explorer links always point at
// the chain the user is actually signing on:
//
//   mainnet-v1.0    -> https://algorand.scan.biatec.io
//   testnet-v1.0    -> https://testnet.scan.biatec.io
//   voimain-v1.0    -> https://voi.scan.biatec.io
//   aramidmain-v1.0 -> https://aramid.scan.biatec.io
//
// The mapping is derived, not enumerated, so a newly added chain works as
// long as its env id follows the existing "<chain>main-v..." convention.

const EXPLORER_DOMAIN = "scan.biatec.io";

const getExplorerSubdomain = (env: string): string => {
  // The chain name is the part before the genesis version suffix
  // ("voimain-v1.0" -> "voimain").
  const chain = (env ?? "").split("-")[0].toLowerCase();
  if (chain === "" || chain === "mainnet") {
    // Algorand mainnet is the historical default and lives on the
    // "algorand" subdomain rather than "mainnet".
    return "algorand";
  } else if (chain.endsWith("main")) {
    // "voimain" -> "voi", "aramidmain" -> "aramid"
    return chain.slice(0, -"main".length);
  }
  // "testnet", "betanet", ...
  return chain;
};

export const getExplorerBaseUrl = (env: string): string =>
  `https://${getExplorerSubdomain(env)}.${EXPLORER_DOMAIN}`;

// The Biatec Scan API (asset prices, pools, trades, ...) is hosted on the
// same per-chain subdomain as the explorer UI, just under an "api." prefix:
//
//   testnet-v1.0 -> https://api.testnet.scan.biatec.io
//   voimain-v1.0 -> https://api.voi.scan.biatec.io
export const getExplorerApiBaseUrl = (env: string): string =>
  `https://api.${getExplorerSubdomain(env)}.${EXPLORER_DOMAIN}`;

export const explorerAddressUrl = (env: string, address: string): string =>
  `${getExplorerBaseUrl(env)}/address/${address}`;

export const explorerAssetUrl = (
  env: string,
  assetId: bigint | number | string
): string => `${getExplorerBaseUrl(env)}/asset/${assetId}`;

export const explorerTransactionUrl = (env: string, txId: string): string =>
  `${getExplorerBaseUrl(env)}/transaction/${txId}`;

export const explorerApplicationUrl = (
  env: string,
  appId: bigint | number | string
): string => `${getExplorerBaseUrl(env)}/application/${appId}`;
