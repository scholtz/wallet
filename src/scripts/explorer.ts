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

export const getExplorerBaseUrl = (env: string): string => {
  // The chain name is the part before the genesis version suffix
  // ("voimain-v1.0" -> "voimain").
  const chain = (env ?? "").split("-")[0].toLowerCase();
  let subdomain: string;
  if (chain === "" || chain === "mainnet") {
    // Algorand mainnet is the historical default and lives on the
    // "algorand" subdomain rather than "mainnet".
    subdomain = "algorand";
  } else if (chain.endsWith("main")) {
    // "voimain" -> "voi", "aramidmain" -> "aramid"
    subdomain = chain.slice(0, -"main".length);
  } else {
    // "testnet", "betanet", ...
    subdomain = chain;
  }
  return `https://${subdomain}.${EXPLORER_DOMAIN}`;
};

export const explorerAddressUrl = (env: string, address: string): string =>
  `${getExplorerBaseUrl(env)}/address/${address}`;

export const explorerAssetUrl = (
  env: string,
  assetId: bigint | number | string
): string => `${getExplorerBaseUrl(env)}/asset/${assetId}`;

export const explorerApplicationUrl = (
  env: string,
  appId: bigint | number | string
): string => `${getExplorerBaseUrl(env)}/application/${appId}`;
