/**
 * Perplex — Supabase seeding job.
 *
 * Loads the deterministic analytics dataset (the same universe the app
 * serves in fallback mode) into Supabase so the database becomes the
 * source of truth for wallets, trades, feed events, liquidations, and
 * capital flows. Also records the first market/protocol snapshots from
 * the live Perpl REST context.
 *
 * Usage:
 *   npm run seed
 *
 * Idempotent: existing rows in the seeded tables are truncated first.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { getSeedDataset, getMarketsOverview, getProtocolStats } from '@/lib/protocol/aggregator';
import {
  insertFeedEvents,
  insertLiquidations,
  insertTrades,
  insertWalletFlows,
  upsertWalletProfile,
} from '@/lib/supabase/queries';

function loadEnvLocal(): void {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main(): Promise<void> {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('▸ Truncating seeded tables…');
  for (const table of ['wallet_flows', 'trades', 'feed_events', 'liquidations', 'wallets'] as const) {
    // every seeded table carries a uuid id PK — delete all rows idempotently
    const res = await admin.from(table).delete().neq('id', '');
    if (res.error) console.warn(`  truncate ${table}:`, res.error.message);
    else console.log(`  ${table} cleared`);
  }

  const dataset = getSeedDataset();
  console.log(`▸ Seeding ${dataset.wallets.length} wallets…`);

  for (const wallet of dataset.wallets) {
    const ok = await upsertWalletProfile(wallet.profile);
    if (!ok) console.warn('  wallet upsert failed:', wallet.profile.address);
  }
  console.log('  wallets done');

  console.log(`▸ Seeding trades…`);
  let tradeCount = 0;
  for (const wallet of dataset.wallets) {
    for (let i = 0; i < wallet.trades.length; i += 40) {
      const batch = wallet.trades.slice(i, i + 40);
      const ok = await insertTrades(batch);
      if (ok) tradeCount += batch.length;
    }
  }
  console.log(`  ${tradeCount} trades done`);

  console.log('▸ Seeding feed events…');
  let feedCount = 0;
  for (let i = 0; i < dataset.feedEvents.length; i += 50) {
    const batch = dataset.feedEvents.slice(i, i + 50);
    const ok = await insertFeedEvents(batch);
    if (ok) feedCount += batch.length;
  }
  console.log(`  ${feedCount} feed events done`);

  console.log('▸ Seeding liquidations…');
  let liqCount = 0;
  for (let i = 0; i < dataset.liquidations.length; i += 25) {
    const batch = dataset.liquidations.slice(i, i + 25);
    const ok = await insertLiquidations(batch);
    if (ok) liqCount += batch.length;
  }
  console.log(`  ${liqCount} liquidations done`);

  console.log('▸ Seeding wallet flows…');
  let flowCount = 0;
  for (const wallet of dataset.wallets) {
    const ok = await insertWalletFlows(wallet.profile.address, wallet.flows);
    if (ok) flowCount += wallet.flows.length;
  }
  console.log(`  ${flowCount} flows done`);

  console.log('▸ Recording live market + protocol snapshots from Perpl REST…');
  const markets = await getMarketsOverview();
  for (const m of markets) {
    const { error } = await admin.from('market_snapshots').insert({
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
    if (error) console.warn('  market snapshot:', error.message);
  }
  const stats = await getProtocolStats('24H');
  const { error: snapError } = await admin.from('protocol_snapshots').insert({
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
  if (snapError) console.warn('  protocol snapshot:', snapError.message);

  // counts
  for (const table of ['wallets', 'trades', 'feed_events', 'liquidations', 'wallet_flows', 'market_snapshots', 'protocol_snapshots'] as const) {
    const { count } = await admin.from(table).select('*', { count: 'exact', head: true });
    console.log(`  ${table}: ${count ?? 0} rows`);
  }

  console.log('✓ Seed complete — Supabase is now the source of truth.');
}

void main().catch((error) => {
  console.error('seed failed:', error);
  process.exit(1);
});
