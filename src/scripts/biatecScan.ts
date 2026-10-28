import { BiatecScanClient } from "@/scripts/generated/biatecScan";
import { getExplorerApiBaseUrl } from "@/scripts/explorer";
import store from "@/store";

// Native chain asset (ALGO on Algorand, VOI on Voi, ...) is reported by the
// Biatec Scan API under asset index 0.
export const NATIVE_ASSET_ID = 0n;

// The realm identifies this API to the ARC-14 signer/token cache, matching
// the "<Service>#ARC14" convention already used for the Biatec Router
// (see src/scripts/aggregators/biatec.ts).
const ARC14_REALM = "BiatecScan#ARC14";

// The Biatec Scan API accepts (but does not require) ARC-0014 auth - see the
// "oauth2" apiKey security scheme in its swagger doc. Authenticated requests
// get better rate limits / less throttling, so an ARC-14 header is attached when the
// account being viewed can sign one locally (no hardware/multisig/remote-session interaction
// required), and the request silently falls back to an anonymous one otherwise.
//
// The signer is always the account whose assets are being priced, never another account of the
// wallet: the token carries the signer's address, so using a different one would tell the API
// which addresses belong together (AW-2026-098). Wallet-wide views pass no account and stay
// anonymous.
const getSigningAccountAddr = (account: string | undefined): string | undefined =>
  account
    ? store.state.wallet.privateAccounts.find(
        (a) => a.addr === account && a.sk && a.sk.length > 0
      )?.addr
    : undefined;

// arc14/signAuthTx always signs against the wallet's *currently selected*
// network (it builds the auth transaction from store.state.config's algod
// client), so an ARC-14 header can only be produced for that same network -
// requests for any other env are simply left unauthenticated.
const getArc14AuthHeader = async (
  env: string,
  viewedAccount: string | undefined
): Promise<string | undefined> => {
  if (env !== store.state.config.env) return undefined;
  const account = getSigningAccountAddr(viewedAccount);
  if (!account) return undefined;
  try {
    // Vuex's dispatch() is untyped (returns Promise<any>) - arc14/signAuthTx
    // itself resolves to `string | undefined` (see src/store/arc14.ts).
    return (await store.dispatch("arc14/signAuthTx", {
      account,
      realm: ARC14_REALM,
    })) as string | undefined;
  } catch (e: unknown) {
    console.error("Failed to create Biatec Scan ARC-14 auth header", e);
    return undefined;
  }
};

/**
 * Fetches the current USD price for the given asset ids from the Biatec
 * Scan API instance matching the active network (see getExplorerApiBaseUrl).
 * Assets without a known price (e.g. not traded on any indexed pool) are
 * simply absent from the returned map.
 */
export const getAssetUsdPrices = async (
  env: string,
  assetIds: bigint[],
  /** The account whose assets these are; omit for wallet-wide (anonymous) lookups. */
  viewedAccount?: string
): Promise<Map<bigint, number>> => {
  const prices = new Map<bigint, number>();
  if (assetIds.length === 0) return prices;

  const authHeader = await getArc14AuthHeader(env, viewedAccount);
  const client = new BiatecScanClient({
    BASE: getExplorerApiBaseUrl(env),
    HEADERS: authHeader ? { Authorization: authHeader } : undefined,
  });
  const uniqueIds = [...new Set(assetIds)];
  const assets = await client.asset.getApiAsset({
    ids: uniqueIds.join(","),
    size: uniqueIds.length,
  });

  for (const asset of assets) {
    if (typeof asset.priceUSD === "number" && !asset.deleted) {
      prices.set(BigInt(asset.index), asset.priceUSD);
    }
  }
  return prices;
};
