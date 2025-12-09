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
        <div v-if="deflexQuotes.quote">{{ $t("labels.quote") }}</div>
        <div v-if="folksQuote.quoteAmount">
          {{
            $filters.formatCurrency(
              Number(deflexQuotes.quote),
              "",
              toAssetDecimals
            )
          }}
        </div>
        <div v-if="deflexQuotes.quote">{{ $t("labels.price") }}</div>
        <div v-if="deflexQuotes.quote">
          {{
            $filters.formatCurrency(
              (10 ** 6 * Number(deflexQuotes.quote)) /
                10 ** toAssetDecimals /
                payamount,
              pair,
              6
            )
          }}
        </div>
        <div v-if="deflexQuotes.quote">
          {{
            $filters.formatCurrency(
              10 ** 6 /
                ((10 ** 6 * Number(deflexQuotes.quote)) /
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
        <div v-if="deflexQuotes.quote">{{ $t("labels.quote") }}</div>
        <div v-if="folksQuote.quoteAmount">
          {{
            $filters.formatCurrency(
              Number(folksQuote.quoteAmount),
              "",
              toAssetDecimals
            )
          }}
        </div>
        <div v-if="deflexQuotes.quote">{{ $t("labels.price") }}</div>
        <div v-if="folksQuote.quoteAmount">
          {{
            $filters.formatCurrency(
              (10 ** 6 * Number(folksQuote.quoteAmount)) /
                10 ** toAssetDecimals /
                payamount,
              pair,
              6
            )
          }}
        </div>
        <div v-if="folksQuote.quoteAmount">
          {{
            $filters.formatCurrency(
              10 ** 6 /
                ((10 ** 6 * Number(folksQuote.quoteAmount)) /
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
        <div v-if="biatecQuotes?.quoteAmount">{{ $t("labels.quote") }}</div>
        <div v-if="biatecQuotes?.quoteAmount">
          {{
            $filters.formatCurrency(
              Number(biatecQuotes.quoteAmount),
              "",
              toAssetDecimals
            )
          }}
        </div>
        <div v-if="biatecQuotes?.quoteAmount">{{ $t("labels.price") }}</div>
        <div v-if="biatecQuotes?.quoteAmount">
          {{
            $filters.formatCurrency(
              (10 ** 6 * Number(biatecQuotes.quoteAmount)) /
                10 ** toAssetDecimals /
                payamount,
              pair,
              6
            )
          }}
        </div>
        <div v-if="biatecQuotes?.quoteAmount">
          {{
            $filters.formatCurrency(
              10 ** 6 /
                ((10 ** 6 * Number(biatecQuotes.quoteAmount)) /
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
export default {
  name: "SwapExecuteButtons",
  props: {
    useDeflex: Boolean,
    useFolks: Boolean,
    useBiatec: Boolean,
    allowExecuteDeflex: Boolean,
    allowExecuteFolks: Boolean,
    allowExecuteBiatec: Boolean,
    processingTradeDeflex: Boolean,
    processingTradeFolks: Boolean,
    processingTradeBiatec: Boolean,
    isDeflexQuoteBetter: Boolean,
    isFolksQuoteBetter: Boolean,
    isBiatecQuoteBetter: Boolean,
    deflexQuotes: Object,
    folksQuote: Object,
    biatecQuotes: Object,
    toAssetDecimals: Number,
    payamount: Number,
    pair: String,
    pairReversed: String,
  },
  emits: ["execute-deflex", "execute-folks", "execute-biatec"],
};
</script>
