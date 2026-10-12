'use client';

import { useRouter } from 'next/navigation';
import type { MarketSummary } from '@/lib/types';
import MarketBadge from '@/components/ui/MarketBadge';
import SentimentBar from '@/components/ui/SentimentBar';
import ChangeArrow from '@/components/ui/ChangeArrow';
import { formatAPRCompact, formatPrice, formatUSD, formatNumber } from '@/lib/utils/format';

export interface MarketCardProps {
  market: MarketSummary;
}

/** Single market card for the markets grid — click to drill down. */
export default function MarketCard({ market }: MarketCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/app/markets/${market.symbol}`)}
      aria-label={`Open ${market.symbol}-PERP detail`}
      className="card-surface glass-glow-hover flex flex-col gap-3 p-4 text-left transition-colors duration-150 hover:border-primary/60"
    >
      <div className="flex items-start justify-between">
        <MarketBadge market={market.symbol} size="lg" />
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            market.dominantSide === 'LONG'
              ? 'bg-success/15 text-success'
              : market.dominantSide === 'SHORT'
                ? 'bg-danger/15 text-danger'
                : 'bg-surface2 text-textSecondary'
          }`}
        >
          WHALES {market.dominantSide}
        </span>
      </div>

      <div>
        <div className="tabular text-[22px] font-bold text-textPrimary">{formatPrice(market.markPrice)}</div>
        <ChangeArrow value={market.priceChangePercent24h} />
      </div>

      <SentimentBar longPercent={market.longPercent} shortPercent={market.shortPercent} />

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        <div>
          <div className="text-textMuted">Open Interest</div>
          <div className="tabular font-semibold text-textPrimary">{formatUSD(market.openInterest)}</div>
        </div>
        <div>
          <div className="text-textMuted">Funding APR</div>
          <div className={`tabular font-semibold ${market.fundingRate >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatAPRCompact(market.fundingRate)}
          </div>
        </div>
        <div>
          <div className="text-textMuted">Volume 24h</div>
          <div className="tabular font-semibold text-textPrimary">{formatUSD(market.volume24h)}</div>
        </div>
        <div>
          <div className="text-textMuted">Whales</div>
          <div className="tabular font-semibold text-primary">🐋 {formatNumber(market.whaleCount)}</div>
        </div>
      </div>
    </button>
  );
}
