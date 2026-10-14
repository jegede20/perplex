'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FeedEvent, WalletSummary } from '@/lib/types';
import FeedEventCard from '@/components/feed/FeedEvent';
import FeedFilters, { type FeedFilterState } from '@/components/feed/FeedFilters';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LiveDot from '@/components/ui/LiveDot';
import DemoDataBadge from '@/components/ui/DemoDataBadge';
import { usePerplWebSocket } from '@/lib/perpl/websocket';
import { FEED_MAX_EVENTS, FEED_POLL_INTERVAL } from '@/lib/utils/constants';

/**
 * LIVE FEED — full-page whale intelligence feed with
 * market / tier / type / min-size filters (AND logic).
 */
export default function FeedPage() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [scoreMap, setScoreMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FeedFilterState>({
    market: 'ALL',
    tier: 'ALL',
    type: 'ALL',
    minSize: 0,
  });

  // Leaderboard scores for win-rate/score enrichment
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/wallets?limit=100');
        const data = (await res.json()) as { wallets?: WalletSummary[] };
        if (!cancelled && data.wallets) {
          setScoreMap(new Map(data.wallets.map((w) => [w.address.toLowerCase(), w.smartMoneyScore])));
        }
      } catch {
        // non-fatal enrichment
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const [demoData, setDemoData] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filters.market !== 'ALL') params.set('market', filters.market);
      if (filters.type !== 'ALL') params.set('type', filters.type);
      if (filters.minSize > 0) params.set('minSize', String(filters.minSize));
      const res = await fetch(`/api/feed?${params.toString()}`);
      const data = (await res.json()) as { events?: FeedEvent[]; dataSource?: 'live' | 'demo' };
      if (data.events) {
        setEvents(data.events);
        setDemoData(data.dataSource !== 'live');
      }
    } catch (error) {
      console.error('[FeedPage]', error);
    } finally {
      setLoading(false);
    }
  }, [filters.market, filters.type, filters.minSize]);

  useEffect(() => {
    void loadEvents();
    const timer = setInterval(() => void loadEvents(), FEED_POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loadEvents]);

  const { events: wsEvents, isConnected } = usePerplWebSocket();

  useEffect(() => {
    if (wsEvents.length === 0) return;
    setEvents((prev) => {
      const seen = new Set(prev.map((e) => e.id));
      const fresh = wsEvents.filter((e) => !seen.has(e.id));
      return fresh.length > 0 ? [...fresh, ...prev].slice(0, FEED_MAX_EVENTS) : prev;
    });
  }, [wsEvents]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filters.market !== 'ALL' && e.market !== filters.market) return false;
      if (filters.type !== 'ALL' && e.type !== filters.type) return false;
      if (filters.minSize > 0 && e.size < filters.minSize) return false;
      if (filters.tier !== 'ALL') {
        if (filters.tier === 'WHALE' && e.size < 500_000) return false;
        if (filters.tier === 'SHARK' && (e.size < 100_000 || e.size >= 500_000)) return false;
        if (filters.tier === 'FISH' && e.size >= 100_000) return false;
      }
      return true;
    });
  }, [events, filters]);

  return (
    <ErrorBoundary label="Live Feed">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-page text-textPrimary">
              Live Feed <LiveDot /> {demoData && !isConnected && <DemoDataBadge />}
            </h1>
            <p className="text-[12px] text-textMuted">
              Whale opens, closes, flips, and liquidations — streamed from Monad.
            </p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-[11px] text-textSecondary">
            {isConnected ? '🟢 WebSocket connected' : '🟡 Polling mode'} · {filtered.length} events
          </span>
        </div>

        <FeedFilters value={filters} onChange={setFilters} />

        {loading ? (
          <LoadingSkeleton variant="list" rows={10} />
        ) : filtered.length === 0 ? (
          <div className="card-surface flex flex-col items-center justify-center gap-2 p-12 text-center">
            <p className="text-[14px] font-semibold text-textPrimary">No events match your filters</p>
            <p className="text-[12px] text-textMuted">
              Try lowering the min size or switching the market filter to ALL.
            </p>
            <button
              type="button"
              onClick={() => setFilters({ market: 'ALL', tier: 'ALL', type: 'ALL', minSize: 0 })}
              className="mt-1 rounded-lg border border-border px-4 py-2 text-[12px] font-semibold text-primary transition-colors duration-150 hover:border-primary"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((event) => (
              <div key={event.id} className="slide-in-top">
                <FeedEventCard
                  event={event}
                  winRate={scoreMap.has(event.walletAddress.toLowerCase()) ? scoreMap.get(event.walletAddress.toLowerCase()) : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
