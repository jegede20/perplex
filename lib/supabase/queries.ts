import type {
  BehaviorTag,
  FeedEvent,
  FeedEventType,
  LiquidationEvent,
  Market,
  Trade,
  TradeSide,
  TradeStatus,
  WalletFlow,
  WalletProfile,
  WalletSummary,
  WalletTier,
} from '@/lib/types';
import { getSupabaseServerClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════
// Typed Supabase query functions (server-side, service role).
// Every function returns null on failure / when Supabase is not
// configured — callers fall back to live-chain / deterministic sources.
// ═══════════════════════════════════════════════════════════════════

// ─── row shapes (snake_case as stored) ─────────────────────────────

interface WalletRow {
  address: string;
  tier: string;
  smart_money_score: number;
  win_rate: number;
  win_count: number;
  loss_count: number;
  total_trades: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_volume: number;
  avg_leverage: number;
  max_leverage: number;
  avg_hold_seconds: number;
  longest_win_streak: number;
  longest_loss_streak: number;
  max_drawdown: number;
  profit_factor: number;
  behavior_tags: string[] | null;
  primary_markets: string[] | null;
  collateral_balance: number;
  first_seen: string | null;
  last_active: string | null;
}

interface TradeRow {
  id: string;
  wallet_address: string;
  market: string;
  side: string;
  size: number;
  entry_price: number;
  exit_price: number | null;
  leverage: number;
  realized_pnl: number | null;
  pnl_percent: number | null;
  hold_seconds: number | null;
  tx_hash: string;
  block_number: number;
  timestamp: string;
  status: string;
}

interface FeedEventRow {
  id: string;
  event_type: string;
  wallet_address: string | null;
  market: string | null;
  side: string | null;
  size: number | null;
  price: number | null;
  leverage: number | null;
  realized_pnl: number | null;
  tx_hash: string | null;
  timestamp: string;
}

interface LiquidationRow {
  id: string;
  wallet_address: string | null;
  market: string | null;
  side: string | null;
  size: number | null;
  price: number | null;
  loss: number | null;
  tx_hash: string | null;
  timestamp: string;
}

interface WalletFlowRow {
  id: string;
  wallet_address: string;
  flow_type: string;
  amount: number;
  tx_hash: string;
  timestamp: string;
}

interface ProtocolSnapshotRow {
  volume_24h: number;
  open_interest: number;
  tvl: number;
  fees_24h: number;
  active_traders_24h: number;
  total_accounts: number;
  net_flow_24h: number;
  liquidation_count_24h: number;
  liquidation_vol_24h: number;
  insurance_fund: number;
  snapshot_at: string;
}

interface MarketSnapshotRow {
  market: string;
  mark_price: number;
  open_interest: number;
  oi_long: number;
  oi_short: number;
  funding_rate: number;
  volume_24h: number;
  liquidations_24h: number;
  whale_count: number;
  snapshot_at: string;
}

// ─── mapping helpers ───────────────────────────────────────────────

function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function asTier(value: string): WalletTier {
  return value === 'WHALE' || value === 'SHARK' ? (value as WalletTier) : 'FISH';
}

function asMarket(value: string): Market {
  return (['BTC', 'ETH', 'SOL', 'MON', 'HYPE', 'ZEC'].includes(value) ? value : 'BTC') as Market;
}

function asSide(value: string): TradeSide {
  return value === 'SHORT' ? 'SHORT' : 'LONG';
}

function asTradeStatus(value: string): TradeStatus {
  if (value === 'CLOSED') return 'CLOSED';
  if (value === 'LIQUIDATED') return 'LIQUIDATED';
  return 'OPEN';
}

function asFeedType(value: string): FeedEventType {
  if (value === 'CLOSE') return 'CLOSE';
  if (value === 'LIQUIDATION') return 'LIQUIDATION';
  if (value === 'FLIP') return 'FLIP';
  return 'OPEN';
}

function asTags(values: string[] | null): BehaviorTag[] {
  if (!values) return [];
  const valid: BehaviorTag[] = [
    'HIGH_LEVERAGE', 'SCALPER', 'SWING_TRADER', 'BTC_MAXI', 'CONTRARIAN',
    'CONSISTENT', 'HIGH_VOLUME', 'RISK_TAKER', 'LOSS_CUTTER', 'DIAMOND_HANDS',
  ];
  return values.filter((v): v is BehaviorTag => valid.includes(v as BehaviorTag));
}

function logQueryError(context: string, error: unknown): void {
  const pg = error as { message?: unknown; code?: unknown; details?: unknown } | null;
  if (error instanceof Error) {
    console.error(
      `[perplex/queries] ${context}: ${error.message}${pg?.code ? ` (code ${String(pg.code)})` : ''}${pg?.details ? ` — ${String(pg.details)}` : ''}`
    );
    return;
  }
  if (pg && typeof pg === 'object') {
    console.error(
      `[perplex/queries] ${context}: ${String(pg.message)} (code ${String(pg.code)})${pg.details ? ` — ${String(pg.details)}` : ''}`
    );
    return;
  }
  console.error(`[perplex/queries] ${context}: ${String(error)}`);
}

export function mapWalletRow(row: WalletRow): WalletProfile {
  return {
    address: row.address,
    shortAddress: shortAddress(row.address),
    tier: asTier(row.tier),
    smartMoneyScore: row.smart_money_score,
    winRate: row.win_rate,
    winCount: row.win_count,
    lossCount: row.loss_count,
    totalTrades: row.total_trades,
    realizedPnl: row.realized_pnl,
    unrealizedPnl: row.unrealized_pnl,
    totalVolume: row.total_volume,
    avgLeverage: row.avg_leverage,
    maxLeverage: row.max_leverage,
    avgHoldSeconds: row.avg_hold_seconds,
    longestWinStreak: row.longest_win_streak,
    longestLossStreak: row.longest_loss_streak,
    maxDrawdown: row.max_drawdown,
    profitFactor: row.profit_factor,
    behaviorTags: asTags(row.behavior_tags),
    primaryMarkets: (row.primary_markets ?? []).map(asMarket),
    collateralBalance: row.collateral_balance,
    firstSeen: row.first_seen ?? new Date().toISOString(),
    lastActive: row.last_active ?? new Date().toISOString(),
    openPositions: [],
  };
}

export function mapWalletSummary(row: WalletRow, openPositionsCount = 0): WalletSummary {
  return {
    address: row.address,
    shortAddress: shortAddress(row.address),
    tier: asTier(row.tier),
    smartMoneyScore: row.smart_money_score,
    winRate: row.win_rate,
    realizedPnl: row.realized_pnl,
    totalVolume: row.total_volume,
    avgLeverage: row.avg_leverage,
    lastActive: row.last_active ?? new Date().toISOString(),
    openPositionsCount,
  };
}

function mapTradeRow(row: TradeRow): Trade {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    market: asMarket(row.market),
    side: asSide(row.side),
    size: row.size,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price ?? undefined,
    leverage: row.leverage,
    realizedPnl: row.realized_pnl ?? undefined,
    pnlPercent: row.pnl_percent ?? undefined,
    holdSeconds: row.hold_seconds ?? undefined,
    txHash: row.tx_hash,
    blockNumber: row.block_number,
    timestamp: row.timestamp,
    status: asTradeStatus(row.status),
  };
}

function mapFeedRow(row: FeedEventRow, score: number, tier: WalletTier): FeedEvent {
  const address = row.wallet_address ?? '';
  return {
    id: row.id,
    type: asFeedType(row.event_type),
    walletAddress: address,
    shortAddress: shortAddress(address),
    tier,
    smartMoneyScore: score,
    market: asMarket(row.market ?? 'BTC'),
    side: asSide(row.side ?? 'LONG'),
    size: row.size ?? 0,
    price: row.price ?? 0,
    leverage: row.leverage ?? undefined,
    realizedPnl: row.realized_pnl ?? undefined,
    txHash: row.tx_hash ?? '',
    timestamp: row.timestamp,
  };
}

function mapLiquidationRow(row: LiquidationRow, tier: WalletTier): LiquidationEvent {
  const address = row.wallet_address ?? '';
  return {
    id: row.id,
    walletAddress: address,
    shortAddress: shortAddress(address),
    tier,
    market: asMarket(row.market ?? 'BTC'),
    side: asSide(row.side ?? 'LONG'),
    size: row.size ?? 0,
    price: row.price ?? 0,
    loss: row.loss ?? 0,
    txHash: row.tx_hash ?? '',
    timestamp: row.timestamp,
  };
}

function mapFlowRow(row: WalletFlowRow): WalletFlow {
  return {
    id: row.id,
    type: row.flow_type === 'WITHDRAWAL' ? 'WITHDRAWAL' : 'DEPOSIT',
    amount: row.amount,
    txHash: row.tx_hash,
    timestamp: row.timestamp,
  };
}

// ─── wallet queries ────────────────────────────────────────────────

export interface FetchWalletsOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'smart_money_score' | 'total_volume' | 'realized_pnl';
  tier?: WalletTier;
  minScore?: number;
}

/** Leaderboard page of wallet summaries ordered by score (or volume/PnL). */
export async function fetchWallets(
  options: FetchWalletsOptions = {}
): Promise<{ wallets: WalletSummary[]; total: number } | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'smart_money_score',
      tier,
      minScore,
    } = options;

    let query = supabase
      .from('wallets')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: false })
      .range(offset, offset + limit - 1);

    if (tier) query = query.eq('tier', tier);
    if (minScore !== undefined) query = query.gte('smart_money_score', minScore);

    const { data, error, count } = await query;
    if (error) {
      logQueryError('fetchWallets', error);
      return null;
    }
    const rows = (data ?? []) as WalletRow[];
    return {
      wallets: rows.map((row) => mapWalletSummary(row)),
      total: count ?? rows.length,
    };
  } catch (error) {
    logQueryError('fetchWallets', error);
    return null;
  }
}

/** Full wallet profile row by address. */
export async function fetchWalletProfile(address: string): Promise<WalletProfile | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('address', address.toLowerCase())
      .maybeSingle();
    if (error) {
      logQueryError('fetchWalletProfile', error);
      return null;
    }
    if (!data) return null;
    return mapWalletRow(data as WalletRow);
  } catch (error) {
    logQueryError('fetchWalletProfile', error);
    return null;
  }
}

/** Upsert a computed wallet profile (score refresh). */
export async function upsertWalletProfile(profile: WalletProfile): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('wallets').upsert({
      address: profile.address.toLowerCase(),
      tier: profile.tier,
      smart_money_score: profile.smartMoneyScore,
      win_rate: profile.winRate,
      win_count: profile.winCount,
      loss_count: profile.lossCount,
      total_trades: profile.totalTrades,
      realized_pnl: profile.realizedPnl,
      unrealized_pnl: profile.unrealizedPnl,
      total_volume: profile.totalVolume,
      avg_leverage: profile.avgLeverage,
      max_leverage: profile.maxLeverage,
      avg_hold_seconds: profile.avgHoldSeconds,
      longest_win_streak: profile.longestWinStreak,
      longest_loss_streak: profile.longestLossStreak,
      // max_drawdown is numeric(8,4) in the seeded schema (±9,999.9999 max).
      // Clamp at the write boundary: an oversized value used to reject the
      // whole wallet row and cascade into FK failures on trades/flows.
      max_drawdown: Math.min(Math.max(profile.maxDrawdown, -9999.9999), 9999.9999),
      profit_factor: profile.profitFactor,
      behavior_tags: profile.behaviorTags,
      primary_markets: profile.primaryMarkets,
      collateral_balance: profile.collateralBalance,
      first_seen: profile.firstSeen,
      last_active: profile.lastActive,
      last_updated: new Date().toISOString(),
    });
    if (error) {
      logQueryError('upsertWalletProfile', error);
      return false;
    }
    return true;
  } catch (error) {
    logQueryError('upsertWalletProfile', error);
    return false;
  }
}

// ─── trade queries ─────────────────────────────────────────────────

/** Trade history for one wallet, newest first. */
export async function fetchTrades(walletAddress: string, limit = 200): Promise<Trade[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) {
      logQueryError('fetchTrades', error);
      return null;
    }
    return ((data ?? []) as TradeRow[]).map(mapTradeRow);
  } catch (error) {
    logQueryError('fetchTrades', error);
    return null;
  }
}

/** Trades in one market, newest first (market drill-down). */
export async function fetchMarketTrades(market: Market, limit = 200): Promise<Trade[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('market', market)
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) {
      logQueryError('fetchMarketTrades', error);
      return null;
    }
    return ((data ?? []) as TradeRow[]).map(mapTradeRow);
  } catch (error) {
    logQueryError('fetchMarketTrades', error);
    return null;
  }
}

/** Insert a batch of trades (indexer path). */
export async function insertTrades(trades: Trade[]): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase || trades.length === 0) return false;
  try {
    const { error } = await supabase.from('trades').upsert(
      trades.map((t) => ({
        wallet_address: t.walletAddress.toLowerCase(),
        market: t.market,
        side: t.side,
        size: t.size,
        entry_price: t.entryPrice,
        exit_price: t.exitPrice ?? null,
        leverage: t.leverage,
        realized_pnl: t.realizedPnl ?? null,
        pnl_percent: t.pnlPercent ?? null,
        hold_seconds: t.holdSeconds ?? null,
        tx_hash: t.txHash,
        block_number: t.blockNumber,
        timestamp: t.timestamp,
        status: t.status,
      })),
      { onConflict: 'tx_hash' }
    );
    if (error) {
      logQueryError('insertTrades', error);
      return false;
    }
    return true;
  } catch (error) {
    logQueryError('insertTrades', error);
    return false;
  }
}

// ─── feed queries ──────────────────────────────────────────────────

export interface FetchFeedOptions {
  limit?: number;
  market?: Market;
  tier?: WalletTier;
  type?: FeedEventType;
  minSize?: number;
}

/** Feed events, newest first, with AND-combined filters. */
export async function fetchFeedEvents(options: FetchFeedOptions = {}): Promise<FeedEvent[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { limit = 50, market, tier, type, minSize } = options;
    let query = supabase
      .from('feed_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (market) query = query.eq('market', market);
    if (type) query = query.eq('event_type', type);
    if (minSize !== undefined) query = query.gte('size', minSize);

    const { data, error } = await query;
    if (error) {
      logQueryError('fetchFeedEvents', error);
      return null;
    }
    let rows = (data ?? []) as FeedEventRow[];
    if (tier) {
      rows = rows.filter((r) => {
        const size = r.size ?? 0;
        if (tier === 'WHALE') return size >= 500000;
        if (tier === 'SHARK') return size >= 100000 && size < 500000;
        return size < 100000;
      });
    }
    return rows.map((row) => mapFeedRow(row, 50, 'FISH'));
  } catch (error) {
    logQueryError('fetchFeedEvents', error);
    return null;
  }
}

/** Persist a batch of feed events (WebSocket indexer path). */
export async function insertFeedEvents(events: FeedEvent[]): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase || events.length === 0) return false;
  try {
    const { error } = await supabase.from('feed_events').insert(
      events.map((e) => ({
        event_type: e.type,
        wallet_address: e.walletAddress.toLowerCase(),
        market: e.market,
        side: e.side,
        size: e.size,
        price: e.price,
        leverage: e.leverage ?? null,
        realized_pnl: e.realizedPnl ?? null,
        tx_hash: e.txHash || null,
        timestamp: e.timestamp,
      }))
    );
    if (error) {
      logQueryError('insertFeedEvents', error);
      return false;
    }
    return true;
  } catch (error) {
    logQueryError('insertFeedEvents', error);
    return false;
  }
}

// ─── liquidation queries ───────────────────────────────────────────

/** Liquidations, newest first; optionally scoped to one market. */
export async function fetchLiquidations(
  limit = 50,
  market?: Market
): Promise<LiquidationEvent[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    let query = supabase
      .from('liquidations')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (market) query = query.eq('market', market);
    const { data, error } = await query;
    if (error) {
      logQueryError('fetchLiquidations', error);
      return null;
    }
    return ((data ?? []) as LiquidationRow[]).map((row) => mapLiquidationRow(row, 'FISH'));
  } catch (error) {
    logQueryError('fetchLiquidations', error);
    return null;
  }
}

/** Persist liquidation events (indexer path). */
export async function insertLiquidations(events: LiquidationEvent[]): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase || events.length === 0) return false;
  try {
    const { error } = await supabase.from('liquidations').upsert(
      events.map((e) => ({
        wallet_address: e.walletAddress.toLowerCase(),
        market: e.market,
        side: e.side,
        size: e.size,
        price: e.price,
        loss: e.loss,
        tx_hash: e.txHash,
        timestamp: e.timestamp,
      })),
      { onConflict: 'tx_hash' }
    );
    if (error) {
      logQueryError('insertLiquidations', error);
      return false;
    }
    return true;
  } catch (error) {
    logQueryError('insertLiquidations', error);
    return false;
  }
}

// ─── flow queries ──────────────────────────────────────────────────

/** Deposit/withdrawal history for one wallet. */
export async function fetchWalletFlows(walletAddress: string): Promise<WalletFlow[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('wallet_flows')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('timestamp', { ascending: false })
      .limit(100);
    if (error) {
      logQueryError('fetchWalletFlows', error);
      return null;
    }
    return ((data ?? []) as WalletFlowRow[]).map(mapFlowRow);
  } catch (error) {
    logQueryError('fetchWalletFlows', error);
    return null;
  }
}

/** Insert deposit/withdrawal events (indexer path). */
export async function insertWalletFlows(
  walletAddress: string,
  flows: WalletFlow[]
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase || flows.length === 0) return false;
  try {
    const { error } = await supabase.from('wallet_flows').upsert(
      flows.map((f) => ({
        wallet_address: walletAddress.toLowerCase(),
        flow_type: f.type,
        amount: f.amount,
        tx_hash: f.txHash,
        timestamp: f.timestamp,
      })),
      { onConflict: 'tx_hash' }
    );
    if (error) {
      logQueryError('insertWalletFlows', error);
      return false;
    }
    return true;
  } catch (error) {
    logQueryError('insertWalletFlows', error);
    return false;
  }
}

// ─── snapshot queries ──────────────────────────────────────────────

/** Protocol snapshots within a window (newest first). */
export async function fetchProtocolSnapshots(
  sinceIso: string
): Promise<ProtocolSnapshotRow[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('protocol_snapshots')
      .select('*')
      .gte('snapshot_at', sinceIso)
      .order('snapshot_at', { ascending: false })
      .limit(500);
    if (error) {
      logQueryError('fetchProtocolSnapshots', error);
      return null;
    }
    return (data ?? []) as ProtocolSnapshotRow[];
  } catch (error) {
    logQueryError('fetchProtocolSnapshots', error);
    return null;
  }
}

/** Market snapshots for one market within a window (newest first). */
export async function fetchMarketSnapshots(
  market: Market,
  sinceIso: string
): Promise<MarketSnapshotRow[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('market_snapshots')
      .select('*')
      .eq('market', market)
      .gte('snapshot_at', sinceIso)
      .order('snapshot_at', { ascending: false })
      .limit(500);
    if (error) {
      logQueryError('fetchMarketSnapshots', error);
      return null;
    }
    return (data ?? []) as MarketSnapshotRow[];
  } catch (error) {
    logQueryError('fetchMarketSnapshots', error);
    return null;
  }
}

/** Record one protocol snapshot (indexer path). */
export async function insertProtocolSnapshot(row: Omit<ProtocolSnapshotRow, 'id' | 'snapshot_at'>): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('protocol_snapshots')
      .insert({ ...row, snapshot_at: new Date().toISOString() });
    if (error) {
      logQueryError('insertProtocolSnapshot', error);
      return false;
    }
    return true;
  } catch (error) {
    logQueryError('insertProtocolSnapshot', error);
    return false;
  }
}

/** Record one market snapshot (indexer path). */
export async function insertMarketSnapshot(row: Omit<MarketSnapshotRow, 'id' | 'snapshot_at'>): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('market_snapshots')
      .insert({ ...row, snapshot_at: new Date().toISOString() });
    if (error) {
      logQueryError('insertMarketSnapshot', error);
      return false;
    }
    return true;
  } catch (error) {
    logQueryError('insertMarketSnapshot', error);
    return false;
  }
}

export type { ProtocolSnapshotRow, MarketSnapshotRow, WalletRow, TradeRow, FeedEventRow, LiquidationRow, WalletFlowRow };
