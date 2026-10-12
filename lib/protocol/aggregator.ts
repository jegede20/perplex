import {
  getLiquidationConfig,
  getMarketInfo,
  getAllPositionsInMarket,
  getAllWalletPositions,
  type OnChainPosition,
} from '@/lib/perpl/contracts';
import { getMarkets as restGetMarkets, getOrderBook } from '@/lib/perpl/api';
import { MARKETS, MARKET_SYMBOLS, getMarketById, isMarketSymbol } from '@/lib/perpl/markets';
import {
  fetchFeedEvents,
  fetchLiquidations,
  fetchMarketTrades,
  fetchTrades,
  fetchWalletFlows,
  fetchWalletProfile,
  fetchWallets,
  fetchMarketSnapshots,
  insertMarketSnapshot,
  insertProtocolSnapshot,
  upsertWalletProfile,
} from '@/lib/supabase/queries';
import {
  calculateSmartMoneyScore,
  rankWallets,
} from '@/lib/scoring/walletScore';
import { classifyTier } from '@/lib/scoring/walletTier';
import { generateBehaviorTags } from '@/lib/scoring/behaviorTags';
import { generateDemoLiquidations, summarizeLiquidations } from '@/lib/protocol/liquidations';
import {
  computeNetFlows,
  generateDemoNetFlows,
  generateDemoWalletFlows,
  netFlowInWindow,
} from '@/lib/protocol/flows';
import type {
  BehaviorTag,
  FeedEvent,
  FundingPoint,
  LiquidationEvent,
  Market,
  MarketDetail,
  MarketSentiment,
  MarketSummary,
  NetFlowPoint,
  OIPoint,
  OpenPosition,
  OrderBook,
  PnLPoint,
  PositionRisk,
  ProtocolChartPoint,
  ProtocolStats,
  SentimentResponse,
  TimeRange,
  Trade,
  TradeSide,
  TradeStatus,
  VolumePoint,
  WalletDetailResponse,
  WalletFlow,
  WalletProfile,
  WalletSummary,
} from '@/lib/types';

// ═══════════════════════════════════════════════════════════════════
// Protocol / market / wallet aggregation layer
//
// Every function follows the same contract:
//   1. Try live sources (Supabase indexed data → Perpl REST → Monad
//      contract reads)
//   2. Fall back to a deterministic seeded dataset so the dashboards
//      are fully explorable even before an indexer is running
//
// All numeric outputs are plain USD/asset numbers, ready for format.ts.
// ═══════════════════════════════════════════════════════════════════

// ─── deterministic PRNG ────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fakeTx(rng: () => number): string {
  const part = (n: number): string =>
    Math.floor(rng() * 16 ** n)
      .toString(16)
      .padStart(n, '0');
  return `0x${part(16)}${part(16)}${part(8)}`;
}

function fakeAddress(rng: () => number): string {
  const part = (n: number): string =>
    Math.floor(rng() * 16 ** n)
      .toString(16)
      .padStart(n, '0');
  return `0x${part(20)}${part(20)}`;
}

function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function daysAgoIso(days: number, hourOffset = 0): string {
  return new Date(Date.now() - days * 86_400_000 - hourOffset * 3_600_000).toISOString();
}

// ─── market reference prices (demo baseline) ───────────────────────

interface MarketBaseline {
  price: number;
  decimals: number;
  dailyVolume: number;
  oi: number;
  longBias: number; // 0–1 fraction of OI that is long
  funding: number; // per 8h
}

const MARKET_BASELINES: Record<Market, MarketBaseline> = {
  BTC: { price: 98_420, decimals: 2, dailyVolume: 48_000_000, oi: 12_400_000, longBias: 0.58, funding: 0.0000842 },
  ETH: { price: 3_418, decimals: 2, dailyVolume: 31_500_000, oi: 8_100_000, longBias: 0.54, funding: 0.0000651 },
  SOL: { price: 186.4, decimals: 2, dailyVolume: 18_200_000, oi: 4_300_000, longBias: 0.61, funding: 0.0001284 },
  MON: { price: 2.842, decimals: 4, dailyVolume: 12_800_000, oi: 2_900_000, longBias: 0.66, funding: 0.0001932 },
  HYPE: { price: 42.58, decimals: 3, dailyVolume: 9_600_000, oi: 2_150_000, longBias: 0.57, funding: -0.0000418 },
  ZEC: { price: 286.15, decimals: 2, dailyVolume: 6_400_000, oi: 1_480_000, longBias: 0.43, funding: -0.0000925 },
};

function priceDecimals(market: Market): number {
  return MARKET_BASELINES[market].decimals;
}

function roundPrice(market: Market, value: number): number {
  return Number(value.toFixed(priceDecimals(market)));
}

// ─── demo wallet universe ──────────────────────────────────────────

interface DemoWallet {
  profile: WalletProfile;
  trades: Trade[];
  flows: WalletFlow[];
  pnlHistory: PnLPoint[];
}

interface DemoUniverse {
  wallets: DemoWallet[];
  feedEvents: FeedEvent[];
  liquidations: LiquidationEvent[];
}

interface Archetype {
  winRate: [number, number];
  volume: [number, number];
  leverage: [number, number];
  holdSeconds: [number, number];
  tradesPerMonth: [number, number];
  lossStreakTolerance: number;
}

const ARCHETYPES: Record<'PRO_WHALE' | 'SMART_MID' | 'ACTIVE' | 'ROOKIE' | 'DEGEN', Archetype> = {
  PRO_WHALE: { winRate: [0.72, 0.9], volume: [900_000, 4_200_000], leverage: [4, 12], holdSeconds: [7_200, 260_000], tradesPerMonth: [40, 85], lossStreakTolerance: 0.2 },
  SMART_MID: { winRate: [0.62, 0.78], volume: [280_000, 1_200_000], leverage: [5, 16], holdSeconds: [3_600, 120_000], tradesPerMonth: [35, 70], lossStreakTolerance: 0.3 },
  ACTIVE: { winRate: [0.5, 0.66], volume: [90_000, 420_000], leverage: [8, 22], holdSeconds: [1_200, 60_000], tradesPerMonth: [45, 90], lossStreakTolerance: 0.45 },
  ROOKIE: { winRate: [0.32, 0.52], volume: [18_000, 140_000], leverage: [10, 28], holdSeconds: [600, 30_000], tradesPerMonth: [25, 60], lossStreakTolerance: 0.6 },
  DEGEN: { winRate: [0.38, 0.58], volume: [60_000, 380_000], leverage: [18, 45], holdSeconds: [300, 12_000], tradesPerMonth: [55, 110], lossStreakTolerance: 0.55 },
};

const ARCHETYPE_MIX: Array<keyof typeof ARCHETYPES> = [
  'PRO_WHALE', 'PRO_WHALE', 'PRO_WHALE', 'PRO_WHALE',
  'SMART_MID', 'SMART_MID', 'SMART_MID', 'SMART_MID', 'SMART_MID', 'SMART_MID',
  'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE',
  'ROOKIE', 'ROOKIE', 'ROOKIE', 'ROOKIE', 'ROOKIE', 'ROOKIE',
  'DEGEN', 'DEGEN', 'DEGEN', 'DEGEN', 'DEGEN', 'DEGEN', 'DEGEN', 'DEGEN',
];

function randBetween(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function buildTrade(
  rng: () => number,
  walletAddress: string,
  index: number,
  archetype: Archetype,
  forceWin: boolean
): Trade {
  const market = pick(rng, MARKET_SYMBOLS);
  const baseline = MARKET_BASELINES[market];
  const side: TradeSide = rng() > 0.48 ? 'LONG' : 'SHORT';
  const leverage = Number(randBetween(rng, archetype.leverage[0], archetype.leverage[1]).toFixed(1));
  const notional = Math.round(randBetween(rng, 2_000, 95_000) / 100) * 100;
  const entryPrice = roundPrice(market, baseline.price * (0.92 + rng() * 0.16));
  const size = entryPrice > 0 ? Number((notional / entryPrice).toFixed(4)) : 0;
  const movePct = (forceWin ? 1 : -1) * randBetween(rng, 0.004, 0.075) * (archetype === ARCHETYPES.DEGEN ? 1.6 : 1);
  const exitPrice = roundPrice(market, entryPrice * (1 + (side === 'LONG' ? movePct : -movePct)));
  const holdSeconds = Math.round(
    randBetween(rng, archetype.holdSeconds[0], archetype.holdSeconds[1])
  );
  const realizedPnl = Number((movePct * notional).toFixed(2));
  // Liquidated when the adverse move wipes ~85% of posted margin.
  const marginLossRatio = Math.abs(movePct) * leverage;
  const status: TradeStatus = !forceWin && marginLossRatio >= 0.85 ? 'LIQUIDATED' : 'CLOSED';
  const ts = Date.now() - Math.floor(rng() * 30 * 86_400_000) - index * 37_000;

  return {
    id: `trade_${walletAddress.slice(2, 10)}_${index}`,
    walletAddress,
    market,
    side,
    size: Math.abs(size),
    entryPrice,
    exitPrice,
    leverage,
    realizedPnl,
    pnlPercent: Number(((realizedPnl / Math.max(notional / leverage, 1)) * 100).toFixed(2)),
    holdSeconds,
    txHash: fakeTx(rng),
    blockNumber: 12_000_000 + Math.floor(rng() * 900_000),
    timestamp: new Date(ts).toISOString(),
    status,
  };
}

function buildPnLHistory(trades: Trade[], days = 30): PnLPoint[] {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const byDay = new Map<string, { pnl: number; count: number }>();
  for (const trade of sorted) {
    const key = new Date(trade.timestamp).toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { pnl: 0, count: 0 };
    entry.pnl += trade.realizedPnl ?? 0;
    entry.count += 1;
    byDay.set(key, entry);
  }

  const points: PnLPoint[] = [];
  let cumulative = 0;
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { pnl: 0, count: 0 };
    cumulative += entry.pnl;
    points.push({ date: key, dailyPnl: entry.pnl, cumulativePnl: cumulative, tradeCount: entry.count });
  }
  return points;
}

function streaksOf(trades: Trade[]): { win: number; loss: number } {
  let win = 0;
  let loss = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const trade of trades) {
    if ((trade.realizedPnl ?? 0) > 0) {
      curWin += 1;
      curLoss = 0;
      win = Math.max(win, curWin);
    } else {
      curLoss += 1;
      curWin = 0;
      loss = Math.max(loss, curLoss);
    }
  }
  return { win, loss };
}

function maxDrawdownOf(pnlHistory: PnLPoint[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const point of pnlHistory) {
    peak = Math.max(peak, point.cumulativePnl);
    if (peak > 0) {
      maxDd = Math.max(maxDd, ((peak - point.cumulativePnl) / peak) * 100);
    }
  }
  return Number(maxDd.toFixed(2));
}

function buildOpenPositions(
  rng: () => number,
  walletAddress: string,
  count: number
): OpenPosition[] {
  const positions: OpenPosition[] = [];
  const used = new Set<Market>();

  for (let i = 0; i < count; i += 1) {
    let market = pick(rng, MARKET_SYMBOLS);
    let guard = 0;
    while (used.has(market) && guard < 8) {
      market = pick(rng, MARKET_SYMBOLS);
      guard += 1;
    }
    used.add(market);

    const baseline = MARKET_BASELINES[market];
    const side: TradeSide = rng() > 0.45 ? 'LONG' : 'SHORT';
    const leverage = Number(randBetween(rng, 3, 24).toFixed(1));
    const markPrice = roundPrice(market, baseline.price * (0.985 + rng() * 0.03));
    const entryPrice = roundPrice(
      market,
      markPrice * (side === 'LONG' ? 1 - randBetween(rng, -0.04, 0.05) : 1 + randBetween(rng, -0.04, 0.05))
    );
    const notionalValue = Math.round(randBetween(rng, 18_000, 640_000) / 100) * 100;
    const size = markPrice > 0 ? Number((notionalValue / markPrice).toFixed(4)) : 0;
    const unrealizedPnl =
      side === 'LONG' ? (markPrice - entryPrice) * size : (entryPrice - markPrice) * size;
    const liqDistance = randBetween(rng, 0.06, 0.36);
    const liquidationPrice =
      side === 'LONG' ? markPrice * (1 - liqDistance) : markPrice * (1 + liqDistance);

    positions.push({
      walletAddress,
      market,
      side,
      size,
      notionalValue,
      entryPrice,
      markPrice,
      unrealizedPnl,
      unrealizedPnlPercent:
        entryPrice > 0 ? (unrealizedPnl / (size * entryPrice)) * 100 : 0,
      leverage,
      liquidationPrice: roundPrice(market, liquidationPrice),
      distanceToLiq: liqDistance * 100,
      marginRatio: Number((1 / leverage).toFixed(3)),
      openedAt: daysAgoIso(rng() * 6, rng() * 12),
      txHash: fakeTx(rng),
    });
  }
  return positions;
}

function buildDemoWallet(index: number): DemoWallet {
  const seed = 9_001 + index * 131;
  const rng = mulberry32(seed);
  const archetypeKey = ARCHETYPE_MIX[index % ARCHETYPE_MIX.length];
  const archetype = ARCHETYPES[archetypeKey];
  const address = fakeAddress(rng);

  const totalTrades = Math.round(randBetween(rng, archetype.tradesPerMonth[0], archetype.tradesPerMonth[1]));
  const targetWinRate = randBetween(rng, archetype.winRate[0], archetype.winRate[1]);
  const winCount = Math.round(totalTrades * targetWinRate);

  const outcomes: boolean[] = [
    ...Array.from({ length: winCount }, () => true),
    ...Array.from({ length: totalTrades - winCount }, () => false),
  ];
  for (let i = outcomes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [outcomes[i], outcomes[j]] = [outcomes[j], outcomes[i]];
  }

  const trades: Trade[] = [];
  for (let i = 0; i < totalTrades; i += 1) {
    trades.push(buildTrade(rng, address, i, archetype, outcomes[i]));
  }
  trades.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const realizedPnl = trades.reduce((s, t) => s + (t.realizedPnl ?? 0), 0);
  const grossProfit = trades.filter((t) => (t.realizedPnl ?? 0) > 0).reduce((s, t) => s + (t.realizedPnl ?? 0), 0);
  const grossLoss = Math.abs(trades.filter((t) => (t.realizedPnl ?? 0) < 0).reduce((s, t) => s + (t.realizedPnl ?? 0), 0));
  const actualWins = trades.filter((t) => (t.realizedPnl ?? 0) > 0).length;
  const actualLosses = trades.length - actualWins;
  const winRate = trades.length > 0 ? (actualWins / trades.length) * 100 : 0;
  const totalVolume = trades.reduce((s, t) => s + t.entryPrice * Math.abs(t.size), 0) + randBetween(rng, 20_000, 600_000);
  const leverages = trades.map((t) => t.leverage);
  const avgLeverage = leverages.length ? leverages.reduce((a, b) => a + b, 0) / leverages.length : 1;
  const maxLeverage = leverages.length ? Math.max(...leverages) : 1;
  const holds = trades.map((t) => t.holdSeconds ?? 0).filter((h) => h > 0);
  const avgHoldSeconds = holds.length ? Math.round(holds.reduce((a, b) => a + b, 0) / holds.length) : 0;
  const avgLossHoldSeconds = (() => {
    const lossHolds = trades
      .filter((t) => (t.realizedPnl ?? 0) < 0 && (t.holdSeconds ?? 0) > 0)
      .map((t) => t.holdSeconds ?? 0);
    return lossHolds.length ? Math.round(lossHolds.reduce((a, b) => a + b, 0) / lossHolds.length) : 0;
  })();

  const { win: longestWinStreak, loss: longestLossStreak } = streaksOf(trades);
  const pnlHistory = buildPnLHistory(trades);
  const maxDrawdown = maxDrawdownOf(pnlHistory);
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 4.2 : 0;

  const volumeByMarket = new Map<Market, number>();
  for (const t of trades) {
    volumeByMarket.set(t.market, (volumeByMarket.get(t.market) ?? 0) + t.entryPrice * Math.abs(t.size));
  }
  const primaryMarkets = [...volumeByMarket.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([m]) => m);

  const btcVolumeRatio = (volumeByMarket.get('BTC') ?? 0) / Math.max(totalVolume, 1);
  const tradesAgainstTrend = randBetween(rng, 0.25, 0.72);

  const behaviorTags: BehaviorTag[] = generateBehaviorTags({
    winRate: winRate / 100,
    realizedPnl,
    totalVolume,
    longestWinStreak,
    totalTrades: trades.length,
    avgLeverage,
    maxLeverage,
    avgHoldSeconds,
    btcVolumeRatio,
    tradesAgainstTrend,
    avgLossHoldSeconds,
  });

  const smartMoneyScore = calculateSmartMoneyScore({
    winRate,
    realizedPnl,
    totalVolume,
    longestWinStreak,
    totalTrades: trades.length,
    avgLeverage,
    maxLeverage,
    avgHoldSeconds,
    btcVolumeRatio,
    tradesAgainstTrend,
    avgLossHoldSeconds,
  });

  const tier = classifyTier(smartMoneyScore, totalVolume);
  const openPositions = buildOpenPositions(rng, address, Math.floor(rng() * 3.2));
  const unrealizedPnl = openPositions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const flows = generateDemoWalletFlows(address, seed + 7);
  const collateralBalance = flows.reduce((s, f) => s + (f.type === 'DEPOSIT' ? f.amount : -f.amount), 0) + realizedPnl * 0.4;

  const profile: WalletProfile = {
    address,
    shortAddress: shortAddress(address),
    tier,
    smartMoneyScore,
    winRate: Number(winRate.toFixed(1)),
    winCount: actualWins,
    lossCount: actualLosses,
    totalTrades: trades.length,
    realizedPnl: Number(realizedPnl.toFixed(2)),
    unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
    totalVolume: Number(totalVolume.toFixed(2)),
    avgLeverage: Number(avgLeverage.toFixed(1)),
    maxLeverage: Number(maxLeverage.toFixed(1)),
    avgHoldSeconds,
    longestWinStreak,
    longestLossStreak,
    maxDrawdown,
    profitFactor: Number(profitFactor.toFixed(2)),
    behaviorTags,
    primaryMarkets: primaryMarkets.length > 0 ? primaryMarkets : ['BTC', 'ETH'],
    collateralBalance: Number(Math.max(collateralBalance, 1_200).toFixed(2)),
    firstSeen: daysAgoIso(30 + rng() * 300),
    lastActive: trades.length > 0 ? trades[trades.length - 1].timestamp : new Date().toISOString(),
    openPositions,
  };

  return { profile, trades, flows, pnlHistory };
}

function buildFeedFromTrades(universe: DemoWallet[]): FeedEvent[] {
  const rng = mulberry32(555);
  const events: FeedEvent[] = [];

  for (const wallet of universe) {
    const recent = wallet.trades.slice(-4);
    for (const trade of recent) {
      const isClose = trade.status !== 'OPEN';
      events.push({
        id: `feed_${trade.id}`,
        type: trade.status === 'LIQUIDATED' ? 'LIQUIDATION' : isClose ? 'CLOSE' : 'OPEN',
        walletAddress: wallet.profile.address,
        shortAddress: wallet.profile.shortAddress,
        tier: wallet.profile.tier,
        smartMoneyScore: wallet.profile.smartMoneyScore,
        market: trade.market,
        side: trade.side,
        size: Math.abs(trade.size) * trade.entryPrice,
        price: trade.entryPrice,
        leverage: trade.leverage,
        realizedPnl: trade.realizedPnl,
        txHash: trade.txHash,
        timestamp: trade.timestamp,
      });
    }
    for (const position of wallet.profile.openPositions) {
      events.push({
        id: `feed_pos_${position.txHash}`,
        type: 'OPEN',
        walletAddress: wallet.profile.address,
        shortAddress: wallet.profile.shortAddress,
        tier: wallet.profile.tier,
        smartMoneyScore: wallet.profile.smartMoneyScore,
        market: position.market,
        side: position.side,
        size: position.notionalValue,
        price: position.entryPrice,
        leverage: position.leverage,
        txHash: position.txHash,
        timestamp: position.openedAt,
      });
    }
    if (rng() > 0.86 && wallet.trades.length > 3) {
      const a = wallet.trades[wallet.trades.length - 1];
      const b = wallet.trades[wallet.trades.length - 2];
      events.push({
        id: `feed_flip_${wallet.profile.address.slice(2, 8)}_${a.id}`,
        type: 'FLIP',
        walletAddress: wallet.profile.address,
        shortAddress: wallet.profile.shortAddress,
        tier: wallet.profile.tier,
        smartMoneyScore: wallet.profile.smartMoneyScore,
        market: a.market,
        side: b.side === 'LONG' ? 'SHORT' : 'LONG',
        size: Math.abs(a.size) * a.entryPrice * 1.4,
        price: a.entryPrice,
        leverage: a.leverage,
        txHash: a.txHash,
        timestamp: new Date(new Date(a.timestamp).getTime() + 60_000).toISOString(),
      });
    }
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

let universeCache: DemoUniverse | null = null;

function getUniverse(): DemoUniverse {
  if (universeCache) return universeCache;
  const wallets = ARCHETYPE_MIX.map((_, i) => buildDemoWallet(i));
  const feedEvents = buildFeedFromTrades(wallets);
  const liquidations = generateDemoLiquidations(26, 7331);
  universeCache = { wallets, feedEvents, liquidations };
  return universeCache;
}

/**
 * Full deterministic dataset — used by the Supabase seeding job so the
 * indexed database and the in-memory fallback tell the same story.
 */
export function getSeedDataset(): DemoUniverse {
  return getUniverse();
}

/**
 * All tracked wallet profiles (whales/sharks/fish) — input for the
 * whale sentiment engine and liquidation/compare feature layers.
 */
export function getTrackedWallets(): WalletProfile[] {
  return getUniverse().wallets.map((w) => w.profile);
}

// ─── demo market state ─────────────────────────────────────────────

interface DemoMarketState {
  summary: MarketSummary;
  fundingHistory: FundingPoint[];
  volumeHistory: VolumePoint[];
  oiHistory: OIPoint[];
  orderBook: OrderBook;
  positionRisks: PositionRisk[];
}

function buildOrderBook(rng: () => number, market: Market, markPrice: number): OrderBook {
  const bids: [number, number][] = [];
  const asks: [number, number][] = [];
  const tick = markPrice * 0.00035;

  for (let i = 0; i < 14; i += 1) {
    bids.push([
      roundPrice(market, markPrice - tick * (i + 1) * (1 + rng() * 0.35)),
      Number((randBetween(rng, 0.6, 9) * (1 + i * 0.32)).toFixed(3)),
    ]);
    asks.push([
      roundPrice(market, markPrice + tick * (i + 1) * (1 + rng() * 0.35)),
      Number((randBetween(rng, 0.6, 9) * (1 + i * 0.32)).toFixed(3)),
    ]);
  }

  const bestBid = bids[0][0];
  const bestAsk = asks[0][0];
  return {
    bids,
    asks,
    spread: Number((bestAsk - bestBid).toFixed(priceDecimals(market))),
    midPrice: markPrice,
    timestamp: new Date().toISOString(),
  };
}

function buildDemoMarketStates(): Map<Market, DemoMarketState> {
  const states = new Map<Market, DemoMarketState>();
  const universe = getUniverse();

  for (const symbol of MARKET_SYMBOLS) {
    const seed = hashString(`perplex_market_${symbol}`);
    const rng = mulberry32(seed);
    const baseline = MARKET_BASELINES[symbol];
    const markPrice = roundPrice(symbol, baseline.price * (0.994 + rng() * 0.012));
    const spotPrice = roundPrice(symbol, markPrice * (1 + (rng() - 0.5) * 0.0022));
    const changePct = Number(((rng() - 0.42) * 6.2).toFixed(2));
    const priceChange24h = Number((markPrice * (changePct / 100)).toFixed(priceDecimals(symbol)));

    const oi = baseline.oi * (0.9 + rng() * 0.25);
    const longPercent = Math.round(baseline.longBias * 100 + (rng() - 0.5) * 12);
    const clampedLong = Math.min(Math.max(longPercent, 24), 78);
    const openInterestLong = oi * (clampedLong / 100);
    const openInterestShort = oi - openInterestLong;

    const fundingRate = Number((baseline.funding * (0.72 + rng() * 0.7)).toFixed(10));
    const fundingAPR = fundingRate * 3 * 365 * 100;
    const volume24h = baseline.dailyVolume * (0.78 + rng() * 0.5);
    const trades24h = Math.round(volume24h / (markPrice * (symbol === 'BTC' ? 0.28 : symbol === 'ETH' ? 2.4 : 46)));
    const liquidations24h = Math.round(3 + rng() * 16);

    // histories
    const volumeHistory: VolumePoint[] = [];
    const oiHistory: OIPoint[] = [];
    for (let d = 30; d >= 1; d -= 1) {
      const date = daysAgoIso(d).slice(0, 10);
      const wave = 1 + Math.sin((30 - d) / 3.8) * 0.22;
      const vol = baseline.dailyVolume * wave * (0.7 + rng() * 0.6);
      volumeHistory.push({ date, volume: vol, trades: Math.round(vol / (markPrice * 0.5 + 1)) });
      const oiPoint = baseline.oi * wave * (0.82 + rng() * 0.36);
      const longFrac = Math.min(Math.max(baseline.longBias + (rng() - 0.5) * 0.16, 0.25), 0.76);
      oiHistory.push({
        date,
        longOI: oiPoint * longFrac,
        shortOI: oiPoint * (1 - longFrac),
        totalOI: oiPoint,
      });
    }

    const fundingHistory: FundingPoint[] = [];
    for (let h = 21; h >= 0; h -= 1) {
      const timestamp = new Date(Date.now() - h * 8 * 3_600_000).toISOString();
      const rate = Number((fundingRate + (rng() - 0.5) * 0.00012).toFixed(10));
      fundingHistory.push({ timestamp, rate, apr: rate * 3 * 365 * 100 });
    }

    // position risks from universe open positions + synthetic proximity clusters
    const positionRisks: PositionRisk[] = [];
    for (const wallet of universe.wallets) {
      for (const position of wallet.profile.openPositions) {
        if (position.market !== symbol) continue;
        positionRisks.push({
          walletAddress: wallet.profile.address,
          shortAddress: wallet.profile.shortAddress,
          tier: wallet.profile.tier,
          market: symbol,
          side: position.side,
          size: position.notionalValue,
          markPrice: position.markPrice,
          liquidationPrice: position.liquidationPrice,
          distanceToLiq: position.distanceToLiq,
          marginRatio: position.marginRatio,
        });
      }
    }
    for (let i = 0; i < 10; i += 1) {
      const side: TradeSide = rng() > 0.5 ? 'LONG' : 'SHORT';
      const distance = randBetween(rng, 1.2, 28);
      const liqPrice =
        side === 'LONG'
          ? markPrice * (1 - distance / 100)
          : markPrice * (1 + distance / 100);
      const size = randBetween(rng, 18_000, 640_000);
      const addr = fakeAddress(rng);
      positionRisks.push({
        walletAddress: addr,
        shortAddress: shortAddress(addr),
        tier: size > 500_000 ? 'WHALE' : size > 100_000 ? 'SHARK' : 'FISH',
        market: symbol,
        side,
        size,
        markPrice,
        liquidationPrice: roundPrice(symbol, liqPrice),
        distanceToLiq: distance,
        marginRatio: Number(randBetween(rng, 0.08, 0.5).toFixed(3)),
      });
    }

    // whale counts + top position
    const marketPositions = universe.wallets.flatMap((w) =>
      w.profile.openPositions
        .filter((p) => p.market === symbol)
        .map((p) => ({ wallet: w, position: p }))
    );
    const whaleCount =
      marketPositions.filter((x) => x.wallet.profile.tier === 'WHALE').length +
      positionRisks.filter((p) => p.tier === 'WHALE').length;
    const topPosition = marketPositions.reduce(
      (max, x) => Math.max(max, x.position.notionalValue),
      positionRisks.reduce((m, p) => Math.max(m, p.size), 0)
    );

    const dominantSide: MarketSummary['dominantSide'] =
      clampedLong > 54 ? 'LONG' : clampedLong < 46 ? 'SHORT' : 'NEUTRAL';

    const summary: MarketSummary = {
      id: MARKETS[symbol].id,
      symbol,
      markPrice,
      spotPrice,
      priceChange24h,
      priceChangePercent24h: changePct,
      openInterest: oi,
      openInterestLong,
      openInterestShort,
      longPercent: clampedLong,
      shortPercent: 100 - clampedLong,
      fundingRate,
      fundingAPR,
      volume24h,
      trades24h,
      liquidations24h,
      dominantSide,
      whaleCount,
      topPosition,
    };

    states.set(symbol, {
      summary,
      fundingHistory,
      volumeHistory,
      oiHistory,
      orderBook: buildOrderBook(rng, symbol, markPrice),
      positionRisks,
    });
  }

  return states;
}

let marketStatesCache: Map<Market, DemoMarketState> | null = null;

function getMarketStates(): Map<Market, DemoMarketState> {
  if (!marketStatesCache) marketStatesCache = buildDemoMarketStates();
  return marketStatesCache;
}

// ─── live overlays ─────────────────────────────────────────────────

async function overlayChainMarket(
  summary: MarketSummary,
  positions: OnChainPosition[] | null,
  marketInfo: Awaited<ReturnType<typeof getMarketInfo>>
): Promise<MarketSummary> {
  let next = { ...summary };

  if (marketInfo) {
    const oiLong = marketInfo.openInterestLong > 0 ? marketInfo.openInterestLong : next.openInterestLong;
    const oiShort = marketInfo.openInterestShort > 0 ? marketInfo.openInterestShort : next.openInterestShort;
    const totalOI = oiLong + oiShort;
    const longPercent = totalOI > 0 ? (oiLong / totalOI) * 100 : next.longPercent;
    const clampedPct = Math.min(Math.max(longPercent, 8), 92);
    next = {
      ...next,
      markPrice: marketInfo.markPrice > 0 ? marketInfo.markPrice : next.markPrice,
      spotPrice: marketInfo.spotPrice > 0 ? marketInfo.spotPrice : next.spotPrice,
      openInterest: totalOI > 0 ? totalOI : next.openInterest,
      openInterestLong: oiLong,
      openInterestShort: oiShort,
      longPercent: Number(clampedPct.toFixed(1)),
      shortPercent: Number((100 - clampedPct).toFixed(1)),
      fundingRate: marketInfo.fundingRate,
      fundingAPR: marketInfo.fundingRate * 3 * 365 * 100,
      dominantSide: clampedPct > 54 ? 'LONG' : clampedPct < 46 ? 'SHORT' : 'NEUTRAL',
    };
  }

  if (positions && positions.length > 0) {
    let oiLong = 0;
    let oiShort = 0;
    let largest = next.topPosition;
    const owners = new Set<string>();
    for (const p of positions) {
      const notional = p.size * (p.entryPrice > 0 ? p.entryPrice : next.markPrice);
      if (p.isLong) oiLong += notional;
      else oiShort += notional;
      largest = Math.max(largest, notional);
      owners.add(p.owner.toLowerCase());
    }
    const total = oiLong + oiShort;
    if (total > 0) {
      const longPercent = (oiLong / total) * 100;
      const clampedPct = Math.min(Math.max(longPercent, 8), 92);
      next = {
        ...next,
        openInterest: total,
        openInterestLong: oiLong,
        openInterestShort: oiShort,
        longPercent: Number(clampedPct.toFixed(1)),
        shortPercent: Number((100 - clampedPct).toFixed(1)),
        dominantSide: clampedPct > 54 ? 'LONG' : clampedPct < 46 ? 'SHORT' : 'NEUTRAL',
        whaleCount: positions.filter((p) => p.size * p.entryPrice > 500_000).length || next.whaleCount,
        topPosition: largest,
      };
    }
  }

  return next;
}

// ─── Supabase write-back (indexer path) ────────────────────────────

let lastSnapshotWrite = 0;
const SNAPSHOT_WRITE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Persist real market + protocol snapshots to Supabase (fire-and-forget,
 * throttled to once per 5 minutes). This builds the historical
 * market_snapshots / protocol_snapshots series from live Perpl data.
 */
function persistSnapshots(summaries: MarketSummary[], stats: ProtocolStats | null): void {
  const now = Date.now();
  if (now - lastSnapshotWrite < SNAPSHOT_WRITE_INTERVAL_MS) return;
  lastSnapshotWrite = now;

  void (async () => {
    try {
      for (const m of summaries) {
        await insertMarketSnapshot({
          market: m.symbol,
          mark_price: m.markPrice,
          open_interest: m.openInterest,
          oi_long: m.openInterestLong,
          oi_short: m.openInterestShort,
          funding_rate: m.fundingRate,
          volume_24h: m.volume24h,
          liquidations_24h: m.liquidations24h,
          whale_count: m.whaleCount,
        });
      }
      if (stats) {
        await insertProtocolSnapshot({
          volume_24h: stats.volume24h,
          open_interest: stats.openInterest,
          tvl: stats.tvl,
          fees_24h: stats.fees24h,
          active_traders_24h: stats.activeTradersToday,
          total_accounts: stats.totalAccounts,
          net_flow_24h: stats.netFlow24h,
          liquidation_count_24h: stats.liquidationCount24h,
          liquidation_vol_24h: stats.liquidationVolume24h,
          insurance_fund: stats.insuranceFundBalance,
        });
      }
    } catch (error) {
      console.warn('[perplex/aggregator] snapshot persistence skipped:', error instanceof Error ? error.message : String(error));
    }
  })();
}

/**
 * Persist a freshly computed wallet profile when the indexed row is
 * missing or stale (> 1h) — "run walletScore algorithm → update Supabase".
 */
function persistWalletProfile(profile: WalletProfile, existing: WalletProfile | null): void {
  const stale =
    !existing ||
    Date.now() - new Date(existing.lastActive ?? 0).getTime() > 60 * 60 * 1000;
  if (!stale) return;
  void upsertWalletProfile(profile).catch(() => undefined);
}

// ─── exported: protocol stats ──────────────────────────────────────

export async function getProtocolStats(range: TimeRange = '24H'): Promise<ProtocolStats> {
  const universe = getUniverse();
  const summaries = await getMarketsOverview();

  const volume24h = summaries.reduce((s, m) => s + m.volume24h, 0);
  const volume7d = volume24h * 6.4;
  const volume30d = volume24h * 26.8;
  const volumeAllTime = volume30d * 4.1;
  const openInterest = summaries.reduce((s, m) => s + m.openInterest, 0);

  // live insurance fund + OI overlay
  let insuranceFundBalance = 892_400;
  let insuranceFundChange24h = 4_218;
  try {
    const liqConfig = await getLiquidationConfig();
    if (liqConfig && liqConfig.insuranceFundBalance > 0) {
      insuranceFundBalance = liqConfig.insuranceFundBalance;
      insuranceFundChange24h = insuranceFundBalance * 0.0048;
    }
  } catch {
    // graceful degradation — keep demo value
  }

  const realTvl = summaries.reduce((s, m) => s + (m.tvl ?? 0), 0);
  let tvl = realTvl > 0 ? realTvl : 34_100_000;
  let netFlow24h = 2_100_000;
  let netFlow7d = 8_400_000;
  try {
    const flows = universe.wallets.flatMap((w) => w.flows);
    const flowPoints = computeNetFlows(flows, 30);
    const inflowSum = flowPoints.reduce((s, p) => s + p.net, 0);
    netFlow24h = flowPoints[flowPoints.length - 1]?.net ?? netFlow24h;
    netFlow7d = flowPoints.slice(-7).reduce((s, p) => s + p.net, 0);
    // Only synthesize TVL when live per-market TVL is unavailable.
    if (realTvl <= 0 && Math.abs(inflowSum) > 0) {
      tvl = 28_000_000 + inflowSum * 3.4;
    }
  } catch {
    // graceful degradation
  }

  const liqStats = summarizeLiquidations(universe.liquidations);
  const activeTradersToday = 1_842;
  const fees24h = volume24h * 0.0004;
  const fees7d = fees24h * 6.4;
  const fees30d = fees24h * 26.8;

  const stats: ProtocolStats = {
    volume24h,
    volume7d,
    volume30d,
    volumeAllTime,
    openInterest,
    tvl,
    fees24h,
    fees7d,
    fees30d,
    activeTradersToday,
    activeTraders7d: 3_241,
    activeTraders30d: 7_846,
    totalAccounts: 12_841,
    netFlow24h,
    netFlow7d,
    liquidationCount24h: liqStats.count24h,
    liquidationVolume24h: liqStats.volume24h,
    insuranceFundBalance,
    insuranceFundChange24h,
    lastUpdated: new Date().toISOString(),
  };

  persistSnapshots(summaries, stats);

  // range-aware volume override for the headline card
  if (range === '7D') stats.volume24h = stats.volume7d / 6.4;
  return stats;
}

export async function getProtocolChartSeries(range: TimeRange = '30D'): Promise<ProtocolChartPoint[]> {
  const marketStates = getMarketStates();
  const universe = getUniverse();
  const days = range === '24H' ? 1 : range === '7D' ? 7 : range === '30D' ? 30 : 30;

  const points: ProtocolChartPoint[] = [];
  for (let d = days; d >= (range === '24H' ? 0 : 1); d -= 1) {
    const date = daysAgoIso(d).slice(0, 10);
    let volume = 0;
    let openInterest = 0;
    let liquidations = 0;
    for (const state of marketStates.values()) {
      const v = state.volumeHistory[state.volumeHistory.length - d] ?? state.volumeHistory[state.volumeHistory.length - 1];
      const o = state.oiHistory[state.oiHistory.length - d] ?? state.oiHistory[state.oiHistory.length - 1];
      volume += v?.volume ?? 0;
      openInterest += o?.totalOI ?? 0;
      liquidations += Math.round((v?.trades ?? 0) * 0.002);
    }
    points.push({
      date,
      volume,
      openInterest,
      activeUsers: Math.round(1_200 + (volume / 1_000_000) * 22),
      fees: volume * 0.0004,
      liquidations,
    });
  }

  if (points.length === 0) {
    points.push({
      date: daysAgoIso(0).slice(0, 10),
      volume: universe.wallets.reduce((s, w) => s + w.profile.totalVolume / 30, 0),
      openInterest: 28_600_000,
      activeUsers: 1_842,
      fees: 28_400,
      liquidations: 47,
    });
  }
  return points;
}

export async function getNetFlowSeries(range: TimeRange = '30D'): Promise<NetFlowPoint[]> {
  const days = range === '24H' ? 1 : range === '7D' ? 7 : 30;
  const universe = getUniverse();
  const flows = universe.wallets.flatMap((w) => w.flows);
  const computed = computeNetFlows(flows, days);
  const hasActivity = computed.some((p) => p.deposits > 0 || p.withdrawals > 0);
  return hasActivity ? computed : generateDemoNetFlows(days);
}

// ─── exported: markets ─────────────────────────────────────────────

/**
 * Overlay live Perpl REST context onto a market summary — authoritative
 * for price, OI total, 24h volume, TVL, and funding when reachable.
 */
function applyRestOverlay(prev: MarketSummary, live: MarketSummary): MarketSummary {
  const oiTotal = live.openInterest > 0 ? live.openInterest : prev.openInterest;
  const longPct = prev.longPercent;
  return {
    ...prev,
    markPrice: live.markPrice,
    spotPrice: live.spotPrice > 0 ? live.spotPrice : prev.spotPrice,
    priceChange24h: live.priceChange24h,
    priceChangePercent24h: live.priceChangePercent24h,
    openInterest: oiTotal,
    openInterestLong:
      live.openInterestLong > 0 ? live.openInterestLong : (oiTotal * longPct) / 100,
    openInterestShort:
      live.openInterestShort > 0 ? live.openInterestShort : (oiTotal * (100 - longPct)) / 100,
    fundingRate: live.fundingRate,
    fundingAPR: live.fundingAPR,
    volume24h: live.volume24h > 0 ? live.volume24h : prev.volume24h,
    tvl: live.tvl ?? prev.tvl,
  };
}

export async function getMarketsOverview(): Promise<MarketSummary[]> {
  const states = getMarketStates();
  const results: MarketSummary[] = [];

  await Promise.all(
    MARKET_SYMBOLS.map(async (symbol) => {
      const state = states.get(symbol);
      const baseline = MARKET_BASELINES[symbol];
      let summary: MarketSummary = state
        ? state.summary
        : {
            id: MARKETS[symbol].id,
            symbol,
            markPrice: baseline.price,
            spotPrice: baseline.price,
            priceChange24h: 0,
            priceChangePercent24h: 0,
            openInterest: baseline.oi,
            openInterestLong: baseline.oi * 0.55,
            openInterestShort: baseline.oi * 0.45,
            longPercent: 55,
            shortPercent: 45,
            fundingRate: baseline.funding,
            fundingAPR: baseline.funding * 3 * 365 * 100,
            volume24h: baseline.dailyVolume,
            trades24h: 1200,
            liquidations24h: 8,
            dominantSide: 'LONG',
            whaleCount: 12,
            topPosition: 500_000,
          };

      const [marketInfo, positions] = await Promise.all([
        getMarketInfo(MARKETS[symbol].id),
        getAllPositionsInMarket(MARKETS[symbol].id),
      ]);
      summary = await overlayChainMarket(summary, positions, marketInfo);
      results.push(summary);
    })
  );

  // Overlay live Perpl REST context — authoritative for price, OI total,
  // 24h volume, TVL, and funding when reachable.
  try {
    const rest = await restGetMarkets();
    if (rest && rest.length > 0) {
      for (const live of rest) {
        const idx = results.findIndex((m) => m.symbol === live.symbol);
        if (idx >= 0 && live.markPrice > 0) {
          results[idx] = applyRestOverlay(results[idx], live);
        }
      }
    }
  } catch {
    // graceful degradation
  }

  return results.sort((a, b) => a.id - b.id);
}

function topTradersForMarket(
  states: Map<Market, DemoMarketState>,
  symbol: Market
): WalletSummary[] {
  const universe = getUniverse();
  const rows = universe.wallets
    .map((w) => {
      const positions = w.profile.openPositions.filter((p) => p.market === symbol);
      return { w, count: positions.length, size: positions.reduce((s, p) => s + p.notionalValue, 0) };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  return rows.map(({ w, count }) => ({
    address: w.profile.address,
    shortAddress: w.profile.shortAddress,
    tier: w.profile.tier,
    smartMoneyScore: w.profile.smartMoneyScore,
    winRate: w.profile.winRate,
    realizedPnl: w.profile.realizedPnl,
    totalVolume: w.profile.totalVolume,
    avgLeverage: w.profile.avgLeverage,
    lastActive: w.profile.lastActive,
    openPositionsCount: count,
  }));
}

export async function getMarketDetail(idOrSymbol: string | number): Promise<MarketDetail | null> {
  const states = getMarketStates();

  let symbol: Market | null = null;
  if (typeof idOrSymbol === 'number') {
    symbol = (getMarketById(idOrSymbol).symbol as Market) ?? null;
  } else if (isMarketSymbol(idOrSymbol)) {
    symbol = idOrSymbol.toUpperCase() as Market;
  } else if (!Number.isNaN(Number(idOrSymbol))) {
    symbol = getMarketById(Number(idOrSymbol)).symbol as Market;
  }
  if (!symbol) return null;

  const state = states.get(symbol);
  if (!state) return null;

  const [marketInfo, positions, restBook, snapshots] = await Promise.all([
    getMarketInfo(MARKETS[symbol].id),
    getAllPositionsInMarket(MARKETS[symbol].id),
    getOrderBook(MARKETS[symbol].id),
    fetchMarketSnapshots(symbol, daysAgoIso(7)),
  ]);

  let summary = await overlayChainMarket(state.summary, positions, marketInfo);

  // Live Perpl REST context is authoritative for price/OI/volume/funding.
  try {
    const rest = await restGetMarkets();
    const live = rest?.find((m) => m.symbol === symbol && m.markPrice > 0);
    if (live) summary = applyRestOverlay(summary, live);
  } catch {
    // graceful degradation
  }

  if (snapshots && snapshots.length > 0) {
    const latest = snapshots[0];
    summary = {
      ...summary,
      markPrice: latest.mark_price > 0 ? latest.mark_price : summary.markPrice,
      openInterest: latest.open_interest > 0 ? latest.open_interest : summary.openInterest,
      volume24h: latest.volume_24h > 0 ? latest.volume_24h : summary.volume24h,
    };
  }

  // recent liquidations for this market
  let recentLiquidations = universeLiquidationsFor(symbol);
  const dbLiquidations = await fetchLiquidations(20, symbol);
  if (dbLiquidations && dbLiquidations.length > 0) {
    recentLiquidations = dbLiquidations;
  }

  // top traders from live positions when available
  let topTraders = topTradersForMarket(states, symbol);
  if (positions && positions.length > 0) {
    const byOwner = new Map<string, { size: number; isLong: boolean }>();
    for (const p of positions) {
      const key = p.owner.toLowerCase();
      const entry = byOwner.get(key) ?? { size: 0, isLong: p.isLong };
      entry.size += p.size * (p.entryPrice > 0 ? p.entryPrice : summary.markPrice);
      byOwner.set(key, entry);
    }
    const liveTraders: WalletSummary[] = [...byOwner.entries()]
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10)
      .map(([address, info]) => {
        const known = getUniverse().wallets.find((w) => w.profile.address.toLowerCase() === address);
        return {
          address,
          shortAddress: shortAddress(address),
          tier: info.size > 500_000 ? 'WHALE' : info.size > 100_000 ? 'SHARK' : 'FISH',
          smartMoneyScore: known?.profile.smartMoneyScore ?? 55,
          winRate: known?.profile.winRate ?? 54.2,
          realizedPnl: known?.profile.realizedPnl ?? 0,
          totalVolume: known?.profile.totalVolume ?? info.size,
          avgLeverage: known?.profile.avgLeverage ?? 8.4,
          lastActive: known?.profile.lastActive ?? new Date().toISOString(),
          openPositionsCount: 1,
        };
      });
    if (liveTraders.length > 0) topTraders = liveTraders;
  }

  return {
    ...summary,
    fundingHistory: state.fundingHistory,
    volumeHistory: state.volumeHistory,
    oiHistory: state.oiHistory,
    positionsNearLiquidation: state.positionRisks,
    recentLiquidations,
    orderBook: restBook ?? state.orderBook,
    topTraders,
  };
}

function universeLiquidationsFor(symbol: Market): LiquidationEvent[] {
  return getUniverse().liquidations.filter((l) => l.market === symbol);
}

// ─── exported: leaderboard + wallets ───────────────────────────────

export interface LeaderboardOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'smart_money_score' | 'total_volume' | 'realized_pnl';
  tier?: WalletSummary['tier'];
  minScore?: number;
}

export async function getLeaderboard(
  options: LeaderboardOptions = {}
): Promise<{ wallets: WalletSummary[]; total: number }> {
  const { limit = 20, offset = 0, sortBy = 'smart_money_score', tier, minScore } = options;

  const db = await fetchWallets({ limit, offset, sortBy, tier, minScore });
  if (db && db.wallets.length > 0) {
    return db;
  }

  const universe = getUniverse();
  let profiles = universe.wallets.map((w) => w.profile);

  // Synthesize coverage for wallets touched by demo liquidations so the
  // leaderboards always feel dense.
  profiles = rankWallets(profiles);

  if (tier) profiles = profiles.filter((p) => p.tier === tier);
  if (minScore !== undefined) profiles = profiles.filter((p) => p.smartMoneyScore >= minScore);

  const sortKey: 'smartMoneyScore' | 'totalVolume' | 'realizedPnl' =
    sortBy === 'total_volume' ? 'totalVolume' : sortBy === 'realized_pnl' ? 'realizedPnl' : 'smartMoneyScore';
  profiles.sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));

  const page = profiles.slice(offset, offset + limit);
  return {
    wallets: page.map((p) => ({
      address: p.address,
      shortAddress: p.shortAddress,
      tier: p.tier,
      smartMoneyScore: p.smartMoneyScore,
      winRate: p.winRate,
      realizedPnl: p.realizedPnl,
      totalVolume: p.totalVolume,
      avgLeverage: p.avgLeverage,
      lastActive: p.lastActive,
      openPositionsCount: p.openPositions.length,
    })),
    total: profiles.length,
  };
}

function synthesizeWalletFromAddress(address: string): DemoWallet {
  const rng = mulberry32(hashString(address.toLowerCase()));
  const index = Math.floor(rng() * ARCHETYPE_MIX.length);
  const built = buildDemoWallet(index);
  const trades = built.trades.map((t) => ({ ...t, walletAddress: address }));
  const flows = built.flows;
  const profile: WalletProfile = {
    ...built.profile,
    address,
    shortAddress: shortAddress(address),
    openPositions: built.profile.openPositions.map((p) => ({ ...p, walletAddress: address })),
  };
  return { profile, trades, flows, pnlHistory: built.pnlHistory };
}

export async function getWalletDetail(address: string): Promise<WalletDetailResponse | null> {
  const normalized = address.toLowerCase();

  // 1. Indexed profile + history (Supabase)
  const [dbProfile, dbTrades, dbFlows] = await Promise.all([
    fetchWalletProfile(normalized),
    fetchTrades(normalized),
    fetchWalletFlows(normalized),
  ]);

  // 2. Deterministic universe / synthesized fallback
  const universe = getUniverse();
  const known = universe.wallets.find((w) => w.profile.address.toLowerCase() === normalized);
  const fallback: DemoWallet = known ?? synthesizeWalletFromAddress(normalized);

  const trades: Trade[] = dbTrades && dbTrades.length > 0 ? dbTrades : fallback.trades;
  const flows: WalletFlow[] = dbFlows && dbFlows.length > 0 ? dbFlows : fallback.flows;
  const pnlHistory: PnLPoint[] = dbTrades && dbTrades.length > 0 ? buildPnLHistory(trades) : fallback.pnlHistory;

  // 3. Live open positions from chain (getPosition per market)
  let openPositions = fallback.profile.openPositions;
  try {
    const livePositions = await getAllWalletPositions(address);
    if (livePositions.length > 0) openPositions = livePositions;
  } catch {
    // graceful degradation — keep fallback positions
  }

  // 4. Score + tier recomputed from the merged dataset
  const stats = computeStatsFromTrades(trades);
  const behaviorTags = generateBehaviorTags({
    winRate: stats.winRate / 100,
    realizedPnl: stats.realizedPnl,
    totalVolume: stats.totalVolume,
    longestWinStreak: stats.longestWinStreak,
    totalTrades: stats.totalTrades,
    avgLeverage: stats.avgLeverage,
    maxLeverage: stats.maxLeverage,
    avgHoldSeconds: stats.avgHoldSeconds,
    btcVolumeRatio: stats.btcVolumeRatio,
    tradesAgainstTrend: 0.42,
    avgLossHoldSeconds: stats.avgLossHoldSeconds,
  });
  const smartMoneyScore = calculateSmartMoneyScore({
    winRate: stats.winRate,
    realizedPnl: stats.realizedPnl,
    totalVolume: stats.totalVolume,
    longestWinStreak: stats.longestWinStreak,
    totalTrades: stats.totalTrades,
    avgLeverage: stats.avgLeverage,
    maxLeverage: stats.maxLeverage,
    avgHoldSeconds: stats.avgHoldSeconds,
    btcVolumeRatio: stats.btcVolumeRatio,
    tradesAgainstTrend: 0.42,
    avgLossHoldSeconds: stats.avgLossHoldSeconds,
  });

  const base = dbProfile ?? fallback.profile;
  const profile: WalletProfile = {
    ...base,
    address,
    shortAddress: shortAddress(address),
    tier: classifyTier(smartMoneyScore, stats.totalVolume),
    smartMoneyScore,
    winRate: Number(stats.winRate.toFixed(1)),
    winCount: stats.winCount,
    lossCount: stats.lossCount,
    totalTrades: stats.totalTrades,
    realizedPnl: Number(stats.realizedPnl.toFixed(2)),
    unrealizedPnl: Number(openPositions.reduce((s, p) => s + p.unrealizedPnl, 0).toFixed(2)),
    totalVolume: Number(stats.totalVolume.toFixed(2)),
    avgLeverage: Number(stats.avgLeverage.toFixed(1)),
    maxLeverage: Number(stats.maxLeverage.toFixed(1)),
    avgHoldSeconds: stats.avgHoldSeconds,
    longestWinStreak: stats.longestWinStreak,
    longestLossStreak: stats.longestLossStreak,
    maxDrawdown: stats.maxDrawdown,
    profitFactor: Number(stats.profitFactor.toFixed(2)),
    behaviorTags,
    primaryMarkets: stats.primaryMarkets,
    openPositions,
    rank: rankWallets(
      universe.wallets.map((w) => ({
        ...w.profile,
        smartMoneyScore: w.profile.address.toLowerCase() === normalized ? smartMoneyScore : w.profile.smartMoneyScore,
      }))
    ).find((p) => p.address.toLowerCase() === normalized)?.rank,
  };

  persistWalletProfile(profile, dbProfile);

  return { wallet: profile, trades, pnlHistory, flows };
}

function computeStatsFromTrades(trades: Trade[]): {
  winRate: number;
  winCount: number;
  lossCount: number;
  totalTrades: number;
  realizedPnl: number;
  totalVolume: number;
  avgLeverage: number;
  maxLeverage: number;
  avgHoldSeconds: number;
  avgLossHoldSeconds: number;
  longestWinStreak: number;
  longestLossStreak: number;
  maxDrawdown: number;
  profitFactor: number;
  btcVolumeRatio: number;
  primaryMarkets: Market[];
} {
  const wins = trades.filter((t) => (t.realizedPnl ?? 0) > 0);
  const losses = trades.filter((t) => (t.realizedPnl ?? 0) < 0);
  const totalTrades = trades.length;
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  const realizedPnl = trades.reduce((s, t) => s + (t.realizedPnl ?? 0), 0);
  const totalVolume = trades.reduce((s, t) => s + Math.abs(t.size) * t.entryPrice, 0);
  const leverages = trades.map((t) => t.leverage).filter((l) => l > 0);
  const avgLeverage = leverages.length ? leverages.reduce((a, b) => a + b, 0) / leverages.length : 0;
  const maxLeverage = leverages.length ? Math.max(...leverages) : 0;
  const holds = trades.map((t) => t.holdSeconds ?? 0).filter((h) => h > 0);
  const avgHoldSeconds = holds.length ? Math.round(holds.reduce((a, b) => a + b, 0) / holds.length) : 0;
  const lossHolds = losses.map((t) => t.holdSeconds ?? 0).filter((h) => h > 0);
  const avgLossHoldSeconds = lossHolds.length
    ? Math.round(lossHolds.reduce((a, b) => a + b, 0) / lossHolds.length)
    : 0;
  const { win: longestWinStreak, loss: longestLossStreak } = streaksOf(trades);
  const pnlHistory = buildPnLHistory(trades);
  const maxDrawdown = maxDrawdownOf(pnlHistory);
  const grossProfit = wins.reduce((s, t) => s + (t.realizedPnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.realizedPnl ?? 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 4.2 : 0;

  const volumeByMarket = new Map<Market, number>();
  for (const t of trades) {
    volumeByMarket.set(t.market, (volumeByMarket.get(t.market) ?? 0) + Math.abs(t.size) * t.entryPrice);
  }
  const primaryMarkets = [...volumeByMarket.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([m]) => m);
  const btcVolumeRatio = (volumeByMarket.get('BTC') ?? 0) / Math.max(totalVolume, 1);

  return {
    winRate,
    winCount,
    lossCount,
    totalTrades,
    realizedPnl,
    totalVolume: totalVolume || 1,
    avgLeverage,
    maxLeverage,
    avgHoldSeconds,
    avgLossHoldSeconds,
    longestWinStreak,
    longestLossStreak,
    maxDrawdown,
    profitFactor,
    btcVolumeRatio,
    primaryMarkets: primaryMarkets.length > 0 ? primaryMarkets : ['BTC', 'ETH'],
  };
}

// ─── exported: feed ────────────────────────────────────────────────

export interface FeedFilters {
  limit?: number;
  market?: Market;
  tier?: FeedEvent['tier'];
  type?: FeedEvent['type'];
  minSize?: number;
}

export async function getFeedEvents(filters: FeedFilters = {}): Promise<FeedEvent[]> {
  const { limit = 50, market, tier, type, minSize } = filters;

  const db = await fetchFeedEvents({ limit, market, tier, type, minSize });
  let events: FeedEvent[] = getUniverse().feedEvents;

  if (db && db.length > 0) events = db;

  if (market) events = events.filter((e) => e.market === market);
  if (type) events = events.filter((e) => e.type === type);
  if (minSize !== undefined) events = events.filter((e) => e.size >= minSize);
  if (tier) {
    events = events.filter((e) => {
      if (tier === 'WHALE') return e.size >= 500_000;
      if (tier === 'SHARK') return e.size >= 100_000 && e.size < 500_000;
      return e.size < 100_000;
    });
  }

  return events.slice(0, limit);
}

// ─── exported: sentiment ───────────────────────────────────────────

export async function getSentiment(): Promise<SentimentResponse> {
  const overviews = await getMarketsOverview();

  const markets: MarketSentiment[] = overviews.map((m) => {
    const whaleLongPercent = Math.min(88, Math.max(12, m.longPercent + (m.whaleCount > 8 ? 6 : -3)));
    return {
      market: m.symbol,
      longPercent: m.longPercent,
      shortPercent: m.shortPercent,
      dominantSide: m.dominantSide,
      whaleLongPercent,
      whaleShortPercent: 100 - whaleLongPercent,
      openInterest: m.openInterest,
      signal: m.longPercent > 56 ? 'BULLISH' : m.longPercent < 44 ? 'BEARISH' : 'NEUTRAL',
    };
  });

  const totalOI = markets.reduce((s, m) => s + m.openInterest, 0);
  const weightedLong =
    totalOI > 0
      ? markets.reduce((s, m) => s + m.longPercent * m.openInterest, 0) / totalOI
      : markets.reduce((s, m) => s + m.longPercent, 0) / Math.max(markets.length, 1);

  return {
    markets,
    overall: {
      longPercent: Number(weightedLong.toFixed(1)),
      shortPercent: Number((100 - weightedLong).toFixed(1)),
      dominantSide: weightedLong > 54 ? 'LONG' : weightedLong < 46 ? 'SHORT' : 'NEUTRAL',
      signal: weightedLong > 56 ? 'BULLISH' : weightedLong < 44 ? 'BEARISH' : 'NEUTRAL',
    },
    lastUpdated: new Date().toISOString(),
  };
}

// ─── exported: misc helpers used by API routes ─────────────────────

/** Wallet flow + PnL aggregates for the wallet API route. */
export async function getWalletFlows(address: string): Promise<WalletFlow[]> {
  const db = await fetchWalletFlows(address.toLowerCase());
  if (db && db.length > 0) return db;
  const universe = getUniverse();
  const known = universe.wallets.find((w) => w.profile.address.toLowerCase() === address.toLowerCase());
  return known ? known.flows : generateDemoWalletFlows(address, hashString(address));
}

/** Market trade feed used by the market API route. */
export async function getMarketTrades(market: Market, limit = 50): Promise<Trade[]> {
  const db = await fetchMarketTrades(market, limit);
  if (db && db.length > 0) return db;
  const universe = getUniverse();
  return universe.wallets
    .flatMap((w) => w.trades.filter((t) => t.market === market))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
