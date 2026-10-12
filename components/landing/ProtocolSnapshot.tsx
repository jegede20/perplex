'use client';

import { useEffect, useState } from 'react';
import type { ProtocolStats } from '@/lib/types';
import LiveDot from '@/components/ui/LiveDot';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ChangeArrow from '@/components/ui/ChangeArrow';
import { formatUSD, formatNumber } from '@/lib/utils/format';

interface ProtocolResponse {
  stats?: ProtocolStats;
}

interface SnapshotCard {
  label: string;
  value: string;
  sub?: string;
  change?: number;
  changeLabel?: string;
}

function cardsFrom(stats: ProtocolStats | null): SnapshotCard[] {
  if (!stats) {
    return Array.from({ length: 6 }, (_, i) => ({ label: `Metric ${i + 1}`, value: '--' }));
  }
  return [
    {
      label: 'Volume 24h',
      value: formatUSD(stats.volume24h),
      sub: 'rolling 24 hours',
      change: stats.volume7d > 0 ? ((stats.volume24h * 7 - stats.volume7d) / stats.volume7d) * 100 : undefined,
      changeLabel: 'vs prev',
    },
    {
      label: 'Open Interest',
      value: formatUSD(stats.openInterest),
      sub: 'across 6 markets',
    },
    {
      label: 'Active Traders',
      value: formatNumber(stats.activeTradersToday),
      sub: 'last 24 hours',
    },
    {
      label: 'Total TVL',
      value: formatUSD(stats.tvl),
      sub: 'collateral locked',
    },
    {
      label: 'Liquidations 24h',
      value: formatUSD(stats.liquidationVolume24h),
      sub: `${stats.liquidationCount24h} events`,
    },
    {
      label: 'Insurance Fund',
      value: formatUSD(stats.insuranceFundBalance),
      sub: 'backstop balance',
      change: stats.insuranceFundChange24h,
      changeLabel: '24h',
    },
  ];
}

/**
 * Live protocol metrics band — 6 stat cards fed by /api/protocol,
 * refreshed every 30 seconds with shimmer skeletons and graceful "--"
 * error state.
 */
export default function ProtocolSnapshot() {
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/protocol?range=24H');
        const json = (await res.json()) as ProtocolResponse;
        if (cancelled) return;
        if (json.stats) {
          setStats(json.stats);
          setFailed(false);
        } else {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => {
      setLoading(false);
      void load();
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const cards = cardsFrom(failed ? null : stats);

  return (
    <section id="protocol-snapshot" className="w-full bg-surface py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Live Protocol Metrics
            </p>
            <p className="mt-1 text-sm text-textMuted">Real data from Perpl on Monad</p>
          </div>
          <span className="flex items-center gap-2 text-xs text-textMuted">
            <LiveDot /> Updated 30s ago
          </span>
        </div>

        {loading && stats === null ? (
          <LoadingSkeleton variant="stat-grid" className="mt-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, i) => (
              <div
                key={card.label}
                className="rounded-xl border border-border bg-surface2 p-5 transition-all duration-200 hover:border-primary/40"
              >
                <p className="text-[26px] font-bold leading-tight text-white md:text-[28px]">
                  {failed ? '--' : card.value}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                  {failed && i < 6 ? card.label.replace('Metric', 'Metric') : card.label}
                </p>
                {(card.sub !== undefined || card.change !== undefined) && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-textMuted">
                    {card.change !== undefined && !failed && <ChangeArrow value={card.change} />}
                    {card.sub && <span>{card.sub}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
