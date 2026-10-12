'use client';

import { useRouter } from 'next/navigation';
import type { MarketSentimentDetail } from '@/lib/types';
import MarketBadge from '@/components/ui/MarketBadge';
import SentimentBar from '@/components/ui/SentimentBar';
import ConvictionMeter from '@/components/sentiment/ConvictionMeter';
import { cn } from '@/lib/utils/cn';

export interface MarketSentimentCardProps {
  detail: MarketSentimentDetail;
}

const TREND_ICON: Record<MarketSentimentDetail['trend'], string> = {
  MORE_BULLISH: '📈',
  MORE_BEARISH: '📉',
  STABLE: '➡️',
};

/**
 * Per-market smart-money sentiment card. High-conviction markets get a
 * subtle purple glow. Click → market drill-down.
 */
export default function MarketSentimentCard({ detail }: MarketSentimentCardProps) {
  const router = useRouter();
  const highConviction = detail.conviction > 70;

  return (
    <button
      type="button"
      onClick={() => router.push(`/app/markets/${detail.market}`)}
      className={cn(
        'rounded-2xl border bg-surface p-5 text-left transition-all duration-200 hover:border-primary/40',
        highConviction ? 'border-primary/50 shadow-[0_0_20px_rgba(123,94,167,0.18)]' : 'border-border'
      )}
      data-testid="market-sentiment-card"
      data-market={detail.market}
    >
      <div className="flex items-center justify-between">
        <MarketBadge market={detail.market} size="md" />
        <span className="text-[11px] text-textMuted">
          {TREND_ICON[detail.trend]} vs 1h ago
        </span>
      </div>

      <p
        className={cn(
          'tabular mt-3 text-[30px] font-black leading-none',
          detail.netSentiment > 0
            ? 'text-success'
            : detail.netSentiment < 0
              ? 'text-danger'
              : 'text-textSecondary'
        )}
      >
        {detail.netSentiment > 0 ? '+' : ''}
        {Math.round(detail.netSentiment)}
      </p>

      <div className="mt-3">
        <SentimentBar
          longPercent={detail.longPercent}
          shortPercent={detail.shortPercent}
          showLabels
        />
      </div>
      <p className="mt-1 text-[11px] text-textMuted">
        🐋 {Math.round(detail.longPercent)}% LONG · {Math.round(detail.shortPercent)}% SHORT
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <p className="text-textMuted">Whale OI</p>
          <p className="tabular font-semibold text-textPrimary">
            ${detail.whaleOI.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-textMuted">Positioned</p>
          <p className="tabular font-semibold text-textPrimary">{detail.whaleCount}</p>
        </div>
        <div>
          <p className="text-textMuted">Avg Score</p>
          <p className="tabular font-semibold text-textPrimary">{detail.avgSmartMoneyScore}</p>
        </div>
      </div>

      <div className="mt-3">
        <ConvictionMeter conviction={detail.conviction} />
      </div>

      <div className="mt-3">
        <span
          className={cn(
            'inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold',
            detail.trendChange > 0
              ? 'border-success/30 bg-success/10 text-success'
              : detail.trendChange < 0
                ? 'border-danger/30 bg-danger/10 text-danger'
                : 'border-border bg-surface2 text-textMuted'
          )}
        >
          {detail.trendChange > 0 ? '+' : ''}
          {Math.round(detail.trendChange)} pts vs 1h ago
        </span>
      </div>
    </button>
  );
}
