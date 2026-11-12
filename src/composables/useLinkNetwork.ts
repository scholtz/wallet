import { useStore } from "@/store";
import { useI18n } from "vue-i18n";

/**
 * Applies the `network` of a payment link (AW-2026-102). Pages parse a link more than once per
 * load (mount, asset and account watchers), so concurrent calls share one in-flight decision and
 * a refusal is remembered: the user is asked, and told about a refusal, once per network. An
 * accepted switch is not cached - `config/switchEnvFromLink` is cheap and re-confirms if the user
 * later moves to another network.
 */
export function useLinkNetwork(reportError: (message: string) => unknown) {
  const store = useStore();
  const { t } = useI18n();
  const pending = new Map<string, Promise<boolean>>();
  const refused = new Set<string>();

  return async (network: string): Promise<boolean> => {
    if (refused.has(network)) return false;
    let decision = pending.get(network);
    if (!decision) {
      decision = (async () => {
        let switched = false;
        try {
          switched = (await store.dispatch("config/switchEnvFromLink", {
            env: network,
            confirm: (canonicalEnv: string) =>
              window.confirm(t("pay.link_network_switch", { network: canonicalEnv })),
          })) as boolean;
        } catch (err) {
          // e.g. the public node lists could not be loaded: stay on the current network.
          console.error("Switching to the network of a payment link failed", err);
        }
        if (!switched) {
          refused.add(network);
          await reportError(t("pay.link_network_refused", { network }));
        }
        return switched;
      })().finally(() => pending.delete(network));
      pending.set(network, decision);
    }
    return decision;
  };
}
