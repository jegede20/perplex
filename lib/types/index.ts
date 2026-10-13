// ═══════════════════════════════════════════════════════════════════
// Perplex — shared TypeScript types (strict, zero `any`)
// Protocol Analytics & Smart Money Intelligence for Perpl on Monad
// ═══════════════════════════════════════════════════════════════════

// ─── ENUMS ─────────────────────────────────────────────────────────

export type WalletTier = 'WHALE' | 'SHARK' | 'FISH';
export type TradeSide = 'LONG' | 'SHORT';
export type TradeStatus = 'OPEN' | 'CLOSED' | 'LIQUIDATED';
export type TimeRange = '24H' | '7D' | '30D' | 'ALL';
export type Market = 'BTC' | 'ETH' | 'SOL' | 'MON' | 'HYPE' | 'ZEC';
export type FeedEventType = 'OPEN' | 'CLOSE' | 'LIQUIDATION' | 'FLIP';
export type MarketDominance = 'LONG' | 'SHORT' | 'NEUTRAL';
export type BehaviorTag =
  | 'HIGH_LEVERAGE'
  | 'SCALPER'
  | 'SWING_TRADER'
  | 'BTC_MAXI'
  | 'CONTRARIAN'
  | 'CONSISTENT'
  | 'HIGH_VOLUME'
  | 'RISK_TAKER'
  | 'LOSS_CUTTER'
  | 'DIAMOND_HANDS';

// ─── PROTOCOL LEVEL ────────────────────────────────────────────────

export interface ProtocolStats {
  volume24h: number;
  volume7d: number;
  volume30d: number;
  volumeAllTime: number;
  openInterest: number;
  tvl: number;
  fees24h: number;
  fees7d: number;
  fees30d: number;
  feesAllTime: number;
  activeTradersToday: number;
  activeTraders7d: number;
  activeTraders30d: number;
  totalAccounts: number;
  netFlow24h: number;
  netFlow7d: number;
  liquidationCount24h: number;
  liquidationVolume24h: number;
  insuranceFundBalance: number;
  insuranceFundChange24h: number;
  lastUpdated: string;
}

export interface ProtocolChartPoint {
  date: string;
  volume: number;
  openInterest: number;
  /** Long-side open interest in USD — same source as the OI stat card. */
  oiLong: number;
  /** Short-side open interest in USD — same source as the OI stat card. */
  oiShort: number;
  activeUsers: number;
  fees: number;
  liquidations: number;
}

export interface NetFlowPoint {
  date: string;
  deposits: number;
  withdrawals: number;
  net: number;
}

// ─── MARKET LEVEL ──────────────────────────────────────────────────

export interface MarketSummary {
  id: number;
  symbol: Market;
  markPrice: number;
  spotPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  openInterest: number;
  openInterestLong: number;
  openInterestShort: number;
  longPercent: number;
  shortPercent: number;
  fundingRate: number;
  fundingAPR: number;
  volume24h: number;
  trades24h: number;
  liquidations24h: number;
  dominantSide: MarketDominance;
  whaleCount: number;
  topPosition: number;
  /** Market-level TVL (AUSD collateral), when available from Perpl context. */
  tvl?: number;
}

export interface MarketDetail extends MarketSummary {
  fundingHistory: FundingPoint[];
  volumeHistory: VolumePoint[];
  oiHistory: OIPoint[];
  positionsNearLiquidation: PositionRisk[];
  recentLiquidations: LiquidationEvent[];
  orderBook: OrderBook;
  topTraders: WalletSummary[];
}

export interface FundingPoint {
  timestamp: string;
  rate: number;
  apr: number;
}

export interface VolumePoint {
  date: string;
  volume: number;
  trades: number;
}

export interface OIPoint {
  date: string;
  longOI: number;
  shortOI: number;
  totalOI: number;
}

export interface PositionRisk {
  walletAddress: string;
  shortAddress: string;
  tier: WalletTier;
  market: Market;
  side: TradeSide;
  size: number;
  markPrice: number;
  liquidationPrice: number;
  distanceToLiq: number;
  marginRatio: number;
}

export interface LiquidationEvent {
  id: string;
  walletAddress: string;
  shortAddress: string;
  tier: WalletTier;
  market: Market;
  side: TradeSide;
  size: number;
  price: number;
  loss: number;
  txHash: string;
  timestamp: string;
}

export interface OrderBook {
  bids: [number, number][];
  asks: [number, number][];
  spread: number;
  midPrice: number;
  timestamp: string;
}

// ─── WALLET LEVEL ──────────────────────────────────────────────────

export interface WalletProfile {
  address: string;
  shortAddress: string;
  tier: WalletTier;
  smartMoneyScore: number;
  winRate: number;
  winCount: number;
  lossCount: number;
  totalTrades: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalVolume: number;
  avgLeverage: number;
  maxLeverage: number;
  avgHoldSeconds: number;
  longestWinStreak: number;
  longestLossStreak: number;
  maxDrawdown: number;
  profitFactor: number;
  behaviorTags: BehaviorTag[];
  primaryMarkets: Market[];
  collateralBalance: number;
  firstSeen: string;
  lastActive: string;
  openPositions: OpenPosition[];
  rank?: number;
}

export interface WalletSummary {
  address: string;
  shortAddress: string;
  tier: WalletTier;
  smartMoneyScore: number;
  winRate: number;
  realizedPnl: number;
  totalVolume: number;
  avgLeverage: number;
  lastActive: string;
  openPositionsCount: number;
}

export interface OpenPosition {
  walletAddress: string;
  market: Market;
  side: TradeSide;
  size: number;
  notionalValue: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  leverage: number;
  liquidationPrice: number;
  distanceToLiq: number;
  marginRatio: number;
  openedAt: string;
  txHash: string;
}

export interface Trade {
  id: string;
  walletAddress: string;
  market: Market;
  side: TradeSide;
  size: number;
  entryPrice: number;
  exitPrice?: number;
  leverage: number;
  realizedPnl?: number;
  pnlPercent?: number;
  holdSeconds?: number;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  status: TradeStatus;
}

export interface PnLPoint {
  date: string;
  dailyPnl: number;
  cumulativePnl: number;
  tradeCount: number;
}

export interface WalletFlow {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  txHash: string;
  timestamp: string;
}

// ─── FEED LEVEL ────────────────────────────────────────────────────

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  walletAddress: string;
  shortAddress: string;
  tier: WalletTier;
  smartMoneyScore: number;
  market: Market;
  side: TradeSide;
  size: number;
  price: number;
  leverage?: number;
  realizedPnl?: number;
  txHash: string;
  timestamp: string;
}

// ─── UI HELPERS ────────────────────────────────────────────────────

export interface StatCardData {
  label: string;
  value: string;
  subValue?: string;
  change?: number;
  changeLabel?: string;
  highlight?: 'LONG' | 'SHORT' | 'NEUTRAL' | 'PURPLE';
  icon?: string;
}

export interface ChartDataPoint {
  date: string;
  [key: string]: number | string;
}

// ─── SCORING / ANALYTICS INPUTS ────────────────────────────────────

/**
 * Minimal wallet input for scoring + behavior tag generation.
 * `winRate` accepts 0–1 or 0–100 (normalised internally).
 */
export interface WalletData {
  winRate: number;
  realizedPnl: number;
  totalVolume: number;
  longestWinStreak: number;
  totalTrades: number;
  avgLeverage: number;
  maxLeverage: number;
  avgHoldSeconds: number;
  btcVolumeRatio?: number;
  tradesAgainstTrend?: number;
  avgLossHoldSeconds?: number;
}

export interface MarketConfig {
  id: number;
  symbol: Market;
  name: string;
  /** Perpl fixed-point decimals for prices (e.g. 1 → price/10). */
  priceDecimals?: number;
  /** Perpl fixed-point decimals for sizes (e.g. 5 → size/1e5). */
  sizeDecimals?: number;
}

// ─── SENTIMENT ─────────────────────────────────────────────────────

export interface MarketSentiment {
  market: Market;
  longPercent: number;
  shortPercent: number;
  dominantSide: MarketDominance;
  whaleLongPercent: number;
  whaleShortPercent: number;
  openInterest: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

// ─── WHALE SENTIMENT GAUGE (feature) ───────────────────────────────

export type SentimentLabel =
  | 'EXTREME FEAR'
  | 'FEAR'
  | 'NEUTRAL'
  | 'GREED'
  | 'EXTREME GREED';

export type SentimentTrend =
  | 'INCREASING_BULL'
  | 'INCREASING_BEAR'
  | 'STABLE'
  | 'REVERSING';

export interface OverallSentiment {
  /** % of whale OI that is long */
  longPercent: number;
  shortPercent: number;
  /** -100 (max bearish) to +100 (max bullish) */
  netSentiment: number;
  sentimentLabel: SentimentLabel;
  /** 0-100 — how decisive is the positioning */
  conviction: number;
  totalWhaleOI: number;
  trackedWhales: number;
  trackedSharks: number;
  trend: SentimentTrend;
}

export type MarketSentimentTrend = 'MORE_BULLISH' | 'MORE_BEARISH' | 'STABLE';

export interface MarketSentimentDetail {
  market: Market;
  longPercent: number;
  shortPercent: number;
  /** -100 to +100 */
  netSentiment: number;
  /** 0-100 */
  conviction: number;
  whaleOI: number;
  whaleLongOI: number;
  whaleShortOI: number;
  whaleCount: number;
  trend: MarketSentimentTrend;
  /** points changed vs 1h ago */
  trendChange: number;
  /** which tier drives this market */
  dominantTier: WalletTier;
  /** avg score of positioned whales */
  avgSmartMoneyScore: number;
}

export interface SentimentShift {
  id: string;
  market: Market;
  /** old netSentiment */
  fromSentiment: number;
  /** new netSentiment */
  toSentiment: number;
  /** change in points */
  delta: number;
  direction: 'TURNED_BULLISH' | 'TURNED_BEARISH' | 'NEUTRAL';
  /** e.g. "Large whale opened LONG" */
  cause: string;
  walletAddress: string;
  tier: WalletTier;
  timestamp: string;
}

/** Whale wallet row with positioning bias (extends the leaderboard summary). */
export interface WhaleWalletRow extends WalletSummary {
  longOI: number;
  shortOI: number;
  positionedMarkets: Market[];
  /** per-wallet directional bias: -100 (all short) … +100 (all long) */
  sentiment: number;
}

export interface WhaleSentimentData {
  overall: OverallSentiment;
  byMarket: MarketSentimentDetail[];
  recentShifts: SentimentShift[];
  topBullishWhales: WhaleWalletRow[];
  topBearishWhales: WhaleWalletRow[];
  lastUpdated: string;
}

export interface SentimentHistoryPoint {
  timestamp: string;
  overall: number;
  byMarket: Record<Market, number>;
}

export interface SentimentResponse {
  markets: MarketSentiment[];
  overall: {
    longPercent: number;
    shortPercent: number;
    dominantSide: MarketDominance;
    signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  lastUpdated: string;
}

// ─── WALLET COMPARE (feature) ──────────────────────────────────────

export interface ComparisonMetric {
  label: string;
  valueA: number | string;
  valueB: number | string;
  formattedA: string;
  formattedB: string;
  winner: 'A' | 'B' | 'TIE';
  /** how much better (% or points / natural units) */
  advantage: number;
  higherIsBetter: boolean;
}

export interface ComparisonMetrics {
  winRate: ComparisonMetric;
  realizedPnl: ComparisonMetric;
  totalVolume: ComparisonMetric;
  avgLeverage: ComparisonMetric;
  smartMoneyScore: ComparisonMetric;
  profitFactor: ComparisonMetric;
  maxDrawdown: ComparisonMetric;
  totalTrades: ComparisonMetric;
  avgHoldTime: ComparisonMetric;
  longestWinStreak: ComparisonMetric;
}

export interface ComparisonWinner {
  winner: 'A' | 'B' | 'TIE';
  walletAddress: string;
  /** out of 10 */
  metricsWon: number;
  metricsLost: number;
  verdict: string;
  keyAdvantage: string;
}

export interface RadarDataPoint {
  metric: string;
  /** normalized 0-100 for radar */
  valueA: number;
  valueB: number;
}

export interface WalletComparison {
  walletA: WalletProfile;
  walletB: WalletProfile;
  metrics: ComparisonMetrics;
  winner: ComparisonWinner;
  radarData: RadarDataPoint[];
  /** cumulative realized PnL series for the comparison chart */
  pnlHistoryA: PnLPoint[];
  pnlHistoryB: PnLPoint[];
}

// ─── API ENVELOPES ─────────────────────────────────────────────────

export interface WalletsResponse {
  wallets: WalletSummary[];
  total: number;
}

export interface WalletDetailResponse {
  wallet: WalletProfile;
  trades: Trade[];
  pnlHistory: PnLPoint[];
  flows: WalletFlow[];
}

export interface FeedResponse {
  events: FeedEvent[];
}

export interface ApiError {
  error: string;
}

// ─── LIQUIDATION MAP (feature) ─────────────────────────────────────

export type CascadeRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export interface LiquidationCluster {
  /** the liquidation price */
  priceLevel: number;
  /** rounded to nearest bucket */
  priceBucket: number;
  /** $ of longs liquidated here */
  longVolume: number;
  /** $ of shorts liquidated here */
  shortVolume: number;
  /** number of long positions */
  longCount: number;
  /** number of short positions */
  shortCount: number;
  /** longVolume + shortVolume */
  totalVolume: number;
  /** wallet addresses in cluster */
  wallets: string[];
  dominantSide: 'LONG' | 'SHORT';
  /** 0-100 heatmap intensity */
  intensity: number;
}

export interface LiquidationMapData {
  market: string;
  markPrice: number;
  clusters: LiquidationCluster[];
  /** largest single cluster */
  maxVolume: number;
  /** total $ of longs in map */
  totalLongAtRisk: number;
  /** total $ of shorts in map */
  totalShortAtRisk: number;
  /** closest long liq to mark price */
  nearestLongLiq: number;
  /** closest short liq to mark price */
  nearestShortLiq: number;
  /** chart X axis min */
  priceRangeMin: number;
  /** chart X axis max */
  priceRangeMax: number;
  generatedAt: string;
}

export interface CascadeResult {
  triggeredClusters: LiquidationCluster[];
  /** $ value */
  totalLiquidated: number;
  /** unique wallet count */
  affectedWallets: number;
  cascadeRisk: CascadeRiskLevel;
  /** markPrice * (1 - drop/100) for a drop (see calculateCascadeRisk) */
  priceTarget: number;
}

// ─── LIQUIDATION CONFIG (contract read) ────────────────────────────

export interface LiquidationConfig {
  insuranceFundBalance: number;
  liquidationSplit: {
    liquidatorShareBps: number;
    insuranceShareBps: number;
    backstopShareBps: number;
  };
}

export interface MarginHealth {
  marginRatio: number;
  maintenanceMargin: number;
  initialMargin: number;
  collateralValue: number;
  accountValue: number;
}

export interface AccountInfo {
  address: string;
  collateralBalance: number;
  accountValue: number;
  totalPositionValue: number;
  lastUpdated: string;
}

// ─── CHART TOOLTIP / RECHARTS SAFE TYPES ───────────────────────────

export interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}
