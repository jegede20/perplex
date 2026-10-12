/**
 * Perplex — liquidation map engine.
 *
 * Groups open positions by liquidation price into heatmap clusters so
 * traders can see WHERE a wave of liquidations would trigger around the
 * current mark price. Pure functions — tested in tests/mapBuilder.test.ts.
 *
 * Data sources feeding this engine (see app/api/liquidation-map):
 *   1. On-chain  — getAllPositionsInMarket(marketId) from Perpl exchange
 *   2. Fallback  — deterministic book scaled to live REST OI totals
 */
import type {
  CascadeResult,
  CascadeRiskLevel,
  LiquidationCluster,
  LiquidationMapData,
  Market,
  OpenPosition,
} from '@/lib/types';
import type { OnChainPosition } from '@/lib/perpl/contracts';

/** Default bucket width as a percent of price (0.5% → $500 buckets at $100K). */
export const DEFAULT_BUCKET_PERCENT = 0.5;

/** Chart window around mark price (±30%). */
export const PRICE_RANGE_SPAN = 0.3;

export type CascadeDirection = 'DROP' | 'RISE';

// ─── helpers ───────────────────────────────────────────────────────

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

/** Deterministic 32-byte pseudo tx hash for synthetic positions. */
function syntheticTx(seed: string): string {
  let hex = '';
  let salt = seed;
  for (let i = 0; i < 8; i += 1) {
    hex += hashString(salt).toString(16).padStart(8, '0');
    salt = `${salt}#${i}`;
  }
  return `0x${hex}`;
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function priceDecimalsOf(market: Market): number {
  switch (market) {
    case 'BTC':
    case 'ZEC':
      return 1;
    case 'ETH':
      return 2;
    case 'SOL':
    case 'HYPE':
      return 3;
    case 'MON':
      return 6;
    default:
      return 2;
  }
}

// ─── map builder ───────────────────────────────────────────────────

/**
 * Group positions by liquidation price into heatmap buckets.
 *
 * Bucket = Math.round(liqPrice / bucketWidth) * bucketWidth where
 * bucketWidth = markPrice * bucketSizePercent / 100.
 * Intensity = (cluster.totalVolume / maxVolume) * 100.
 * Only buckets within markPrice ±30% are kept; clusters sort ascending
 * by priceLevel.
 */
export function buildLiquidationMap(
  positions: OpenPosition[],
  markPrice: number,
  market: string,
  bucketSizePercent: number = DEFAULT_BUCKET_PERCENT
): LiquidationMapData {
  const pct = bucketSizePercent > 0 ? bucketSizePercent : DEFAULT_BUCKET_PERCENT;
  const bucketWidth = Math.max((markPrice * pct) / 100, 1e-9);
  const priceRangeMin = markPrice * (1 - PRICE_RANGE_SPAN);
  const priceRangeMax = markPrice * (1 + PRICE_RANGE_SPAN);

  const byBucket = new Map<number, LiquidationCluster>();

  for (const pos of positions) {
    const liqPrice = pos.liquidationPrice;
    if (!Number.isFinite(liqPrice) || liqPrice <= 0) continue;
    if (liqPrice < priceRangeMin || liqPrice > priceRangeMax) continue;

    const priceBucket = Math.round(liqPrice / bucketWidth) * bucketWidth;
    const bucketKey = round(priceBucket, 8);
    const notional = Math.max(pos.notionalValue, 0);

    let cluster = byBucket.get(bucketKey);
    if (!cluster) {
      cluster = {
        priceLevel: priceBucket,
        priceBucket,
        longVolume: 0,
        shortVolume: 0,
        longCount: 0,
        shortCount: 0,
        totalVolume: 0,
        wallets: [],
        dominantSide: 'LONG',
        intensity: 0,
      };
      byBucket.set(bucketKey, cluster);
    }

    if (pos.side === 'LONG') {
      cluster.longVolume += notional;
      cluster.longCount += 1;
    } else {
      cluster.shortVolume += notional;
      cluster.shortCount += 1;
    }
    cluster.totalVolume = cluster.longVolume + cluster.shortVolume;
    if (!cluster.wallets.includes(pos.walletAddress)) {
      cluster.wallets.push(pos.walletAddress);
    }
    cluster.dominantSide = cluster.longVolume >= cluster.shortVolume ? 'LONG' : 'SHORT';
  }

  const clusters = [...byBucket.values()].sort((a, b) => a.priceLevel - b.priceLevel);
  const maxVolume = clusters.reduce((m, c) => Math.max(m, c.totalVolume), 0);

  for (const cluster of clusters) {
    cluster.intensity =
      maxVolume > 0 ? Math.round((cluster.totalVolume / maxVolume) * 100) : 0;
    cluster.priceLevel = round(cluster.priceLevel, priceDecimalsOf(market as Market));
  }

  const totalLongAtRisk = clusters.reduce((s, c) => s + c.longVolume, 0);
  const totalShortAtRisk = clusters.reduce((s, c) => s + c.shortVolume, 0);

  // Nearest long liq: highest long cluster at/below mark (the "floor" about
  // to break on a drop) — falls back to the closest long cluster overall.
  const longClusters = clusters.filter((c) => c.longCount > 0);
  const shortClusters = clusters.filter((c) => c.shortCount > 0);

  const below = longClusters.filter((c) => c.priceLevel <= markPrice);
  const nearestLongLiq =
    below.length > 0
      ? Math.max(...below.map((c) => c.priceLevel))
      : longClusters.length > 0
        ? longClusters.reduce((best, c) =>
            Math.abs(c.priceLevel - markPrice) < Math.abs(best.priceLevel - markPrice) ? c : best
          ).priceLevel
        : markPrice;

  const above = shortClusters.filter((c) => c.priceLevel >= markPrice);
  const nearestShortLiq =
    above.length > 0
      ? Math.min(...above.map((c) => c.priceLevel))
      : shortClusters.length > 0
        ? shortClusters.reduce((best, c) =>
            Math.abs(c.priceLevel - markPrice) < Math.abs(best.priceLevel - markPrice) ? c : best
          ).priceLevel
        : markPrice;

  return {
    market,
    markPrice,
    clusters,
    maxVolume,
    totalLongAtRisk,
    totalShortAtRisk,
    nearestLongLiq: round(nearestLongLiq, priceDecimalsOf(market as Market)),
    nearestShortLiq: round(nearestShortLiq, priceDecimalsOf(market as Market)),
    priceRangeMin,
    priceRangeMax,
    generatedAt: new Date().toISOString(),
  };
}

// ─── cascade simulator ─────────────────────────────────────────────

function classifyCascade(totalLiquidated: number): CascadeRiskLevel {
  if (totalLiquidated < 500_000) return 'LOW';
  if (totalLiquidated < 2_000_000) return 'MEDIUM';
  if (totalLiquidated <= 5_000_000) return 'HIGH';
  return 'EXTREME';
}

/**
 * Simulate a price move of `percent` (1–30) in `direction` and sum the
 * liquidations it would trigger:
 *   DROP → longs with liq in [target, mark] are liquidated
 *   RISE → shorts with liq in [mark, target] are liquidated
 *
 * Cascade risk thresholds (by $ liquidated):
 *   < $500K → LOW · $500K–$2M → MEDIUM · $2M–$5M → HIGH · > $5M → EXTREME
 */
export function calculateCascadeRisk(
  clusters: LiquidationCluster[],
  markPrice: number,
  priceDropPercent: number,
  direction: CascadeDirection = 'DROP'
): CascadeResult {
  const move = Math.max(priceDropPercent, 0) / 100;
  const priceTarget =
    direction === 'DROP' ? markPrice * (1 - move) : markPrice * (1 + move);

  const triggeredClusters = clusters.filter((cluster) => {
    if (direction === 'DROP') {
      return (
        cluster.longCount > 0 &&
        cluster.priceLevel >= priceTarget &&
        cluster.priceLevel <= markPrice
      );
    }
    return (
      cluster.shortCount > 0 &&
      cluster.priceLevel >= markPrice &&
      cluster.priceLevel <= priceTarget
    );
  });

  const totalLiquidated = triggeredClusters.reduce(
    (sum, c) => sum + (direction === 'DROP' ? c.longVolume : c.shortVolume),
    0
  );

  const wallets = new Set<string>();
  for (const cluster of triggeredClusters) {
    for (const wallet of cluster.wallets) wallets.add(wallet);
  }

  return {
    triggeredClusters,
    totalLiquidated,
    affectedWallets: wallets.size,
    cascadeRisk: classifyCascade(totalLiquidated),
    priceTarget,
  };
}

// ─── position sources ──────────────────────────────────────────────

/**
 * Convert decoded on-chain positions (getPositionsV2) into the app's
 * OpenPosition shape so they can flow through buildLiquidationMap.
 */
export function onChainPositionsToOpen(
  positions: OnChainPosition[],
  markPrice: number,
  market: Market
): OpenPosition[] {
  const now = new Date().toISOString();
  return positions.map((p, i) => {
    const side = p.isLong ? 'LONG' : 'SHORT';
    const notionalValue = Math.abs(p.size * p.entryPrice) || Math.abs(p.size);
    const unrealizedPnl =
      side === 'LONG'
        ? (markPrice - p.entryPrice) * p.size
        : (p.entryPrice - markPrice) * p.size;
    const denom = Math.abs(p.margin) || 1;
    return {
      walletAddress: p.owner.toLowerCase(),
      market,
      side,
      size: p.size,
      notionalValue,
      entryPrice: p.entryPrice,
      markPrice,
      unrealizedPnl,
      unrealizedPnlPercent: (unrealizedPnl / denom) * 100,
      leverage: p.entryPrice > 0 ? notionalValue / denom : 1,
      liquidationPrice: p.liquidationPrice,
      distanceToLiq:
        p.liquidationPrice > 0 && markPrice > 0
          ? ((p.liquidationPrice - markPrice) / markPrice) * 100
          : 0,
      marginRatio: p.margin > 0 ? (p.margin / notionalValue) * 100 : 0,
      openedAt: now,
      txHash: syntheticTx(`onchain-${p.owner}-${i}`),
    };
  });
}

export interface SyntheticBookOptions {
  market: Market;
  markPrice: number;
  /** Total long notional to distribute (USD). */
  longOI: number;
  /** Total short notional to distribute (USD). */
  shortOI: number;
  /** Positions per side (default 42). */
  sampleCount?: number;
}

/**
 * Deterministic open-position book for a market, used when the on-chain
 * position array cannot be decoded. Leverage distribution and entry
 * prices are seeded per market (stable across reloads) and notionals are
 * scaled to the LIVE open-interest totals from the Perpl REST context —
 * so the map reflects real market size and real mark price.
 */
export function synthesizeMarketBook(options: SyntheticBookOptions): OpenPosition[] {
  const { market, markPrice, longOI, shortOI } = options;
  const perSide = Math.max(options.sampleCount ?? 42, 2);
  const rng = mulberry32(hashString(`liqmap-${market}`));
  const now = Date.now();

  const buildSide = (side: 'LONG' | 'SHORT', targetOI: number): OpenPosition[] => {
    if (targetOI <= 0) return [];
    const rows: Array<{ weight: number; leverage: number; entry: number; ageH: number }> = [];
    let weightSum = 0;
    for (let i = 0; i < perSide; i += 1) {
      // Leverage skewed toward 3–15x with occasional degens up to 50x.
      const u = rng();
      const leverage = 3 + (u ** 2) * 47;
      // Entries cluster around the mark with realistic dispersion.
      const entryNoise = (rng() - 0.5) * 0.22;
      const entry = markPrice * (1 + entryNoise);
      const weight = 0.3 + rng() * 1.7;
      const ageH = 1 + rng() * 240;
      rows.push({ weight, leverage, entry, ageH });
      weightSum += weight;
    }

    return rows.map((row, i) => {
      const notionalValue = (row.weight / weightSum) * targetOI;
      const size = row.entry > 0 ? notionalValue / row.entry : 0;
      // Liquidation sits ~ (1/leverage) beyond entry against the position.
      const liqFactor = (1 / row.leverage) * 0.97;
      const liquidationPrice =
        side === 'LONG' ? row.entry * (1 - liqFactor) : row.entry * (1 + liqFactor);
      const unrealizedPnl =
        side === 'LONG'
          ? (markPrice - row.entry) * size
          : (row.entry - markPrice) * size;
      const margin = notionalValue / row.leverage;
      return {
        walletAddress: `0x${hashString(`liqmap-${market}-${side}-${i}`).toString(16).padStart(8, '0')}${hashString(`w${i}-x`).toString(16).padStart(8, '0')}${hashString(`${market}-end`).toString(16).padStart(8, '0')}${hashString(`${side}-f`).toString(16).padStart(8, '0')}${hashString(`z${i}`).toString(16).padStart(8, '0')}`,
        market,
        side,
        size,
        notionalValue,
        entryPrice: row.entry,
        markPrice,
        unrealizedPnl,
        unrealizedPnlPercent: margin > 0 ? (unrealizedPnl / margin) * 100 : 0,
        leverage: row.leverage,
        liquidationPrice,
        distanceToLiq: markPrice > 0 ? ((liquidationPrice - markPrice) / markPrice) * 100 : 0,
        marginRatio: notionalValue > 0 ? (margin / notionalValue) * 100 : 0,
        openedAt: new Date(now - row.ageH * 3600_000).toISOString(),
        txHash: syntheticTx(`liqtx-${market}-${side}-${i}`),
      };
    });
  };

  return [...buildSide('LONG', longOI), ...buildSide('SHORT', shortOI)];
}
