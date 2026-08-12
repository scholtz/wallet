/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Aggregated DEX trading statistics for a 24-hour window, formatted for DefiLlama export.
 * The window covers [AVMTradeReporter.Model.DTO.DexStatsResponse.From, AVMTradeReporter.Model.DTO.DexStatsResponse.To) where To = From + 1 day.
 * Only confirmed trades are included in the aggregation.
 */
export type DexStatsResponse = {
    /**
     * DEX protocol identifier (Biatec, Pact, or Tiny).
     */
    protocol?: string | null;
    /**
     * Start of the statistics window (inclusive).
     */
    from?: string;
    /**
     * End of the statistics window (exclusive, equals From + 1 day).
     */
    to?: string;
    /**
     * Total USD volume traded during the window (sum of valueUSD across all confirmed trades).
     */
    volumeUSD?: number;
    /**
     * Total fees collected from all trades in USD (sum of feesUSD).
     */
    feesUSD?: number;
    /**
     * Total fees collected by liquidity providers in USD (sum of feesUSDProvider).
     */
    feesLPUSD?: number;
    /**
     * Total fees collected by the protocol in USD (sum of feesUSDProtocol).
     */
    feesProtocolUSD?: number;
};

