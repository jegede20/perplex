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

        {/* 3x2 market cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {markets.map((market) => (
              <MarketCard key={market.symbol} market={market} />
            ))}
          </div>
        )}

        {/* Full table */}
        <section>
          <h2 className="mb-2 text-section text-textSecondary">All Markets</h2>
          <MarketsTable markets={loading ? null : markets} loading={loading} />
        </section>
      </div>
    </ErrorBoundary>
  );
}
