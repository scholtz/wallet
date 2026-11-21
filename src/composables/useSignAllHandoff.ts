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
 * `direct` accounts (key, HD, Falcon) are signed in place by the page, everything else is handed
 * to `/signAll` (multisig / 2FA, Ledger) and the page is offered
 * again afterwards. See "Signing transactions built by a page" in CLAUDE.md.
 */
export function useSignAllHandoff() {
  const store = useStore();
  const router = useRouter();
  const route = useRoute();

  const getSignerType = async (from: string): Promise<SignerType> =>
    (await store.dispatch("signer/getSignerType", { from })) as SignerType;

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
