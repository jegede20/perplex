import type {
  FundingPoint,
  LiquidationEvent,
  Market,
  MarketSummary,
  OrderBook,
  TimeRange,
  Trade,
} from '@/lib/types';
import { MARKETS, MARKET_SYMBOLS, isMarketSymbol } from '@/lib/perpl/markets';
import { PERPL_API_TIMEOUT } from '@/lib/utils/constants';

// ═══════════════════════════════════════════════════════════════════
// Perpl REST API client — https://app.perpl.xyz/api
// Every call: 10s timeout, typed response, null on failure, never throws.
//
// Response shapes verified live against Monad mainnet:
//   GET /v1/pub/context        → chain + instances + tokens + markets[]
//   GET /v1/market-data/{id}/book → { sn, bid:[{p,s,o}], ask:[{p,s,o}] }
// Fixed-point scaling uses each market's own price_decimals/size_decimals.
// ═══════════════════════════════════════════════════════════════════

const BASE_URL = process.env.NEXT_PUBLIC_PERPL_API_URL ?? 'https://app.perpl.xyz/api';

function logApiError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message.split('\n')[0].slice(0, 120) : String(error);
  console.warn(`[perplex/api] ${context}: ${message} — using fallback`);
}

/**
 * Fetch JSON from the Perpl REST API with a 10s timeout.
 * Returns null on any failure (network, timeout, non-2xx, bad JSON).
 */
async function perplFetch<T>(path: string, context: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PERPL_API_TIMEOUT);
    const response = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);
    if (!response.ok) {
      logApiError(`${context}: HTTP ${response.status}`, response.statusText);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    logApiError(context, error);
    return null;
  }
}

// ─── raw /v1/pub/context shapes ────────────────────────────────────

interface RawAt {
  b?: number;
  t?: number;
}

interface RawContextMarket {
  ver?: number;
  id: number;
  name: string;
  size_units?: string;
  funding_interval_sec?: number;
  config?: {
    at?: RawAt;
    is_open?: boolean;
    price_decimals?: number;
    size_decimals?: number;
    maker_fee?: number;
    taker_fee?: number;
  };
  state?: {
    at?: RawAt;
    orl?: number;
    mrk?: number;
    lst?: number;
    mid?: number;
    bid?: number;
    ask?: number;
    prv?: number;
    dv?: number;
    dva?: string;
    oi?: number;
    tvl?: string;
  };
  funding?: {
    at?: RawAt;
    rate?: number;
    idx?: number;
    sum?: number;
    div?: number;
  };
}

interface RawContext {
  chain?: { chain_id?: number; name?: string };
  instances?: Array<{ address?: string }>;
  markets?: RawContextMarket[];
}

interface RawBookLevel {
  p: number;
  s: number;
  o?: number;
}

interface RawBook {
  mt?: number;
  sn?: number;
  at?: RawAt;
  bid?: RawBookLevel[];
  ask?: RawBookLevel[];
}

// ─── context → MarketSummary mapping ───────────────────────────────

function toNumber(value: string | number | undefined, fallback = 0): number {
  if (value === undefined) return fallback;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : fallback;
}

/** Map one live /v1/pub/context market entry to a MarketSummary. */
function mapContextMarket(raw: RawContextMarket): MarketSummary | null {
  const name = (raw.name ?? '').toUpperCase();
  if (!isMarketSymbol(name)) return null;

  const symbol = name as Market;
  const registry = MARKETS[symbol];
  const priceDecimals = raw.config?.price_decimals ?? registry.priceDecimals ?? 1;
  const sizeDecimals = raw.config?.size_decimals ?? registry.sizeDecimals ?? 0;
  const state = raw.state ?? {};
  const fundingRaw = raw.funding ?? {};
  const intervalSec = raw.funding_interval_sec ?? 2580;

  const scalePrice = (v: string | number | undefined): number => toNumber(v) / 10 ** priceDecimals;
  const markPrice = scalePrice(state.mrk);
  const spotPrice = scalePrice(state.orl ?? state.mid ?? state.mrk);
  const prevPrice = scalePrice(state.prv ?? state.mrk);

  const sizeToUsd = (v: string | number | undefined): number =>
    (toNumber(v) / 10 ** sizeDecimals) * markPrice;

  const openInterest = sizeToUsd(state.oi);
  const volume24h = toNumber(state.dva) / 1e6; // AUSD 6-decimals
  const tvl = toNumber(state.tvl) / 1e6;

  const change = markPrice - prevPrice;
  const changePct = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

  // funding.rate is expressed in millionths (1e-6) per funding interval.
  const fundingRate = toNumber(fundingRaw.rate) / 1e6;
  const intervalsPerYear = (86_400 / Math.max(intervalSec, 1)) * 365;
  const fundingAPR = fundingRate * intervalsPerYear * 100;

  return {
    id: raw.id,
    symbol,
    markPrice,
    spotPrice,
    priceChange24h: change,
    priceChangePercent24h: Number(changePct.toFixed(2)),
    openInterest,
    openInterestLong: 0, // split not exposed by REST — filled by chain reads / skew model
    openInterestShort: 0,
    longPercent: 50,
    shortPercent: 50,
    fundingRate,
    fundingAPR: Number(fundingAPR.toFixed(2)),
    volume24h,
    trades24h: 0,
    liquidations24h: 0,
    dominantSide: 'NEUTRAL',
    whaleCount: 0,
    topPosition: 0,
    tvl,
  };
}

// ─── public API ────────────────────────────────────────────────────

/**
 * GET /v1/pub/context
 * Returns all Perpl markets config + current live state (price, OI,
 * volume, TVL, funding). Filtered to the 6 in-scope markets.
 */
export async function getMarkets(): Promise<MarketSummary[] | null> {
  const raw = await perplFetch<RawContext>('/v1/pub/context', 'getMarkets');
  if (!raw || !Array.isArray(raw.markets)) return null;
  const mapped = raw.markets
    .map(mapContextMarket)
    .filter((m): m is MarketSummary => m !== null);
  return mapped.length > 0 ? mapped : null;
}

/**
 * GET /v1/market-data/{marketId}/book
 * Returns the live L2 order book (bids/asks) for one market.
 * Levels: { p (price_decimals), s (size_decimals), o (open orders) }.
 */
export async function getOrderBook(marketId: number): Promise<OrderBook | null> {
  const raw = await perplFetch<RawBook>(`/v1/market-data/${marketId}/book`, `getOrderBook(${marketId})`);
  if (!raw || (!Array.isArray(raw.bid) && !Array.isArray(raw.ask))) return null;

  const registry = MARKET_SYMBOLS.map((s) => MARKETS[s]).find((m) => m.id === marketId);
  const priceDecimals = registry?.priceDecimals ?? 1;
  const sizeDecimals = registry?.sizeDecimals ?? 0;

  const scale = (levels: RawBookLevel[] | undefined): [number, number][] =>
    (levels ?? []).slice(0, 25).map((level) => [
      level.p / 10 ** priceDecimals,
      level.s / 10 ** sizeDecimals,
    ]);

  const bids = scale(raw.bid);
  const asks = scale(raw.ask);
  const bestBid = bids[0]?.[0] ?? 0;
  const bestAsk = asks[0]?.[0] ?? 0;

  return {
    bids,
    asks,
    spread: Number(Math.abs(bestAsk - bestBid).toFixed(priceDecimals)),
    midPrice: bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : bestBid || bestAsk,
    timestamp: new Date().toISOString(),
  };
}

/**
 * GET /v1/pub/trades?market={id}&limit={limit}
 * Returns recent trade fills for one market (default 50).
 */
export async function getRecentTrades(marketId: number, limit = 50): Promise<Trade[] | null> {
  return perplFetch<Trade[]>(
    `/v1/pub/trades?market=${marketId}&limit=${limit}`,
    `getRecentTrades(${marketId})`
  );
}

/**
 * GET /v1/pub/funding?market={id}
 * Returns current + historical funding rate for one market.
 */
export async function getFundingRate(marketId: number): Promise<FundingPoint[] | null> {
  return perplFetch<FundingPoint[]>(
    `/v1/pub/funding?market=${marketId}`,
    `getFundingRate(${marketId})`
  );
}

/**
 * GET /v1/pub/oi?market={id}
 * Returns open interest broken down by long/short.
 */
export async function getOpenInterest(
  marketId: number
): Promise<{ long: number; short: number; total: number } | null> {
  return perplFetch<{ long: number; short: number; total: number }>(
    `/v1/pub/oi?market=${marketId}`,
    `getOpenInterest(${marketId})`
  );
}

/**
 * GET /v1/pub/stats?market={id}&range={range}
 * Returns volume, trades, fees for the given time range.
 */
export async function getMarketStats(
  marketId: number,
  range: TimeRange
): Promise<{ volume: number; trades: number; fees: number } | null> {
  return perplFetch<{ volume: number; trades: number; fees: number }>(
    `/v1/pub/stats?market=${marketId}&range=${range}`,
    `getMarketStats(${marketId}, ${range})`
  );
}

/**
 * GET /v1/pub/liquidations?limit={limit}
 * Returns recent protocol-wide liquidation events.
 */
export async function getProtocolLiquidations(
  limit = 50
): Promise<LiquidationEvent[] | null> {
  return perplFetch<LiquidationEvent[]>(
    `/v1/pub/liquidations?limit=${limit}`,
    'getProtocolLiquidations'
  );
}

/** Exported for the aggregator: raw context TVL/instance address when needed. */
export async function getPerplContext(): Promise<RawContext | null> {
  return perplFetch<RawContext>('/v1/pub/context', 'getPerplContext');
}

export type { RawContext, RawContextMarket, RawBook, RawBookLevel };
