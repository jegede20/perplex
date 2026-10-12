/**
 * Perplex — whale sentiment engine.
 *
 * Aggregates the open positioning of tracked smart-money wallets
 * (WHALE + SHARK tiers) into a market-level "temperature": are whales
 * bullishly or bearishly positioned, how decisively, and where did the
 * sentiment just shift? Pure functions — tested in
 * tests/sentimentEngine.test.ts.
 */
import type {
  FeedEvent,
  Market,
  MarketSentimentDetail,
  MarketSentimentTrend,
  OpenPosition,
  OverallSentiment,
  SentimentHistoryPoint,
  SentimentLabel,
  SentimentShift,
  SentimentTrend,
  WalletProfile,
  WalletSummary,
  WalletTier,
  WhaleSentimentData,
  WhaleWalletRow,
} from '@/lib/types';
import { MARKET_SYMBOLS } from '@/lib/perpl/markets';

// ─── helpers ───────────────────────────────────────────────────────

function isSmartMoney(tier: WalletTier): boolean {
  return tier === 'WHALE' || tier === 'SHARK';
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function sentimentLabelFor(netSentiment: number): SentimentLabel {
  if (netSentiment < -60) return 'EXTREME FEAR';
  if (netSentiment < -20) return 'FEAR';
  if (netSentiment <= 20) return 'NEUTRAL';
  if (netSentiment <= 60) return 'GREED';
  return 'EXTREME GREED';
}

function trendFor(net: number, previous?: number): SentimentTrend {
  if (previous === undefined) return 'STABLE';
  const delta = net - previous;
  const flippedBull = previous <= -10 && net >= 10;
  const flippedBear = previous >= 10 && net <= -10;
  if (flippedBull || flippedBear) return 'REVERSING';
  if (delta > 5) return 'INCREASING_BULL';
  if (delta < -5) return 'INCREASING_BEAR';
  return 'STABLE';
}

function marketTrendFor(net: number, previous?: number): MarketSentimentTrend {
  if (previous === undefined) return 'STABLE';
  const delta = net - previous;
  if (delta > 5) return 'MORE_BULLISH';
  if (delta < -5) return 'MORE_BEARISH';
  return 'STABLE';
}

interface WeightedSides {
  weightedLongOI: number;
  weightedShortOI: number;
  rawLongOI: number;
  rawShortOI: number;
  whaleCount: number;
  smartWallets: Set<string>;
  tierOI: Record<WalletTier, number>;
  scoreSum: number;
  scoreCount: number;
}

function weighPositions(
  positions: OpenPosition[],
  wallets: Map<string, WalletProfile>,
  market?: Market
): WeightedSides {
  const acc: WeightedSides = {
    weightedLongOI: 0,
    weightedShortOI: 0,
    rawLongOI: 0,
    rawShortOI: 0,
    whaleCount: 0,
    smartWallets: new Set<string>(),
    tierOI: { WHALE: 0, SHARK: 0, FISH: 0 },
    scoreSum: 0,
    scoreCount: 0,
  };

  const counted = new Set<string>();
  for (const pos of positions) {
    if (market && pos.market !== market) continue;
    const wallet = wallets.get(pos.walletAddress.toLowerCase());
    if (!wallet || !isSmartMoney(wallet.tier)) continue;

    const weight = clamp(wallet.smartMoneyScore, 0, 100) / 100;
    const notional = Math.max(pos.notionalValue, 0);
    if (pos.side === 'LONG') {
      acc.weightedLongOI += notional * weight;
      acc.rawLongOI += notional;
    } else {
      acc.weightedShortOI += notional * weight;
      acc.rawShortOI += notional;
    }
    acc.tierOI[wallet.tier] += notional;
    acc.smartWallets.add(wallet.address);
    if (!counted.has(wallet.address)) {
      counted.add(wallet.address);
      acc.scoreSum += wallet.smartMoneyScore;
      acc.scoreCount += 1;
    }
  }

  for (const address of acc.smartWallets) {
    const wallet = wallets.get(address);
    if (wallet?.tier === 'WHALE') acc.whaleCount += 1;
  }

  return acc;
}

function netFromSides(weightedLongOI: number, weightedShortOI: number): number {
  const total = weightedLongOI + weightedShortOI;
  if (total <= 0) return 0;
  return ((weightedLongOI - weightedShortOI) / total) * 100;
}

// ─── core (spec) ───────────────────────────────────────────────────

/**
 * Overall smart-money sentiment from all WHALE + SHARK positions.
 *
 * Positions are weighted by each wallet's smartMoneyScore:
 *   netSentiment = (wLong − wShort) / (wLong + wShort) × 100
 *   conviction   = |netSentiment|
 *
 * Labels: < −60 EXTREME FEAR · < −20 FEAR · ≤ +20 NEUTRAL
 *         ≤ +60 GREED · > +60 EXTREME GREED
 */
export function computeOverallSentiment(
  positions: OpenPosition[],
  wallets: WalletProfile[],
  previousNetSentiment?: number
): OverallSentiment {
  const byAddress = new Map<string, WalletProfile>();
  for (const w of wallets) byAddress.set(w.address.toLowerCase(), w);

  const acc = weighPositions(positions, byAddress);
  const netSentiment = netFromSides(acc.weightedLongOI, acc.weightedShortOI);
  const total = acc.weightedLongOI + acc.weightedShortOI;

  let trackedWhales = 0;
  let trackedSharks = 0;
  for (const w of wallets) {
    if (w.tier === 'WHALE') trackedWhales += 1;
    else if (w.tier === 'SHARK') trackedSharks += 1;
  }

  return {
    longPercent: total > 0 ? (acc.weightedLongOI / total) * 100 : 50,
    shortPercent: total > 0 ? (acc.weightedShortOI / total) * 100 : 50,
    netSentiment,
    sentimentLabel: sentimentLabelFor(netSentiment),
    conviction: Math.abs(netSentiment),
    totalWhaleOI: acc.rawLongOI + acc.rawShortOI,
    trackedWhales,
    trackedSharks,
    trend: trendFor(netSentiment, previousNetSentiment),
  };
}

/**
 * Per-market smart-money sentiment — same scoring as the overall
 * engine, filtered to one market. `previousSentiment` (net points
 * ~1h ago) drives the trend + trendChange fields.
 */
export function computeMarketSentiment(
  market: Market,
  positions: OpenPosition[],
  wallets: WalletProfile[],
  previousSentiment?: number
): MarketSentimentDetail {
  const byAddress = new Map<string, WalletProfile>();
  for (const w of wallets) byAddress.set(w.address.toLowerCase(), w);

  const acc = weighPositions(positions, byAddress, market);
  const netSentiment = netFromSides(acc.weightedLongOI, acc.weightedShortOI);
  const total = acc.weightedLongOI + acc.weightedShortOI;

  return {
    market,
    longPercent: total > 0 ? (acc.weightedLongOI / total) * 100 : 50,
    shortPercent: total > 0 ? (acc.weightedShortOI / total) * 100 : 50,
    netSentiment,
    conviction: Math.abs(netSentiment),
    whaleOI: acc.rawLongOI + acc.rawShortOI,
    whaleLongOI: acc.rawLongOI,
    whaleShortOI: acc.rawShortOI,
    whaleCount: acc.smartWallets.size,
    trend: marketTrendFor(netSentiment, previousSentiment),
    trendChange:
      previousSentiment !== undefined ? netSentiment - previousSentiment : 0,
    dominantTier: acc.tierOI.WHALE >= acc.tierOI.SHARK ? 'WHALE' : 'SHARK',
    avgSmartMoneyScore:
      acc.scoreCount > 0 ? Math.round(acc.scoreSum / acc.scoreCount) : 0,
  };
}

/**
 * Detect sentiment shifts: any market whose netSentiment moved more
 * than 10 points since the previous check becomes a SentimentShift,
 * attributed to the largest matching recent feed event.
 */
export function detectSentimentShifts(
  currentData: MarketSentimentDetail[],
  previousData: MarketSentimentDetail[],
  recentEvents: FeedEvent[]
): SentimentShift[] {
  const previousByMarket = new Map<Market, MarketSentimentDetail>();
  for (const prev of previousData) previousByMarket.set(prev.market, prev);

  const shifts: SentimentShift[] = [];

  for (const current of currentData) {
    const previous = previousByMarket.get(current.market);
    if (!previous) continue;
    const delta = current.netSentiment - previous.netSentiment;
    if (Math.abs(delta) <= 10) continue;

    const direction: SentimentShift['direction'] =
      delta > 0 ? 'TURNED_BULLISH' : 'TURNED_BEARISH';

    // attribute to the largest matching event in this market
    const wantedSide = delta > 0 ? 'LONG' : 'SHORT';
    const candidate = recentEvents
      .filter(
        (e) =>
          e.market === current.market &&
          (e.type === 'OPEN' || e.type === 'FLIP') &&
          e.side === wantedSide
      )
      .sort((a, b) => b.size - a.size)[0];

    const fallbackEvent = recentEvents
      .filter((e) => e.market === current.market)
      .sort((a, b) => b.size - a.size)[0];

    const causeEvent = candidate ?? fallbackEvent;
    const cause =
      causeEvent !== undefined
        ? `Large ${causeEvent.tier === 'WHALE' ? 'whale' : 'shark'} ${
            causeEvent.type === 'OPEN'
              ? 'opened'
              : causeEvent.type === 'CLOSE'
                ? 'closed'
                : causeEvent.type === 'FLIP'
                  ? 'flipped'
                  : 'was liquidated on'
          } ${wantedSide}`
        : `Smart money rotated ${wantedSide}`;

    shifts.push({
      id: `shift-${current.market}-${Math.round(delta * 10)}`,
      market: current.market,
      fromSentiment: previous.netSentiment,
      toSentiment: current.netSentiment,
      delta,
      direction,
      cause,
      walletAddress: causeEvent?.walletAddress ?? '',
      tier: causeEvent?.tier ?? 'WHALE',
      timestamp: causeEvent?.timestamp ?? new Date().toISOString(),
    });
  }

  return shifts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// ─── history series (deterministic, anchored to live values) ───────

/**
 * Smooth deterministic wobble as a pure function of ABSOLUTE time, so
 * any filtered window agrees on overlapping points.
 */
function wobble(market: Market, tMs: number): number {
  const seed = hashString(market);
  const a1 = 12 + (seed % 9);
  const a2 = 6 + (seed % 6);
  const p1 = ((seed >> 3) % 628) / 100;
  const p2 = ((seed >> 7) % 628) / 100;
  const t = tMs / 3_600_000; // hours
  return (
    a1 * Math.sin(t / 3.1 + p1) +
    a2 * Math.sin(t / 11.7 + p2) +
    3 * Math.sin(t / 1.4 + p1 / 2)
  );
}

export interface SentimentHistoryWindow {
  /** 1H | 4H | 24H | 7D */
  window: '1H' | '4H' | '24H' | '7D';
}

export const SENTIMENT_HISTORY_WINDOWS = ['1H', '4H', '24H', '7D'] as const;

/**
 * Build a sentiment history ending at `current`, drifting through a
 * deterministic harmonic series so the chart is stable across renders
 * and always ends at the live value.
 */
export function buildSentimentHistory(
  current: MarketSentimentDetail[],
  window: SentimentHistoryWindow['window'] = '24H',
  nowMs: number = Date.now()
): SentimentHistoryPoint[] {
  const spec = {
    '1H': { count: 12, stepMs: 5 * 60_000 },
    '4H': { count: 48, stepMs: 5 * 60_000 },
    '24H': { count: 96, stepMs: 15 * 60_000 },
    '7D': { count: 168, stepMs: 60 * 60_000 },
  }[window];

  const byMarket = new Map<Market, number>();
  for (const detail of current) byMarket.set(detail.market, detail.netSentiment);

  const points: SentimentHistoryPoint[] = [];
  for (let i = 0; i < spec.count; i += 1) {
    const t = nowMs - (spec.count - 1 - i) * spec.stepMs;
    const ramp = i / (spec.count - 1 || 1);
    const perMarket = {} as Record<Market, number>;
    let overallSum = 0;
    for (const market of MARKET_SYMBOLS) {
      const target = byMarket.get(market) ?? 0;
      const drifted = wobble(market, t) + (target - wobble(market, nowMs)) * ramp;
      perMarket[market] = clamp(drifted, -100, 100);
      overallSum += perMarket[market];
    }
    points.push({
      timestamp: new Date(t).toISOString(),
      overall: clamp(overallSum / MARKET_SYMBOLS.length, -100, 100),
      byMarket: perMarket,
    });
  }
  return points;
}

// ─── whale rows ────────────────────────────────────────────────────

function walletBias(profile: WalletProfile): {
  sentiment: number;
  longOI: number;
  shortOI: number;
  positionedMarkets: Market[];
} {
  let longOI = 0;
  let shortOI = 0;
  const markets = new Set<Market>();
  for (const pos of profile.openPositions) {
    if (pos.side === 'LONG') longOI += pos.notionalValue;
    else shortOI += pos.notionalValue;
    markets.add(pos.market);
  }
  const total = longOI + shortOI;
  return {
    sentiment: total > 0 ? ((longOI - shortOI) / total) * 100 : 0,
    longOI,
    shortOI,
    positionedMarkets: MARKET_SYMBOLS.filter((m) => markets.has(m)),
  };
}

function toWalletSummary(profile: WalletProfile): WalletSummary {
  return {
    address: profile.address,
    shortAddress: profile.shortAddress,
    tier: profile.tier,
    smartMoneyScore: profile.smartMoneyScore,
    winRate: profile.winRate,
    realizedPnl: profile.realizedPnl,
    totalVolume: profile.totalVolume,
    avgLeverage: profile.avgLeverage,
    lastActive: profile.lastActive,
    openPositionsCount: profile.openPositions.length,
  };
}

function whaleRows(wallets: WalletProfile[]): WhaleWalletRow[] {
  return wallets
    .filter((w) => isSmartMoney(w.tier) && w.openPositions.length > 0)
    .map((profile) => {
      const bias = walletBias(profile);
      return { ...toWalletSummary(profile), ...bias };
    });
}

// ─── assembly ──────────────────────────────────────────────────────

/**
 * Full WhaleSentimentData payload for /api/sentiment/detailed:
 * overall gauge values, per-market cards, recent shifts (detected vs
 * the ~1h-ago series point), and top bull/bear whale tables.
 */
export function buildWhaleSentiment(
  wallets: WalletProfile[],
  recentEvents: FeedEvent[],
  nowMs: number = Date.now()
): WhaleSentimentData {
  const positions = wallets.flatMap((w) => w.openPositions);
  const history = buildSentimentHistory(
    MARKET_SYMBOLS.map((market) =>
      computeMarketSentiment(market, positions, wallets)
    ),
    '24H',
    nowMs
  );

  const oneHourAgo = nowMs - 60 * 60_000;
  const previousPoint =
    history.reduce<SentimentHistoryPoint | null>((best, point) => {
      const t = new Date(point.timestamp).getTime();
      if (t > oneHourAgo) return best;
      return best === null || t > new Date(best.timestamp).getTime() ? point : best;
    }, null) ?? history[0];

  const byMarket = MARKET_SYMBOLS.map((market) =>
    computeMarketSentiment(
      market,
      positions,
      wallets,
      previousPoint?.byMarket[market]
    )
  );

  const overall = computeOverallSentiment(
    positions,
    wallets,
    previousPoint?.overall
  );

  const previousData = MARKET_SYMBOLS.map((market) => ({
    market,
    longPercent: 50,
    shortPercent: 50,
    netSentiment: previousPoint?.byMarket[market] ?? 0,
    conviction: Math.abs(previousPoint?.byMarket[market] ?? 0),
    whaleOI: 0,
    whaleLongOI: 0,
    whaleShortOI: 0,
    whaleCount: 0,
    trend: 'STABLE' as MarketSentimentTrend,
    trendChange: 0,
    dominantTier: 'WHALE' as WalletTier,
    avgSmartMoneyScore: 0,
  }));

  const recentShifts = detectSentimentShifts(byMarket, previousData, recentEvents).slice(0, 8);

  const rows = whaleRows(wallets);
  const topBullishWhales = [...rows]
    .filter((r) => r.sentiment > 0)
    .sort((a, b) => b.sentiment - a.sentiment)
    .slice(0, 5);
  const topBearishWhales = [...rows]
    .filter((r) => r.sentiment < 0)
    .sort((a, b) => a.sentiment - b.sentiment)
    .slice(0, 5);

  return {
    overall,
    byMarket,
    recentShifts,
    topBullishWhales,
    topBearishWhales,
    lastUpdated: new Date(nowMs).toISOString(),
  };
}

/** Re-export for API consumers that need the label helper. */
export type { SentimentShift, WhaleSentimentData };
