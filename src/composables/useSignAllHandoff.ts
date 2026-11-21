import { useRoute, useRouter } from "vue-router";
import type algosdk from "algosdk";
import { useStore } from "@/store";
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
  ): Promise<void> => {
    await store.dispatch("signer/toSignArray", {
      txs: txns,
      returnTo: { key: returnKey, path: route.fullPath },
      presigned,
    });
    await router.push("/signAll");
  };

  return { getSignerType, signingRouteFor, handOffToSignAll };
}
