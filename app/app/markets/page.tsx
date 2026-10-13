'use client';

import { useEffect, useState } from 'react';
import type { MarketSummary } from '@/lib/types';
import MarketCard from '@/components/markets/MarketCard';
import MarketsTable from '@/components/protocol/MarketsTable';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { formatUSD, formatNumber } from '@/lib/utils/format';

/**
 * MARKETS OVERVIEW — 3x2 card grid + full sortable table
 * covering all 6 Perpl markets.
 */
export default function MarketsPage() {
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/markets');
        const data = (await res.json()) as { markets?: MarketSummary[] };
        if (!cancelled && data.markets) setMarkets(data.markets);
      } catch (error) {
        console.error('[MarketsPage]', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q ? markets.filter((m) => m.symbol.toLowerCase().includes(q)) : markets;
  const totalVolume = markets.reduce((s, m) => s + m.volume24h, 0);
  const totalOI = markets.reduce((s, m) => s + m.openInterest, 0);
  const totalLiq = markets.reduce((s, m) => s + m.liquidations24h, 0);

  return (
    <ErrorBoundary label="Markets">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-page text-textPrimary">Markets</h1>
            <p className="text-[12px] text-textMuted">
              All 6 Perpl perpetual markets — drill into any market for whale positioning.
            </p>
          </div>
          {!loading && markets.length > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-[11px]">
              <span className="text-textMuted">24h:</span>
              <span className="tabular font-semibold text-textPrimary">{formatUSD(totalVolume)} vol</span>
              <span className="text-textMuted">·</span>
              <span className="tabular font-semibold text-textPrimary">{formatUSD(totalOI)} OI</span>
              <span className="text-textMuted">·</span>
              <span className="tabular font-semibold text-warning">{formatNumber(totalLiq)} liqs</span>
            </div>
          )}
        </div>

        {!loading && filtered.length === 0 && markets.length > 0 && (
          <p className="text-[12px] text-textMuted">No markets match &ldquo;{query}&rdquo;.</p>
        )}

        {/* 3x2 market cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((market) => (
              <MarketCard key={market.symbol} market={market} />
            ))}
          </div>
        )}

        {/* Full table */}
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-section text-textSecondary">All Markets</h2>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets…"
              aria-label="Search markets"
              className="flex h-9 w-full rounded-md border border-border bg-surface2 px-3 py-1 text-[13px] text-textPrimary placeholder:text-textMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:w-56"
            />
          </div>
          <MarketsTable markets={loading ? null : filtered} loading={loading} />
        </section>
      </div>
    </ErrorBoundary>
  );
}
