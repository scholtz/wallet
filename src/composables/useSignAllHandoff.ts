import { useRoute, useRouter } from "vue-router";
import type algosdk from "algosdk";
import { useStore } from "@/store";
import { isArc14AuthTransaction } from "@/scripts/encoding/arc14";
import {
  resolveSigningRoute,
  type SignerType,
  type SigningRoute,
} from "@/scripts/signing/complexSigning";

/**
 * Standard way for a page that builds transactions to get them signed:
 * `direct` accounts (key, HD) are signed in place by the page, everything else is handed
 * to `/signAll` (multisig / 2FA, Ledger, Falcon-1024) and the page is offered
 * again afterwards. See "Signing transactions built by a page" in CLAUDE.md.
 */
export function useSignAllHandoff() {
  const store = useStore();
  const router = useRouter();
  const route = useRoute();

  // Silent: asking how an account signs is a capability check, not a user action (see
  // signer/getSignerType); the caller reports "cannot sign" once, in its own words.
  const getSignerType = async (from: string): Promise<SignerType> =>
    (await store.dispatch("signer/getSignerType", {
      from,
      silent: true,
    })) as SignerType;

  const signingRouteFor = async (from: string): Promise<SigningRoute> =>
    resolveSigningRoute(await getSignerType(from));

  /**
   * Hands a complete, validated and already grouped list of transactions to
   * `/signAll`. `returnKey` names the originating flow (button label, see
   * signAllReturnLabelKey); the current page is where the user returns to.
   * `presigned` are signed counterparts of entries in `txns` (e.g. logic-sig
   * transactions of a route) that must not be asked for again.
   */
  const handOffToSignAll = async (
    txns: algosdk.Transaction[],
    returnKey: string,
    presigned?: Uint8Array[],
    returnPath?: string,
  ): Promise<void> => {
    await store.dispatch("signer/toSignArray", {
      txs: txns,
      returnTo: { key: returnKey, path: returnPath ?? route.fullPath },
      presigned,
    });
    await router.push("/signAll");
  };

  /**
   * The stored ARC-14 login of `account` for `realm` when it is complete and still valid, else
   * undefined. Accounts that cannot sign in place (multisig, Ledger) are authenticated with it.
   */
  const getArc14Auth = (
    account: string,
    realm: string,
  ): Promise<string | undefined> =>
    store.dispatch("arc14/getUsableAuth", { account, realm });

  /**
   * Asks for the ARC-14 login of `account` for `realm` on the Sign-all page: the login is signed
   * there (never sent to the network) and kept in the `arc14` store, so the page that needs it
   * reads it with `getArc14Auth` after "Return to ...". Returns false when the login could not be
   * prepared (the store already showed why).
   */
  const requestArc14Auth = async (
    account: string,
    realm: string,
    returnKey: string,
    returnPath?: string,
  ): Promise<boolean> => {
    const authTxn = (await store.dispatch("arc14/getAuthTx", {
      account,
      realm,
    })) as algosdk.Transaction | undefined;
    // Sign-all recognises a login by its note; anything else would be offered for sending.
    if (!authTxn || !isArc14AuthTransaction(authTxn)) return false;
    await handOffToSignAll([authTxn], returnKey, undefined, returnPath);
    return true;
  };

  return {
    getSignerType,
    signingRouteFor,
    handOffToSignAll,
    getArc14Auth,
    requestArc14Auth,
  };
}
