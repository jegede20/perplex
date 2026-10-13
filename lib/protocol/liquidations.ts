import type { LiquidationEvent, Market, PositionRisk, TradeSide, WalletTier } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════════
// Liquidation data processing — feed stats, price-level clustering
// for the liquidation map, and deterministic demo feed generation.
// ═══════════════════════════════════════════════════════════════════

export interface LiquidationBucket {
  price: number;
  longSize: number;
  shortSize: number;
  count: number;
}

export interface LiquidationStats {
  count24h: number;
  volume24h: number;
  loss24h: number;
  biggest: LiquidationEvent | null;
}

function hoursSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 3_600_000;
}

/**
 * Aggregate liquidation events into 24h stats:
 * count, total volume (USD), total losses, and the biggest event.
 */
export function summarizeLiquidations(events: LiquidationEvent[]): LiquidationStats {
  const recent = events.filter((e) => hoursSince(e.timestamp) <= 24);
  const volume24h = recent.reduce((sum, e) => sum + e.size, 0);
  const loss24h = recent.reduce((sum, e) => sum + Math.abs(e.loss), 0);
  let biggest: LiquidationEvent | null = null;
  for (const e of recent) {
    if (!biggest || e.size > biggest.size) biggest = e;
  }
  return { count24h: recent.length, volume24h, loss24h, biggest };
}

/**
 * Cluster open positions by liquidation price for the Liquidation Map.
 * Returns sorted price buckets with long/short size totals.
 */
export function clusterLiquidationLevels(
  positions: PositionRisk[],
  bucketPercent = 1
): LiquidationBucket[] {
  const buckets = new Map<number, LiquidationBucket>();

  for (const position of positions) {
    if (position.liquidationPrice <= 0) continue;
    const bucketPrice =
      Math.round(position.liquidationPrice / (1 + bucketPercent / 100) / (1 + bucketPercent / 100)) *
      (1 + bucketPercent / 100) *
      (1 + bucketPercent / 100);
    const key = Math.round(position.liquidationPrice * 100) / 100;
    const existing = buckets.get(key) ?? {
      price: bucketPrice === 0 ? position.liquidationPrice : key,
      longSize: 0,
      shortSize: 0,
      count: 0,
    };
    if (position.side === 'LONG') existing.longSize += position.size;
    else existing.shortSize += position.size;
    existing.count += 1;
    buckets.set(key, existing);
  }

  return [...buckets.values()].sort((a, b) => a.price - b.price);
}

/** Total position size at risk within `percent` of the current mark price. */
export function sizeNearLiquidation(
  positions: PositionRisk[],
  markPrice: number,
  percent: number
): number {
  return positions
    .filter((p) => p.liquidationPrice > 0 && p.distanceToLiq <= percent)
    .reduce((sum, p) => sum + p.size, 0);
}

// ─── deterministic demo liquidation feed ───────────────────────────

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

const DEMO_LIQ_MARKETS: Market[] = ['BTC', 'ETH', 'SOL', 'MON', 'HYPE', 'ZEC'];

/**
 * Generate a deterministic liquidation feed (demo mode).
 * Stable per seed so every page render agrees on the same data.
 */
export function generateDemoLiquidations(count = 24, seed = 7331): LiquidationEvent[] {
  const rng = mulberry32(seed);
  const events: LiquidationEvent[] = [];

  for (let i = 0; i < count; i += 1) {
    const market = DEMO_LIQ_MARKETS[Math.floor(rng() * DEMO_LIQ_MARKETS.length)];
    const tierRoll = rng();
    const tier: WalletTier = tierRoll > 0.8 ? 'WHALE' : tierRoll > 0.45 ? 'SHARK' : 'FISH';
    const side: TradeSide = rng() > 0.5 ? 'LONG' : 'SHORT';
    const sizeBase = tier === 'WHALE' ? 500_000 : tier === 'SHARK' ? 120_000 : 25_000;
    const size = Math.round(sizeBase * (0.5 + rng() * 2.2));
    const priceBase =
      market === 'BTC' ? 98_000 : market === 'ETH' ? 3_400 : market === 'SOL' ? 185 : market === 'MON' ? 2.8 : market === 'HYPE' ? 42 : 285;
    const price = Number((priceBase * (0.96 + rng() * 0.08)).toFixed(priceBase > 100 ? 2 : 4));
    const loss = Math.round(size * (0.06 + rng() * 0.22));
    // First few events land in the last ~25 minutes so the liquidation
    // feed always has current entries; the rest spread over the last 22h.
    const ts =
      i < 3
        ? Date.now() - Math.floor(rng() * 22 * 60_000) - 25_000
        : Date.now() - Math.floor(rng() * 22 * 3_600_000) - 60_000;

    events.push({
      id: `liq_demo_${seed}_${i}`,
      walletAddress: `0x${Math.floor(rng() * 1e16).toString(16).padStart(16, '0')}${Math.floor(rng() * 1e16).toString(16).padStart(16, '0')}${Math.floor(rng() * 1e8).toString(16).padStart(8, '0')}`,
      shortAddress: '',
      tier,
      market,
      side,
      size,
      price,
      loss,
      txHash: `0x${Math.floor(rng() * 1e16).toString(16).padStart(16, '0')}${Math.floor(rng() * 1e16).toString(16).padStart(16, '0')}${Math.floor(rng() * 1e8).toString(16).padStart(8, '0')}`,
      timestamp: new Date(ts).toISOString(),
    });
  }

  return events
    .map((e) => ({
      ...e,
      shortAddress: `${e.walletAddress.slice(0, 6)}...${e.walletAddress.slice(-4)}`,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** Filter liquidation events to a single market. */
export function filterLiquidationsByMarket(
  events: LiquidationEvent[],
  market: Market | undefined
): LiquidationEvent[] {
  if (!market) return events;
  return events.filter((e) => e.market === market);
}
