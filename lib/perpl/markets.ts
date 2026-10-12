import type { Market, MarketConfig } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════════
// Perpl market registry — the 6 in-scope Perpl perp markets on Monad.
// IDs and fixed-point decimals match the live Perpl /v1/pub/context
// response exactly (verified against app.perpl.xyz on Monad mainnet):
//   BTC id=1 (pd 1 / sd 5) · MON id=10 (6/0) · ETH id=20 (2/3)
//   SOL id=31 (3/3) · HYPE id=40 (4/2) · ZEC id=50 (2/4)
// ═══════════════════════════════════════════════════════════════════

export const MARKETS: Record<Market, MarketConfig> = {
  BTC: { id: 1, symbol: 'BTC', name: 'Bitcoin', priceDecimals: 1, sizeDecimals: 5 },
  ETH: { id: 20, symbol: 'ETH', name: 'Ethereum', priceDecimals: 2, sizeDecimals: 3 },
  SOL: { id: 31, symbol: 'SOL', name: 'Solana', priceDecimals: 3, sizeDecimals: 3 },
  MON: { id: 10, symbol: 'MON', name: 'Monad', priceDecimals: 6, sizeDecimals: 0 },
  HYPE: { id: 40, symbol: 'HYPE', name: 'Hyperliquid', priceDecimals: 4, sizeDecimals: 2 },
  ZEC: { id: 50, symbol: 'ZEC', name: 'Zcash', priceDecimals: 2, sizeDecimals: 4 },
};

export const MARKET_SYMBOLS: Market[] = ['BTC', 'ETH', 'SOL', 'MON', 'HYPE', 'ZEC'];

/** Look up a market config by its Perpl market id. */
export function getMarketById(id: number): MarketConfig {
  const found = MARKET_SYMBOLS.find((s) => MARKETS[s].id === id);
  return found ? MARKETS[found] : MARKETS.BTC;
}

/** Look up a market config by symbol (case-insensitive). */
export function getMarketBySymbol(symbol: string): MarketConfig | null {
  const upper = symbol.toUpperCase() as Market;
  return MARKET_SYMBOLS.includes(upper) ? MARKETS[upper] : null;
}

/** All 6 Perpl market ids, in order. */
export function getAllMarketIds(): number[] {
  return MARKET_SYMBOLS.map((s) => MARKETS[s].id);
}

/** Type guard for market symbol strings coming from URLs / queries. */
export function isMarketSymbol(value: string): value is Market {
  return MARKET_SYMBOLS.includes(value.toUpperCase() as Market);
}

/** Display label, e.g. "BTC-PERP". */
export function marketLabel(symbol: Market): string {
  return `${symbol}-PERP`;
}
