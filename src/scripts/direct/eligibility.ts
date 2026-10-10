/**
 * Which wallet accounts Biatec Direct offers to a site (pure, unit-testable under Node).
 *
 * An account is offered when this wallet can produce a signature for it: it holds the key
 * (plain, ARC-76 with a stored key, HD, Falcon-1024), signs on a Ledger, is a multisig with a
 * signator the wallet holds, or is rekeyed (on some network) to such an account. Watch-only
 * accounts, ARC-76 accounts whose key was not saved, hidden accounts and WalletConnect accounts
 * (signing happens in another wallet) are not.
 */
export interface EligibilityAccount {
  addr: string;
  type?: string;
  /** Secret key: bytes, or the index-keyed object a JSON round trip turns them into. */
  sk?: Uint8Array | Record<string, number>;
  /** algosdk multisig metadata: addresses are strings or Address objects. */
  params?: { addrs?: (string | { toString(): string })[] };
  hdRootAddr?: string;
  hdMnemonic?: string;
  falconPrivateKey?: Uint8Array | Record<string, number>;
  isHidden?: boolean;
  /** Per-network account data; only the rekey target is read. */
  data?: Record<string, { rekeyedTo?: string } | undefined>;
}

/** An HD account whose root mnemonic is in the wallet (the key is derived at signing time). */
export function holdsHdKey(
  account: EligibilityAccount,
  all: EligibilityAccount[],
): boolean {
  if (account.type !== "hd") return false;
  if (account.hdMnemonic) return true;
  return !!all.find((a) => a.addr === account.hdRootAddr)?.hdMnemonic;
}

/**
 * The account can add a subsignature to a multisig: key held (plain, HD) or a Ledger. Falcon-1024
 * keys cannot (a multisig subsignature is ed25519) and WalletConnect accounts sign elsewhere.
 */
export function canSignMultisigPart(
  account: EligibilityAccount,
  all: EligibilityAccount[],
): boolean {
  if (account.type === "ledger") return true;
  if (account.type === "hd") return holdsHdKey(account, all);
  if (account.type === "falcon1024" || account.type === "wc") return false;
  return !!account.sk;
}

/** The account's own key material (or device) lets the wallet sign for it. */
function holdsKey(account: EligibilityAccount, all: EligibilityAccount[]): boolean {
  if (account.type === "wc") return false;
  if (account.type === "ledger") return true;
  if (account.type === "falcon1024") return !!account.falconPrivateKey;
  if (account.type === "hd") return holdsHdKey(account, all);
  return !!account.sk;
}

export function canSignLocally(
  account: EligibilityAccount,
  all: EligibilityAccount[],
  visited: Set<string> = new Set(),
): boolean {
  if (visited.has(account.addr)) return false;
  visited.add(account.addr);
  if (holdsKey(account, all)) return true;
  // A multisig is offered when the wallet holds at least one of its signators (it can be
  // returned partially signed); otherwise fall through to a possible rekey of the account.
  const signators = (account.params?.addrs ?? []).map(String);
  if (
    signators.some((addr) => {
      const signator = all.find((a) => a.addr === addr);
      return !!signator && canSignMultisigPart(signator, all);
    })
  ) {
    return true;
  }
  for (const entry of Object.values(account.data ?? {})) {
    const target = entry?.rekeyedTo;
    if (!target || target === account.addr) continue;
    const rekeyed = all.find((a) => a.addr === target);
    if (rekeyed && canSignLocally(rekeyed, all, visited)) return true;
  }
  return false;
}

export function isDirectEligibleAccount(
  account: EligibilityAccount,
  all: EligibilityAccount[],
): boolean {
  return account.type !== "wc" && !account.isHidden && canSignLocally(account, all);
}

/**
 * ARC-60 data signing is an ed25519 signature made with a plain or HD key (the wallet cannot make
 * one with a Ledger, a Falcon key or a multisig), on the account itself or on the key it is
 * rekeyed to.
 */
export function canSignData(
  account: EligibilityAccount,
  all: EligibilityAccount[],
  visited: Set<string> = new Set(),
): boolean {
  if (visited.has(account.addr)) return false;
  visited.add(account.addr);
  if (account.type === "hd") return holdsHdKey(account, all);
  if (account.type === "ledger" || account.type === "falcon1024" || account.type === "wc") {
    return false;
  }
  if (account.params) return false;
  if (account.sk) return true;
  for (const entry of Object.values(account.data ?? {})) {
    const target = entry?.rekeyedTo;
    if (!target || target === account.addr) continue;
    const rekeyed = all.find((a) => a.addr === target);
    if (rekeyed && canSignData(rekeyed, all, visited)) return true;
  }
  return false;
}
