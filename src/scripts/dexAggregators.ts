import { DexAggregator } from "./aggregators/types";
import { deflexAggregator } from "./aggregators/deflex";
import { folksAggregator } from "./aggregators/folks";
import { biatecAggregator } from "./aggregators/biatec";

export const dexAggregators: DexAggregator[] = [
  deflexAggregator,
  folksAggregator,
  biatecAggregator,
];

export function addDexAggregator(aggregator: DexAggregator) {
  dexAggregators.push(aggregator);
}
