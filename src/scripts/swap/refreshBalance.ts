// Pure helpers for keeping the Swap page's balance fresh. No runtime imports
// so they can be unit tested in plain Node (playwright/unit).

/** How often the Swap page silently re-reads the account balance. */
export const SWAP_BALANCE_REFRESH_MS = 30_000;

/** The indexer trails algod; after a swap we re-read it this often... */
export const POST_SWAP_REFRESH_ATTEMPTS = 6;
/** ...with this pause between reads. */
export const POST_SWAP_REFRESH_DELAY_MS = 2_000;

interface HoldingLike {
  assetId?: number | bigint | string;
  /** legacy cached wallet data still carries the raw indexer key */
  "asset-id"?: number | bigint | string;
  amount?: number | bigint | string;
}

interface AccountDataLike {
  amount?: number | bigint | string;
  assets?: HoldingLike[];
}

/**
 * Compact fingerprint of the balances of an account (ALGO + all assets, or only
 * the given asset ids where 0 is ALGO), used to tell whether a re-read of the
 * account returned newer data.
 */
export const balanceSnapshot = (
  data: AccountDataLike | false | null | undefined,
  assetIds?: Array<number | bigint | null>
): string => {
  if (!data) return "";
  const picked = assetIds?.filter((id) => id !== null).map((id) => String(id));
  // No asset to watch means no filter (everything is part of the fingerprint).
  const wanted = picked && picked.length > 0 ? picked : undefined;
  const idOf = (a: HoldingLike) => String(a.assetId ?? a["asset-id"]);
  const holdings = (data.assets ?? [])
    .filter((a) => !wanted || wanted.includes(idOf(a)))
    .map((a) => `${idOf(a)}:${String(a.amount)}`)
    .sort()
    .join(",");
  // ALGO (asset 0) is not in `assets`; without a filter it is always part.
  const algo = !wanted || wanted.includes("0") ? String(data.amount) : "";
  return `${algo}|${holdings}`;
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface RefreshUntilChangedOptions {
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Calls `reload` until `read()` differs from `before` (the indexer caught up
 * with the swap) or the attempts run out. A failing reload counts as an
 * attempt and never throws. Returns whether a change was observed.
 */
export const refreshUntilChanged = async (
  reload: () => Promise<void>,
  read: () => string,
  before: string,
  options: RefreshUntilChangedOptions = {}
): Promise<boolean> => {
  const attempts = options.attempts ?? POST_SWAP_REFRESH_ATTEMPTS;
  const delayMs = options.delayMs ?? POST_SWAP_REFRESH_DELAY_MS;
  const sleep = options.sleep ?? defaultSleep;
  for (let i = 0; i < attempts; i++) {
    try {
      await reload();
      if (read() !== before) return true;
    } catch (e) {
      console.error("Unable to refresh the account balance", e);
    }
    if (i < attempts - 1) await sleep(delayMs);
  }
  return false;
};

export interface SettleSwapDeps {
  /** whether the aggregator actually submitted a transaction to the network */
  txSent: boolean;
  /** drops the quote and its prepared transactions */
  clearQuotes: () => void;
  reload: () => Promise<void>;
  read: () => string;
  before: string;
  /** false once the user left the account/page the swap belongs to */
  stillHere: () => boolean;
  rebuildAssets: () => Promise<void>;
  /** called only when the user has not touched the form in the meantime */
  clampAmount: () => void;
  /** whether the pay amount / asset pair are still what they were at submit */
  formUnchanged: () => boolean;
  options?: RefreshUntilChangedOptions;
}

/**
 * What happens after an aggregator's execute() returned. Nothing submitted
 * (no signer, rejected, unsafe transaction) leaves the quote usable; anything
 * submitted - confirmed or not, even only the first group of several - spends
 * it, and the balance is re-read until the indexer shows the swap.
 */
export const settleAfterSwap = async (
  d: SettleSwapDeps
): Promise<"nothing-sent" | "settled"> => {
  if (!d.txSent) return "nothing-sent";
  d.clearQuotes();
  await refreshUntilChanged(
    async () => {
      if (d.stillHere()) await d.reload();
    },
    d.read,
    d.before,
    d.options
  );
  if (d.stillHere()) {
    await d.rebuildAssets();
    if (d.formUnchanged()) d.clampAmount();
  }
  return "settled";
};
