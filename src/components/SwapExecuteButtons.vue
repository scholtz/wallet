<template>
  <div>
    <Button
      v-if="useDeflex"
      class="my-2 mx-1"
      :disabled="!allowExecuteDeflex || processingTradeDeflex"
      :severity="
        allowExecuteDeflex && isDeflexQuoteBetter ? 'primary' : 'secondary'
      "
      @click="$emit('execute-deflex')"
    >
      <div>
        <div>
          <ProgressSpinner
            v-if="processingTradeDeflex"
            style="width: 1em; height: 1em"
            strokeWidth="5"
          />
          {{ $t("swap.execute_button_deflex") }}
        </div>
        <div v-if="deflexEffectiveAmount !== undefined">
          {{ $t("labels.quote") }}
        </div>
        <div v-if="deflexEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              Number(deflexEffectiveAmount),
              "",
              toAssetDecimals
            )
          }}
        </div>
        <div v-if="deflexEffectiveAmount !== undefined">
          {{ $t("labels.price") }}
        </div>
        <div v-if="deflexEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              (10 ** 6 * Number(deflexEffectiveAmount)) /
                10 ** toAssetDecimals /
                payamount,
              pair,
              6
            )
          }}
        </div>
        <div v-if="deflexEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              10 ** 6 /
                ((10 ** 6 * Number(deflexEffectiveAmount)) /
                  10 ** toAssetDecimals /
                  payamount /
                  10 ** 6),
              pairReversed,
              6
            )
          }}
        </div>
      </div>
    </Button>
    <Button
      v-if="useFolks"
      class="my-2 mx-1"
      :disabled="!allowExecuteFolks || processingTradeFolks"
      :severity="
        allowExecuteFolks && isFolksQuoteBetter ? 'primary' : 'secondary'
      "
      @click="$emit('execute-folks')"
    >
      <div>
        <div>
          <ProgressSpinner
            v-if="processingTradeFolks"
            style="width: 1em; height: 1em"
            strokeWidth="5"
          />
          {{ $t("swap.execute_button_folks") }}
          <br />
        </div>
        <div v-if="folksEffectiveAmount !== undefined">
          {{ $t("labels.quote") }}
        </div>
        <div v-if="folksEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              Number(folksEffectiveAmount),
              "",
              toAssetDecimals
            )
          }}
        </div>
        <div v-if="folksEffectiveAmount !== undefined">
          {{ $t("labels.price") }}
        </div>
        <div v-if="folksEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              (10 ** 6 * Number(folksEffectiveAmount)) /
                10 ** toAssetDecimals /
                payamount,
              pair,
              6
            )
          }}
        </div>
        <div v-if="folksEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              10 ** 6 /
                ((10 ** 6 * Number(folksEffectiveAmount)) /
                  10 ** toAssetDecimals /
                  payamount /
                  10 ** 6),
              pairReversed,
              6
            )
          }}
        </div>
      </div>
    </Button>
    <Button
      v-if="useBiatec"
      class="my-2 mx-1"
      :disabled="!allowExecuteBiatec || processingTradeBiatec"
      :severity="
        allowExecuteBiatec && isBiatecQuoteBetter ? 'primary' : 'secondary'
      "
      @click="$emit('execute-biatec')"
    >
      <div>
        <div>
          <ProgressSpinner
            v-if="processingTradeBiatec"
            style="width: 1em; height: 1em"
            strokeWidth="5"
          />
          {{ $t("swap.execute_button_biatec") }}
          <br />
        </div>
        <div v-if="biatecEffectiveAmount !== undefined">
          {{ $t("labels.quote") }}
        </div>
        <div v-if="biatecEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              Number(biatecEffectiveAmount),
              "",
              toAssetDecimals
            )
          }}
        </div>
        <div v-if="biatecEffectiveAmount !== undefined">
          {{ $t("labels.price") }}
        </div>
        <div v-if="biatecEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              (10 ** 6 * Number(biatecEffectiveAmount)) /
                10 ** toAssetDecimals /
                payamount,
              pair,
              6
            )
          }}
        </div>
        <div v-if="biatecEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              10 ** 6 /
                ((10 ** 6 * Number(biatecEffectiveAmount)) /
                  10 ** toAssetDecimals /
                  payamount /
                  10 ** 6),
              pairReversed,
              6
            )
          }}
        </div>
      </div>
    </Button>
    <Button
      v-if="useBiatecStage"
      class="my-2 mx-1"
      :disabled="!allowExecuteBiatecStage || processingTradeBiatecStage"
      :severity="
        allowExecuteBiatecStage && isBiatecStageQuoteBetter
          ? 'primary'
          : 'secondary'
      "
      @click="$emit('execute-biatec-stage')"
    >
      <div>
        <div>
          <ProgressSpinner
            v-if="processingTradeBiatecStage"
            style="width: 1em; height: 1em"
            strokeWidth="5"
          />
          {{ $t("swap.execute_button_biatec_stage") }}
          <br />
        </div>
        <div v-if="biatecStageEffectiveAmount !== undefined">
          {{ $t("labels.quote") }}
        </div>
        <div v-if="biatecStageEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              Number(biatecStageEffectiveAmount),
              "",
              toAssetDecimals
            )
          }}
        </div>
        <div v-if="biatecStageEffectiveAmount !== undefined">
          {{ $t("labels.price") }}
        </div>
        <div v-if="biatecStageEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              (10 ** 6 * Number(biatecStageEffectiveAmount)) /
                10 ** toAssetDecimals /
                payamount,
              pair,
              6
            )
          }}
        </div>
        <div v-if="biatecStageEffectiveAmount !== undefined">
          {{
            $filters.formatCurrency(
              10 ** 6 /
                ((10 ** 6 * Number(biatecStageEffectiveAmount)) /
                  10 ** toAssetDecimals /
                  payamount /
                  10 ** 6),
              pairReversed,
              6
            )
          }}
        </div>
      </div>
    </Button>
  </div>
</template>

<script>
import { getEffectiveQuoteAmount } from "@/scripts/aggregators/simulate";

export default {
  name: "SwapExecuteButtons",
  props: {
    useDeflex: Boolean,
    useFolks: Boolean,
    useBiatec: Boolean,
    useBiatecStage: Boolean,
    allowExecuteDeflex: Boolean,
    allowExecuteFolks: Boolean,
    allowExecuteBiatec: Boolean,
    allowExecuteBiatecStage: Boolean,
    processingTradeDeflex: Boolean,
    processingTradeFolks: Boolean,
    processingTradeBiatec: Boolean,
    processingTradeBiatecStage: Boolean,
    isDeflexQuoteBetter: Boolean,
    isFolksQuoteBetter: Boolean,
    isBiatecQuoteBetter: Boolean,
    isBiatecStageQuoteBetter: Boolean,
    deflexQuotes: Object,
    folksQuote: Object,
    biatecQuotes: Object,
    biatecStageQuotes: Object,
    toAssetDecimals: Number,
    payamount: Number,
    pair: String,
    pairReversed: String,
  },
  emits: [
    "execute-deflex",
    "execute-folks",
    "execute-biatec",
    "execute-biatec-stage",
  ],
  computed: {
    // The simulated (dry-run) amount when available, falling back to the
    // aggregator API's self-reported quote only while simulation is
    // pending/unavailable - see useSwap.ts's simulateAggregatorQuote.
    deflexEffectiveAmount() {
      return getEffectiveQuoteAmount(this.deflexQuotes);
    },
    folksEffectiveAmount() {
      return getEffectiveQuoteAmount(this.folksQuote);
    },
    biatecEffectiveAmount() {
      return getEffectiveQuoteAmount(this.biatecQuotes);
    },
    biatecStageEffectiveAmount() {
      return getEffectiveQuoteAmount(this.biatecStageQuotes);
    },
  },
};
</script>
