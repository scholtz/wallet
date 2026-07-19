<template>
  <div class="route-diagram">
    <div v-if="!routeInfo.available" class="route-empty">
      <Message severity="secondary" :closable="false">
        {{ $t("swap.routes_no_quote") }}
      </Message>
    </div>
    <template v-else>
      <div class="route-summary">
        <div class="route-summary-item">
          <span class="route-summary-label">{{ $t("swap.routes_input") }}</span>
          <span class="route-summary-value">
            {{ formatAmount(routeInfo.inputAmount, routeInfo.fromAssetId) }}
            <Button
              icon="pi pi-copy"
              text
              rounded
              size="small"
              :aria-label="$t('global.copy_address')"
              @click="
                copyValue(rawAmount(routeInfo.inputAmount, routeInfo.fromAssetId))
              "
            />
          </span>
        </div>
        <i class="pi pi-arrow-right route-summary-arrow" />
        <div class="route-summary-item">
          <span class="route-summary-label">{{ $t("swap.routes_output") }}</span>
          <span class="route-summary-value">
            {{ formatAmount(routeInfo.outputAmount, routeInfo.toAssetId) }}
            <Button
              icon="pi pi-copy"
              text
              rounded
              size="small"
              :aria-label="$t('global.copy_address')"
              @click="
                copyValue(rawAmount(routeInfo.outputAmount, routeInfo.toAssetId))
              "
            />
          </span>
        </div>
        <Tag
          v-if="routeInfo.priceImpactPercent !== undefined"
          severity="warn"
          :value="`${$t('swap.routes_price_impact')}: ${round(routeInfo.priceImpactPercent)}%`"
        />
        <Tag
          v-if="routeInfo.networkFeeMicroAlgos !== undefined"
          severity="secondary"
          :value="`${$t('swap.routes_network_fee')}: ${formatCurrency(routeInfo.networkFeeMicroAlgos, 'ALGO', 6)}`"
        />
        <Button
          icon="pi pi-copy"
          size="small"
          text
          :label="$t('swap.routes_copy_json')"
          @click="copyValue(JSON.stringify(rawQuote, jsonReplacer, 2))"
        />
      </div>

      <Message
        v-if="routeInfo.note"
        severity="secondary"
        :closable="false"
        class="route-note"
      >
        {{ $t(`swap.routes_note_${routeInfo.note}`) }}
      </Message>

      <div class="route-simulation">
        <div class="route-simulation-title">
          <i class="pi pi-bolt" />
          {{ $t("swap.simulation_title") }}
        </div>
        <div v-if="simulation === 'loading'" class="route-simulation-loading">
          <ProgressSpinner style="width: 1rem; height: 1rem" strokeWidth="6" />
          {{ $t("swap.simulation_loading") }}
        </div>
        <Message
          v-else-if="simulation && !simulation.success"
          severity="error"
          :closable="false"
        >
          {{ $t("swap.simulation_failed") }}: {{ simulation.failureMessage }}
        </Message>
        <div v-else-if="simulation && simulation.success" class="route-simulation-values">
          <div class="route-summary-item">
            <span class="route-summary-label">{{ $t("swap.simulation_sent") }}</span>
            <span class="route-summary-value">
              {{ formatAmount(simulation.netSent, routeInfo.fromAssetId) }}
              <Button
                icon="pi pi-copy"
                text
                rounded
                size="small"
                :aria-label="$t('global.copy_address')"
                @click="copyValue(rawAmount(simulation.netSent, routeInfo.fromAssetId))"
              />
            </span>
          </div>
          <div class="route-summary-item">
            <span class="route-summary-label">{{ $t("swap.simulation_received") }}</span>
            <span class="route-summary-value">
              {{ formatAmount(simulation.netReceived, routeInfo.toAssetId) }}
              <Button
                icon="pi pi-copy"
                text
                rounded
                size="small"
                :aria-label="$t('global.copy_address')"
                @click="
                  copyValue(rawAmount(simulation.netReceived, routeInfo.toAssetId))
                "
              />
            </span>
          </div>
        </div>
        <div v-else class="route-simulation-unavailable">
          {{ $t("swap.simulation_unavailable") }}
        </div>
        <div class="route-simulation-disclaimer">
          {{ $t("swap.simulation_disclaimer") }}
        </div>
      </div>

      <div v-for="(path, pIdx) in routeInfo.paths" :key="pIdx" class="route-path">
        <Tag
          v-if="routeInfo.paths.length > 1 || (path.percentage ?? 100) < 100"
          class="route-path-badge"
          severity="info"
          :value="
            $t('swap.routes_split', { percent: round(path.percentage ?? 0) })
          "
        />
        <div class="route-flow">
          <div class="route-node">
            {{ symbolFor(path.hops[0]?.fromAssetId ?? routeInfo.fromAssetId) }}
          </div>
          <template v-for="(hop, hIdx) in path.hops" :key="hIdx">
            <i class="pi pi-arrow-right route-arrow" />
            <div class="route-hop">
              <div
                v-for="(pool, poolIdx) in hop.pools"
                :key="poolIdx"
                class="route-pool"
                :style="poolStyle(pool.protocol)"
              >
                <div class="route-pool-header">
                  <span class="route-pool-label">{{ pool.label }}</span>
                  <span v-if="pool.percentage !== undefined" class="route-pool-pct">
                    {{ round(pool.percentage) }}%
                  </span>
                </div>
                <div v-if="pool.poolAppId !== undefined" class="route-pool-meta">
                  <span>{{ $t("swap.routes_pool") }} #{{ pool.poolAppId }}</span>
                  <Button
                    icon="pi pi-copy"
                    text
                    rounded
                    size="small"
                    :aria-label="$t('global.copy_address')"
                    @click="copyValue(String(pool.poolAppId))"
                  />
                </div>
                <div v-if="pool.amountIn !== undefined" class="route-pool-amount">
                  <span>{{ formatAmount(pool.amountIn, pool.fromAssetId) }}</span>
                  <Button
                    icon="pi pi-copy"
                    text
                    rounded
                    size="small"
                    :aria-label="$t('global.copy_address')"
                    @click="copyValue(rawAmount(pool.amountIn, pool.fromAssetId))"
                  />
                  <i class="pi pi-arrow-right" />
                  <span>{{ formatAmount(pool.amountOut, pool.toAssetId) }}</span>
                  <Button
                    icon="pi pi-copy"
                    text
                    rounded
                    size="small"
                    :aria-label="$t('global.copy_address')"
                    @click="copyValue(rawAmount(pool.amountOut, pool.toAssetId))"
                  />
                </div>
              </div>
            </div>
            <i class="pi pi-arrow-right route-arrow" />
            <div class="route-node">{{ symbolFor(hop.toAssetId) }}</div>
          </template>
        </div>
      </div>

      <div v-if="routeInfo.steps?.length" class="route-steps">
        <div class="route-steps-title">{{ $t("swap.routes_steps") }}</div>
        <ul>
          <li v-for="(step, sIdx) in routeInfo.steps" :key="sIdx">{{ step }}</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";
import copy from "copy-to-clipboard";
import Tag from "primevue/tag";
import formatCurrency from "@/scripts/numbers/formatCurrency";
import type { AggregatorRouteInfo } from "@/scripts/aggregators/routeInfo";
import type { SimulatedOutcome } from "@/scripts/aggregators/simulate";

const props = defineProps<{
  routeInfo: AggregatorRouteInfo;
  assetMeta: Record<number, { symbol: string; decimals: number }>;
  rawQuote?: unknown;
  simulation?: SimulatedOutcome | "loading";
}>();

const { t } = useI18n();
const toast = useToast();

const metaFor = (id: number) => props.assetMeta[id] ?? { symbol: `#${id}`, decimals: 6 };
const symbolFor = (id: number) => metaFor(id).symbol;

const formatAmount = (value: number | undefined, assetId: number): string => {
  if (value === undefined || value === null) return "-";
  const meta = metaFor(assetId);
  return formatCurrency(value, meta.symbol, meta.decimals);
};

const rawAmount = (value: number | undefined, assetId: number): string => {
  if (value === undefined || value === null) return "";
  const meta = metaFor(assetId);
  return String(value / 10 ** meta.decimals);
};

const round = (value: number): number => Math.round(value * 100) / 100;

const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value;

const copyValue = (value: string) => {
  if (!value) return;
  copy(value);
  toast.add({
    severity: "info",
    summary: t("global.copied"),
    detail: t("global.copied_to_clipboard"),
    life: 2000,
  });
};

// Fixed categorical order (dataviz palette) - accent only, never the sole
// carrier of meaning since every pool always shows its protocol name too.
const CATEGORICAL_LIGHT = [
  "#2a78d6",
  "#008300",
  "#e87ba4",
  "#eda100",
  "#1baf7a",
  "#eb6834",
  "#4a3aa7",
  "#e34948",
];
const CATEGORICAL_DARK = [
  "#3987e5",
  "#008300",
  "#d55181",
  "#c98500",
  "#199e70",
  "#d95926",
  "#9085e9",
  "#e66767",
];

const protocolSlot = (protocol?: string): number => {
  if (!protocol) return 0;
  let hash = 0;
  for (let i = 0; i < protocol.length; i++) {
    hash = (hash * 31 + protocol.charCodeAt(i)) >>> 0;
  }
  return hash % CATEGORICAL_LIGHT.length;
};

const poolStyle = (protocol?: string) => {
  const slot = protocolSlot(protocol);
  return {
    "--pool-color-light": CATEGORICAL_LIGHT[slot],
    "--pool-color-dark": CATEGORICAL_DARK[slot],
  };
};
</script>

<style scoped>
.route-diagram {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.route-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
}

.route-summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.route-summary-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.route-summary-value {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.route-summary-arrow {
  color: var(--p-text-muted-color);
}

.route-path {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.route-path-badge {
  align-self: flex-start;
}

.route-flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.route-node {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.85rem;
  border-radius: 999px;
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.route-arrow {
  align-self: center;
  color: var(--p-text-muted-color);
  flex-shrink: 0;
}

.route-hop {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  justify-content: center;
}

.route-pool {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.5rem 0.65rem;
  border-radius: 0.5rem;
  border: 1px solid var(--p-content-border-color);
  border-left: 4px solid var(--pool-color-light);
  background: var(--p-content-background);
  min-width: 11rem;
}

html.p-dark .route-pool {
  border-left-color: var(--pool-color-dark);
}

.route-pool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-weight: 600;
}

.route-pool-pct {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  font-variant-numeric: tabular-nums;
}

.route-pool-meta,
.route-pool-amount {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  font-variant-numeric: tabular-nums;
  flex-wrap: wrap;
}

.route-note {
  font-size: 0.85rem;
}

.route-simulation {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--p-primary-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
}

.route-simulation-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  color: var(--p-primary-color);
}

.route-simulation-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
}

.route-simulation-values {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.route-simulation-unavailable {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.route-simulation-disclaimer {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.route-steps {
  border-top: 1px dashed var(--p-content-border-color);
  padding-top: 0.5rem;
}

.route-steps-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.route-steps ul {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

@media (max-width: 40rem) {
  .route-flow {
    flex-direction: column;
    align-items: stretch;
  }

  .route-node {
    align-self: center;
  }

  .route-arrow {
    align-self: center;
    transform: rotate(90deg);
  }

  .route-hop,
  .route-pool {
    width: 100%;
  }

  .route-pool {
    min-width: 0;
  }
}
</style>
