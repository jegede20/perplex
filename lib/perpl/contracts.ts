import { createPublicClient, defineChain, http } from 'viem';
import { PERPL_EXCHANGE_ABI } from '@/lib/perpl/abi';
import { getAllMarketIds, getMarketById } from '@/lib/perpl/markets';
import type {
  AccountInfo,
  LiquidationConfig,
  MarginHealth,
  Market,
  OpenPosition,
  TradeSide,
} from '@/lib/types';
import { BLOCK_POLL_INTERVAL } from '@/lib/utils/constants';
import { MONAD_CHAIN_ID, MONAD_RPC_URL } from '@/lib/utils/monad';

// ═══════════════════════════════════════════════════════════════════
// Monad contract reads (viem) — every call is best-effort:
// wrapped in try/catch, returns null on failure, never throws.
// ═══════════════════════════════════════════════════════════════════

export const monad = defineChain({
  id: MONAD_CHAIN_ID,
  name: 'Monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [MONAD_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'MonadExplorer', url: 'https://monadexplorer.com' },
  },
});

export const publicClient = createPublicClient({
  chain: monad,
  transport: http(MONAD_RPC_URL, { timeout: 10_000, retryCount: 2 }),
  batch: { multicall: true },
});

export const PERPL_EXCHANGE_ADDRESS =
  (process.env.NEXT_PUBLIC_PERPL_EXCHANGE_ADDRESS ??
    '0x34B6552d57a35a1D042CcAe1951BD1C370112a6F') as `0x${string}`;

/** Raw position struct decoded from getPositionsV2 / getPosition. */
export interface OnChainPosition {
  owner: string;
  marketId: number;
  isLong: boolean;
  size: number;
  entryPrice: number;
  margin: number;
  liquidationPrice: number;
  lastCumulativeFunding: number;
}

/** Decoded perpetual info from getPerpetualInfoV2. */
export interface OnChainPerpInfo {
  markPrice: number;
  spotPrice: number;
  openInterestLong: number;
  openInterestShort: number;
  fundingRate: number;
  fundingTimestamp: number;
  maxLeverage: number;
  maintenanceMarginFraction: number;
}

// ─── decoding helpers (defensive) ──────────────────────────────────

type Rawish = unknown;
type RawIndexable = Record<string | number, unknown>;

function asIndexable(value: Rawish): RawIndexable {
  return (value ?? {}) as RawIndexable;
}

function isRecord(value: Rawish): boolean {
  return typeof value === 'object' && value !== null;
}

/** Convert uint256/int256 bigint-ish values to a JS number, scaling 1e18 → 1. */
function toNum(value: Rawish, decimals = 18): number {
  try {
    if (typeof value === 'bigint') return Number(value) / 10 ** decimals;
    if (typeof value === 'number') return value / 10 ** decimals;
    if (typeof value === 'string') {
      const asBig = BigInt(value);
      return Number(asBig) / 10 ** decimals;
    }
    return 0;
  } catch {
    return 0;
  }
}

function toBool(value: Rawish): boolean {
  return value === true || value === 1n || value === 1 || value === '1';
}

function toAddress(value: Rawish): string {
  return typeof value === 'string' && value.startsWith('0x') ? value : '';
}

function decodePosition(raw: Rawish): OnChainPosition | null {
  if (!isRecord(raw)) return null;
  const rec = asIndexable(raw);
  const owner = toAddress(rec[0] ?? rec.owner);
  const size = toNum(rec[3] ?? rec.size);
  const entryPrice = toNum(rec[4] ?? rec.entryPrice);
  // Plausibility bands reject mis-shaped decodes (raw byte-offset garbage).
  if (!owner || !Number.isFinite(size) || size < 0 || size > 1e15) return null;
  if (entryPrice < 0 || entryPrice > 1e9) return null;
  return {
    owner,
    marketId: Number(rec[1] ?? rec.marketId ?? 0),
    isLong: toBool(rec[2] ?? rec.isLong),
    size,
    entryPrice: Number.isFinite(entryPrice) && entryPrice > 0 ? entryPrice : 0,
    margin: toNum(rec[5] ?? rec.margin),
    liquidationPrice: toNum(rec[6] ?? rec.liquidationPrice),
    lastCumulativeFunding: toNum(rec[7] ?? rec.lastCumulativeFunding),
  };
}

function decodePerpInfo(raw: Rawish): OnChainPerpInfo | null {
  if (!isRecord(raw)) return null;
  const rec = asIndexable(raw);
  const markPrice = toNum(rec[0] ?? rec.markPrice);
  const spotPrice = toNum(rec[1] ?? rec.spotPrice);
  const fundingRate = toNum(rec[4] ?? rec.fundingRate, 18);
  // Plausibility bands: prices must look like prices, funding like funding.
  if (!Number.isFinite(markPrice) || markPrice < 1e-6 || markPrice > 1e9) return null;
  if (!Number.isFinite(fundingRate) || Math.abs(fundingRate) > 0.01) return null;
  return {
    markPrice,
    spotPrice: Number.isFinite(spotPrice) && spotPrice > 1e-6 ? spotPrice : markPrice,
    openInterestLong: toNum(rec[2] ?? rec.openInterestLong),
    openInterestShort: toNum(rec[3] ?? rec.openInterestShort),
    fundingRate,
    fundingTimestamp: Number(rec[5] ?? rec.fundingTimestamp ?? 0),
    maxLeverage: toNum(rec[6] ?? rec.maxLeverage, 0) || toNum(rec[6] ?? rec.maxLeverage),
    maintenanceMarginFraction: toNum(rec[7] ?? rec.maintenanceMarginFraction),
  };
}

function logReadError(context: string, error: unknown): void {
  // One concise line — full viem dumps flood production logs during
  // expected fallback situations (reverts on non-matching view surfaces).
  const short =
    typeof error === 'object' && error !== null && 'shortMessage' in error
      ? String((error as { shortMessage?: unknown }).shortMessage ?? '')
      : '';
  const message = (short || (error instanceof Error ? error.message : String(error)))
    .split('\n')[0]
    .slice(0, 120);
  console.warn(`[perplex/contracts] ${context}: ${message} — using fallback`);
}

// ─── block helpers ─────────────────────────────────────────────────

/**
 * Current Monad block number. Returns 0n on RPC failure (UI shows "—").
 */
export async function getCurrentBlockNumber(): Promise<bigint> {
  try {
    return await publicClient.getBlockNumber();
  } catch (error) {
    logReadError('getCurrentBlockNumber', error);
    return 0n;
  }
}

/**
 * Subscribe to new Monad blocks. Returns a cleanup function.
 * Polls at BLOCK_POLL_INTERVAL (500ms) to match Monad block time.
 */
export function watchNewBlocks(callback: (block: bigint) => void): () => void {
  let active = true;
  let stop: (() => void) | null = null;

  const attach = async (): Promise<void> => {
    try {
      stop = publicClient.watchBlockNumber({
        emitOnBegin: true,
        pollingInterval: BLOCK_POLL_INTERVAL,
        onBlockNumber: (blockNumber: bigint) => {
          if (active) callback(blockNumber);
        },
        onError: (error: Error) => {
          logReadError('watchNewBlocks', error);
        },
      });
    } catch (error) {
      logReadError('watchNewBlocks:attach', error);
    }
  };

  void attach();

  return () => {
    active = false;
    if (stop) stop();
  };
}

// ─── market reads ──────────────────────────────────────────────────

/**
 * All open positions in a market via getPositionsV2(marketId).
 * Used for: protocol OI, L/S skew, market drill-down.
 */
export async function getAllPositionsInMarket(
  marketId: number
): Promise<OnChainPosition[] | null> {
  try {
    const raw = await publicClient.readContract({
      address: PERPL_EXCHANGE_ADDRESS,
      abi: PERPL_EXCHANGE_ABI,
      functionName: 'getPositionsV2',
      // Verified live signature: paginated (marketId, start, end).
      args: [BigInt(marketId), 0n, 250n],
    });
    if (!Array.isArray(raw)) return null;
    const decoded = (raw as unknown[])
      .map((item: unknown) => decodePosition(item))
      .filter((p): p is OnChainPosition => p !== null);
    return decoded;
  } catch (error) {
    logReadError(`getPositionsV2(marketId=${marketId})`, error);
    return null;
  }
}

/**
 * Perpetual info via getPerpetualInfoV2(marketId):
 * OI, funding rate, mark price, spot price, market config.
 */
export async function getMarketInfo(marketId: number): Promise<OnChainPerpInfo | null> {
  try {
    const raw = await publicClient.readContract({
      address: PERPL_EXCHANGE_ADDRESS,
      abi: PERPL_EXCHANGE_ABI,
      functionName: 'getPerpetualInfoV2',
      args: [BigInt(marketId)],
    });
    return decodePerpInfo(raw);
  } catch (error) {
    logReadError(`getPerpetualInfoV2(marketId=${marketId})`, error);
    return null;
  }
}

// ─── liquidation / insurance ───────────────────────────────────────

/**
 * Liquidation config via getLiquidationInfo():
 * insurance fund balance + liquidation split config.
 */
export async function getLiquidationConfig(): Promise<LiquidationConfig | null> {
  try {
    const raw = await publicClient.readContract({
      address: PERPL_EXCHANGE_ADDRESS,
      abi: PERPL_EXCHANGE_ABI,
      functionName: 'getLiquidationInfo',
    });
    if (!isRecord(raw)) return null;
    const rec = asIndexable(raw);
    return {
      insuranceFundBalance: toNum(rec[0] ?? rec.insuranceFundBalance),
      liquidationSplit: {
        liquidatorShareBps: toNum(rec[1] ?? rec.liquidatorShareBps, 0),
        insuranceShareBps: toNum(rec[2] ?? rec.insuranceShareBps, 0),
        backstopShareBps: toNum(rec[3] ?? rec.backstopShareBps, 0),
      },
    };
  } catch (error) {
    logReadError('getLiquidationInfo', error);
    return null;
  }
}

// ─── wallet reads ──────────────────────────────────────────────────

/**
 * Margin health via getMarginFractions(address):
 * margin ratio + maintenance margin for liquidation-risk math.
 */
export async function getWalletMarginHealth(address: string): Promise<MarginHealth | null> {
  try {
    const raw = await publicClient.readContract({
      address: PERPL_EXCHANGE_ADDRESS,
      abi: PERPL_EXCHANGE_ABI,
      functionName: 'getMarginFractions',
      args: [address as `0x${string}`],
    });
    if (!isRecord(raw)) return null;
    const rec = asIndexable(raw);
    return {
      marginRatio: toNum(rec[0] ?? rec.marginRatio),
      maintenanceMargin: toNum(rec[1] ?? rec.maintenanceMarginFraction),
      initialMargin: toNum(rec[2] ?? rec.initialMarginFraction),
      collateralValue: toNum(rec[3] ?? rec.collateralValue),
      accountValue: toNum(rec[4] ?? rec.accountValue),
    };
  } catch (error) {
    logReadError(`getMarginFractions(${address})`, error);
    return null;
  }
}

/**
 * Account details via getAccountByAddr(address):
 * collateral balance + account value.
 */
export async function getWalletAccount(address: string): Promise<AccountInfo | null> {
  try {
    const raw = await publicClient.readContract({
      address: PERPL_EXCHANGE_ADDRESS,
      abi: PERPL_EXCHANGE_ABI,
      functionName: 'getAccountByAddr',
      args: [address as `0x${string}`],
    });
    if (!isRecord(raw)) return null;
    const rec = asIndexable(raw);
    return {
      address,
      collateralBalance: toNum(rec[0] ?? rec.collateralBalance),
      accountValue: toNum(rec[1] ?? rec.accountValue),
      totalPositionValue: toNum(rec[2] ?? rec.totalPositionValue),
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logReadError(`getAccountByAddr(${address})`, error);
    return null;
  }
}

/**
 * Single wallet position via getPosition(address, marketId),
 * enriched with live mark price → uPnL + liquidation distance.
 */
export async function getWalletPosition(
  address: string,
  marketId: number
): Promise<OpenPosition | null> {
  try {
    const raw = await publicClient.readContract({
      address: PERPL_EXCHANGE_ADDRESS,
      abi: PERPL_EXCHANGE_ABI,
      functionName: 'getPosition',
      args: [address as `0x${string}`, BigInt(marketId)],
    });
    const position = decodePosition(raw);
    if (!position || position.size <= 0) return null;

    const market = getMarketById(marketId);
    const info = await getMarketInfo(marketId);
    const markPrice = info?.markPrice && info.markPrice > 0 ? info.markPrice : position.entryPrice;
    const side: TradeSide = position.isLong ? 'LONG' : 'SHORT';
    const notionalValue = position.size * markPrice;
    const unrealizedPnl =
      side === 'LONG'
        ? (markPrice - position.entryPrice) * position.size
        : (position.entryPrice - markPrice) * position.size;
    const entryNotional = position.size * position.entryPrice;
    const unrealizedPnlPercent = entryNotional > 0 ? (unrealizedPnl / entryNotional) * 100 : 0;
    const leverage = position.margin > 0 ? entryNotional / position.margin : 1;
    const liquidationPrice = position.liquidationPrice;
    const distanceToLiq =
      liquidationPrice > 0 && markPrice > 0
        ? Math.abs((markPrice - liquidationPrice) / markPrice) * 100
        : 0;
    const marginRatio = notionalValue > 0 ? position.margin / notionalValue : 0;

    return {
      walletAddress: address,
      market: market.symbol as Market,
      side,
      size: position.size,
      notionalValue,
      entryPrice: position.entryPrice,
      markPrice,
      unrealizedPnl,
      unrealizedPnlPercent,
      leverage,
      liquidationPrice,
      distanceToLiq,
      marginRatio,
      openedAt: new Date().toISOString(),
      txHash: '',
    };
  } catch (error) {
    logReadError(`getPosition(${address}, ${marketId})`, error);
    return null;
  }
}

/**
 * Loop all 6 market IDs via getPosition(address, marketId).
 * Skips null/empty positions. Returns [] when none (or all reads fail).
 */
export async function getAllWalletPositions(address: string): Promise<OpenPosition[]> {
  const results = await Promise.all(
    getAllMarketIds().map((id) => getWalletPosition(address, id))
  );
  return results.filter((p): p is OpenPosition => p !== null && p.size > 0);
}
