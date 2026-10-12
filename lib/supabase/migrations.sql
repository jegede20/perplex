-- ═══════════════════════════════════════════════════════════════════
-- Perplex — Supabase (PostgreSQL) schema
-- Run this in the Supabase SQL editor to provision all tables + indexes.
-- ═══════════════════════════════════════════════════════════════════

-- WALLETS TABLE
CREATE TABLE wallets (
  address               TEXT PRIMARY KEY,
  tier                  TEXT NOT NULL DEFAULT 'FISH',
  smart_money_score     INTEGER NOT NULL DEFAULT 0,
  win_rate              DECIMAL(5,2) DEFAULT 0,
  win_count             INTEGER DEFAULT 0,
  loss_count            INTEGER DEFAULT 0,
  total_trades          INTEGER DEFAULT 0,
  realized_pnl          DECIMAL(20,2) DEFAULT 0,
  unrealized_pnl        DECIMAL(20,2) DEFAULT 0,
  total_volume          DECIMAL(20,2) DEFAULT 0,
  avg_leverage          DECIMAL(8,2) DEFAULT 0,
  max_leverage          DECIMAL(8,2) DEFAULT 0,
  avg_hold_seconds      INTEGER DEFAULT 0,
  longest_win_streak    INTEGER DEFAULT 0,
  longest_loss_streak   INTEGER DEFAULT 0,
  max_drawdown          DECIMAL(8,4) DEFAULT 0,
  profit_factor         DECIMAL(10,4) DEFAULT 0,
  behavior_tags         TEXT[] DEFAULT '{}',
  primary_markets       TEXT[] DEFAULT '{}',
  collateral_balance    DECIMAL(20,2) DEFAULT 0,
  first_seen            TIMESTAMPTZ,
  last_active           TIMESTAMPTZ,
  last_updated          TIMESTAMPTZ DEFAULT NOW()
);

-- TRADES TABLE
CREATE TABLE trades (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address        TEXT REFERENCES wallets(address),
  market                TEXT NOT NULL,
  side                  TEXT NOT NULL,
  size                  DECIMAL(20,2),
  entry_price           DECIMAL(20,8),
  exit_price            DECIMAL(20,8),
  leverage              DECIMAL(8,2),
  realized_pnl          DECIMAL(20,2),
  pnl_percent           DECIMAL(10,4),
  hold_seconds          INTEGER,
  tx_hash               TEXT UNIQUE,
  block_number          BIGINT,
  timestamp             TIMESTAMPTZ,
  status                TEXT DEFAULT 'OPEN'
);

-- FEED EVENTS TABLE
CREATE TABLE feed_events (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type            TEXT NOT NULL,
  wallet_address        TEXT,
  market                TEXT,
  side                  TEXT,
  size                  DECIMAL(20,2),
  price                 DECIMAL(20,8),
  leverage              DECIMAL(8,2),
  realized_pnl          DECIMAL(20,2),
  tx_hash               TEXT,
  timestamp             TIMESTAMPTZ DEFAULT NOW()
);

-- PROTOCOL SNAPSHOTS TABLE
CREATE TABLE protocol_snapshots (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  volume_24h            DECIMAL(20,2) DEFAULT 0,
  open_interest         DECIMAL(20,2) DEFAULT 0,
  tvl                   DECIMAL(20,2) DEFAULT 0,
  fees_24h              DECIMAL(20,2) DEFAULT 0,
  active_traders_24h    INTEGER DEFAULT 0,
  total_accounts        INTEGER DEFAULT 0,
  net_flow_24h          DECIMAL(20,2) DEFAULT 0,
  liquidation_count_24h INTEGER DEFAULT 0,
  liquidation_vol_24h   DECIMAL(20,2) DEFAULT 0,
  insurance_fund        DECIMAL(20,2) DEFAULT 0,
  snapshot_at           TIMESTAMPTZ DEFAULT NOW()
);

-- MARKET SNAPSHOTS TABLE
CREATE TABLE market_snapshots (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  market                TEXT NOT NULL,
  mark_price            DECIMAL(20,8),
  open_interest         DECIMAL(20,2),
  oi_long               DECIMAL(20,2),
  oi_short              DECIMAL(20,2),
  funding_rate          DECIMAL(20,10),
  volume_24h            DECIMAL(20,2),
  liquidations_24h      INTEGER DEFAULT 0,
  whale_count           INTEGER DEFAULT 0,
  snapshot_at           TIMESTAMPTZ DEFAULT NOW()
);

-- WALLET FLOWS TABLE
CREATE TABLE wallet_flows (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address        TEXT REFERENCES wallets(address),
  flow_type             TEXT NOT NULL,
  amount                DECIMAL(20,2),
  tx_hash               TEXT UNIQUE,
  timestamp             TIMESTAMPTZ
);

-- LIQUIDATIONS TABLE
CREATE TABLE liquidations (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address        TEXT,
  market                TEXT,
  side                  TEXT,
  size                  DECIMAL(20,2),
  price                 DECIMAL(20,8),
  loss                  DECIMAL(20,2),
  tx_hash               TEXT UNIQUE,
  timestamp             TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_wallets_score ON wallets(smart_money_score DESC);
CREATE INDEX idx_wallets_volume ON wallets(total_volume DESC);
CREATE INDEX idx_wallets_pnl ON wallets(realized_pnl DESC);
CREATE INDEX idx_trades_wallet ON trades(wallet_address, timestamp DESC);
CREATE INDEX idx_trades_market ON trades(market, timestamp DESC);
CREATE INDEX idx_feed_events_time ON feed_events(timestamp DESC);
CREATE INDEX idx_feed_events_market ON feed_events(market, timestamp DESC);
CREATE INDEX idx_liquidations_time ON liquidations(timestamp DESC);
CREATE INDEX idx_market_snaps ON market_snapshots(market, snapshot_at DESC);
CREATE INDEX idx_wallet_flows ON wallet_flows(wallet_address, timestamp DESC);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (additive hardening)
-- Public/anon gets read-only access; all writes go through the
-- service role key on the server (which bypasses RLS).
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE wallets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades             ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_flows       ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidations       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_wallets"            ON wallets            FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_trades"             ON trades             FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_feed_events"        ON feed_events        FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_protocol_snapshots" ON protocol_snapshots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_market_snapshots"   ON market_snapshots   FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_wallet_flows"       ON wallet_flows       FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_liquidations"       ON liquidations       FOR SELECT TO anon, authenticated USING (true);
