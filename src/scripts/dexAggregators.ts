import { DexAggregator } from "./aggregators/types";
import { deflexAggregator } from "./aggregators/deflex";
import { folksAggregator } from "./aggregators/folks";
import { biatecAggregator, biatecStageAggregator } from "./aggregators/biatec";

export { biatecStageAggregator };

export const dexAggregators: DexAggregator[] = [
  deflexAggregator,
  folksAggregator,
  biatecAggregator,
];

export function addDexAggregator(aggregator: DexAggregator) {
  dexAggregators.push(aggregator);
}

// The stage router is opt-in (Settings > "Enable stage routers", disabled by
// default) since it's used to test upcoming routing improvements before they
// ship to production - build the effective aggregator list per-swap-session
// rather than mutating the shared `dexAggregators` singleton.
export function getActiveDexAggregators(
  stageRouterEnabled: boolean
): DexAggregator[] {
  return stageRouterEnabled
    ? [...dexAggregators, biatecStageAggregator]
    : dexAggregators;
}
