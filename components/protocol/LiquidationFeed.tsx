'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import type { LiquidationEvent } from '@/lib/types';
import TierBadge from '@/components/ui/TierBadge';
import MarketBadge from '@/components/ui/MarketBadge';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { formatTimeAgo, formatUSD, getMonadScanTxUrl } from '@/lib/utils/format';
import { FEED_POLL_INTERVAL } from '@/lib/utils/constants';

export interface LiquidationFeedProps {
  events?: LiquidationEvent[];
  market?: string;
  title?: string;
  limit?: number;
}

/** Protocol-level liquidation event feed with tier + tx links. */
export default function LiquidationFeed({ events: eventsProp, market, title = 'Recent Liquidations', limit = 10 }: LiquidationFeedProps) {
  const router = useRouter();
  const [events, setEvents] = useState<LiquidationEvent[]>(eventsProp ?? []);
  const [loading, setLoading] = useState<boolean>(eventsProp === undefined);

  useEffect(() => {
    if (eventsProp) {
      setEvents(eventsProp);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const params = new URLSearchParams({ type: 'LIQUIDATION', limit: String(limit * 3) });
        if (market) params.set('market', market);
        const res = await fetch(`/api/feed?${params.toString()}`);
        const data = (await res.json()) as { events?: Array<{ id: string; type: string; walletAddress: string; shortAddress: string; tier: LiquidationEvent['tier']; smartMoneyScore: number; market: LiquidationEvent['market']; side: LiquidationEvent['side']; size: number; price: number; realizedPnl?: number; txHash: string; timestamp: string }> };
        if (!cancelled && data.events) {
          const liqs: LiquidationEvent[] = data.events.map((e) => ({
            id: e.id,
            walletAddress: e.walletAddress,
            shortAddress: e.shortAddress,
            tier: e.tier,
            market: e.market,
            side: e.side,
            size: e.size,
            price: e.price,
            loss: Math.abs(e.realizedPnl ?? e.size * 0.12),
            txHash: e.txHash,
            timestamp: e.timestamp,
          }));
          setEvents(liqs);
        }
      } catch (error) {
        console.error('[LiquidationFeed]', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), FEED_POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [eventsProp, market, limit]);

  const handleClick = useCallback(
    (address: string) => {
      router.push(`/app/wallet/${address}`);
    },
    [router]
  );

  return (
    <div className="card-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
        <Zap size={14} className="text-warning" aria-hidden /> {title}
      </h3>

      {loading ? (
        <LoadingSkeleton variant="list" rows={5} />
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
          <p className="text-[13px] text-textSecondary">No liquidations in this window</p>
          <p className="text-[11px] text-textMuted">The market has been calm — positions are healthy.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {events.slice(0, limit).map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => handleClick(event.walletAddress)}
                className="flex w-full items-center gap-3 rounded-lg border border-danger/20 bg-surface2 px-3 py-2 text-left transition-colors duration-150 hover:border-danger/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <TierBadge tier={event.tier} />
                    <span className="tabular truncate text-[12px] font-medium text-textPrimary">
                      {event.shortAddress}
                    </span>
                    <MarketBadge market={event.market} />
                    <span className="text-[11px] font-semibold text-danger">
                      {event.side} liquidated
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-textMuted">
                    {formatUSD(event.size)} at ${event.price.toLocaleString('en-US', { maximumFractionDigits: 2 })} ·
                    Loss {formatUSD(event.loss)} · {formatTimeAgo(event.timestamp)}
                  </div>
                </div>
                {event.txHash && (
                  <a
                    href={getMonadScanTxUrl(event.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View liquidation transaction on MonadScan (opens in a new tab)"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 text-[10px] text-primary transition-colors duration-150 hover:underline"
                  >
                    TX ↗
                  </a>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
