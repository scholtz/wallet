/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
import { AggregatedPoolService } from './services/AggregatedPoolService';
import { AssetService } from './services/AssetService';
import { AssetStatService } from './services/AssetStatService';
import { AssetTimeseriesService } from './services/AssetTimeseriesService';
import { GossipService } from './services/GossipService';
import { IndexerService } from './services/IndexerService';
import { LiquidityService } from './services/LiquidityService';
import { OhlcService } from './services/OhlcService';
import { PoolService } from './services/PoolService';
import { SearchService } from './services/SearchService';
import { SignalRTestService } from './services/SignalRTestService';
import { StatsService } from './services/StatsService';
import { TopAssetsService } from './services/TopAssetsService';
import { TradeService } from './services/TradeService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class BiatecScanClient {
    public readonly aggregatedPool: AggregatedPoolService;
    public readonly asset: AssetService;
    public readonly assetStat: AssetStatService;
    public readonly assetTimeseries: AssetTimeseriesService;
    public readonly gossip: GossipService;
    public readonly indexer: IndexerService;
    public readonly liquidity: LiquidityService;
    public readonly ohlc: OhlcService;
    public readonly pool: PoolService;
    public readonly search: SearchService;
    public readonly signalRTest: SignalRTestService;
    public readonly stats: StatsService;
    public readonly topAssets: TopAssetsService;
    public readonly trade: TradeService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? '',
            VERSION: config?.VERSION ?? '1',
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? 'include',
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });
        this.aggregatedPool = new AggregatedPoolService(this.request);
        this.asset = new AssetService(this.request);
        this.assetStat = new AssetStatService(this.request);
        this.assetTimeseries = new AssetTimeseriesService(this.request);
        this.gossip = new GossipService(this.request);
        this.indexer = new IndexerService(this.request);
        this.liquidity = new LiquidityService(this.request);
        this.ohlc = new OhlcService(this.request);
        this.pool = new PoolService(this.request);
        this.search = new SearchService(this.request);
        this.signalRTest = new SignalRTestService(this.request);
        this.stats = new StatsService(this.request);
        this.topAssets = new TopAssetsService(this.request);
        this.trade = new TradeService(this.request);
    }
}

