'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Home, RotateCw, Waves } from 'lucide-react';
import type { MarketSentimentDetail, SentimentHistoryPoint, WhaleSentimentData } from '@/lib/types';
import { buildSentimentHistory } from '@/lib/sentiment/sentimentEngine';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import SentimentBar from '@/components/ui/SentimentBar';
import MarketBadge from '@/components/ui/MarketBadge';
import SentimentGauge from '@/components/sentiment/SentimentGauge';
import ConvictionMeter from '@/components/sentiment/ConvictionMeter';
import MarketSentimentCard from '@/components/sentiment/MarketSentimentCard';
import SentimentHistory from '@/components/sentiment/SentimentHistory';
import SentimentShifts from '@/components/sentiment/SentimentShifts';
import WhaleSentimentTable from '@/components/sentiment/WhaleSentimentTable';
import { formatTimeAgo } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

const TREND_COPY: Record<WhaleSentimentData['overall']['trend'], { icon: string; text: string }> = {
  INCREASING_BULL: { icon: '📈', text: 'Whales adding LONG exposure' },
  INCREASING_BEAR: { icon: '📉', text: 'Whales adding SHORT exposure' },
  REVERSING: { icon: '🔄', text: 'Sentiment reversing — watch closely' },
  STABLE: { icon: '➡️', text: 'Positioning holding steady' },
};

function highestConvictionMarket(markets: MarketSentimentDetail[]): MarketSentimentDetail | null {
  if (markets.length === 0) return null;
  return markets.reduce((best, m) => (m.conviction > best.conviction ? m : best));
}

function SentimentPageInner() {
  const [data, setData] = useState<WhaleSentimentData | null>(null);
  const [history, setHistory] = useState<SentimentHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sentiment/detailed');
      const json = (await res.json()) as WhaleSentimentData & { error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? 'Failed to load whale sentiment');
        setData(null);
      } else {
        setData(json);
        setHistory(buildSentimentHistory(json.byMarket, '24H'));
      }
    } catch {
      setError('Failed to load whale sentiment');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const convictionMarket = data ? highestConvictionMarket(data.byMarket) : null;

  return (
    <div className="space-y-5">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] text-textMuted" aria-label="Breadcrumb">
        <Link href="/app" className="flex items-center gap-1 transition-colors duration-150 hover:text-primary">
          <Home size={12} aria-hidden /> App
        </Link>
        <ChevronRight size={12} aria-hidden />
        <span className="text-textSecondary">Whale Sentiment</span>
      </nav>

      {/* title row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[24px] font-bold text-white">
            <Waves size={22} className="text-primary" aria-hidden />
            Whale Sentiment Gauge
          </h1>
          <p className="mt-1 text-[13px] text-textMuted">
            Aggregate smart money positioning across all Perpl markets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-textMuted">
            Last updated: {data ? formatTimeAgo(data.lastUpdated) : '—'}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface2 text-textSecondary transition-colors duration-150 hover:border-primary/40 hover:text-primary"
            aria-label="Refresh sentiment"
          >
            <RotateCw size={15} aria-hidden />
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <LoadingSkeleton variant="card" rows={5} className="lg:col-span-2 h-[380px]" />
            <LoadingSkeleton variant="stat-grid" className="lg:col-span-3 grid-cols-1" />
          </div>
          <LoadingSkeleton variant="chart" />
        </div>
      )}

      {!loading && error && (
        <div className="card-surface flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-[14px] font-semibold text-textPrimary">Unable to load whale sentiment</p>
          <p className="text-[12px] text-textMuted">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* gauge + summary cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <SentimentGauge overall={data.overall} />
            </div>
            <div className="flex flex-col gap-4 lg:col-span-3">
              {/* card 1 */}
              <div className="card-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-textSecondary">
                  Smart Money is…
                </p>
                <p
                  className={cn(
                    'mt-1 text-[28px] font-black',
                    data.overall.longPercent >= data.overall.shortPercent
                      ? 'text-success'
                      : 'text-danger'
                  )}
                >
                  {Math.round(
                    Math.max(data.overall.longPercent, data.overall.shortPercent)
                  )}
                  % {data.overall.longPercent >= data.overall.shortPercent ? 'LONG' : 'SHORT'}
                </p>
                <SentimentBar
                  longPercent={data.overall.longPercent}
                  shortPercent={data.overall.shortPercent}
                  height="md"
                />
                <p className="mt-1.5 text-[11px] text-textMuted">
                  Weighted by Smart Money Score
                </p>
              </div>

              {/* card 2 */}
              <div className="card-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-textSecondary">
                  Market Trend
                </p>
                <p className="mt-2 text-[16px] font-semibold text-textPrimary">
                  {TREND_COPY[data.overall.trend].icon}{' '}
                  {TREND_COPY[data.overall.trend].text}
                </p>
                <p className="mt-1 text-[11px] text-textMuted">vs 1 hour ago</p>
              </div>

              {/* card 3 */}
              <div className="card-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-textSecondary">
                  Highest Conviction Market
                </p>
                {convictionMarket ? (
                  <>
                    <div className="mt-2 flex items-center gap-2">
                      <MarketBadge market={convictionMarket.market} size="md" />
                      <span className="text-[16px] font-semibold text-textPrimary">
                        {convictionMarket.market}-PERP
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-textMuted">
                      Whales are {Math.round(convictionMarket.longPercent)}% long · Score:{' '}
                      {convictionMarket.avgSmartMoneyScore}
                    </p>
                    <div className="mt-2">
                      <ConvictionMeter conviction={convictionMarket.conviction} showLabel={false} />
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-[12px] text-textMuted">No positioned whales yet</p>
                )}
              </div>
            </div>
          </div>

          {/* per-market cards */}
          <div>
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
              Per-Market Sentiment
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.byMarket.map((detail) => (
                <MarketSentimentCard key={detail.market} detail={detail} />
              ))}
            </div>
          </div>

          {/* history + shifts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SentimentHistory points={history} />
            </div>
            <div className="lg:col-span-2">
              <SentimentShifts shifts={data.recentShifts} />
            </div>
          </div>

          {/* whale tables */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WhaleSentimentTable
              title="Most Bullish Whales"
              rows={data.topBullishWhales}
              side="BULL"
            />
            <WhaleSentimentTable
              title="Most Bearish Whales"
              rows={data.topBearishWhales}
              side="BEAR"
            />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * WHALE SENTIMENT GAUGE — market temperature from tracked smart money.
 * Route: /app/sentiment
 */
export default function SentimentPage() {
  return (
    <ErrorBoundary>
      <SentimentPageInner />
    </ErrorBoundary>
  );
}
