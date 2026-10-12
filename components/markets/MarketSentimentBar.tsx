import SentimentBar from '@/components/ui/SentimentBar';
import type { MarketDominance } from '@/lib/types';

export interface MarketSentimentBarProps {
  longPercent: number;
  shortPercent: number;
  dominantSide: MarketDominance;
  whaleLongPercent?: number;
}

/** Long/Short skew bar with dominance label + whale overlay. */
export default function MarketSentimentBar({
  longPercent,
  shortPercent,
  dominantSide,
  whaleLongPercent,
}: MarketSentimentBarProps) {
  return (
    <div className="card-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
          Long / Short Skew
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            dominantSide === 'LONG'
              ? 'bg-success/15 text-success'
              : dominantSide === 'SHORT'
                ? 'bg-danger/15 text-danger'
                : 'bg-surface2 text-textSecondary'
          }`}
        >
          {dominantSide === 'NEUTRAL' ? 'BALANCED' : `${dominantSide} DOMINANT`}
        </span>
      </div>

      <SentimentBar longPercent={longPercent} shortPercent={shortPercent} height="md" />

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded-lg bg-success/10 p-2">
          <div className="font-semibold text-success">{longPercent.toFixed(1)}%</div>
          <div className="text-textMuted">Longs</div>
        </div>
        <div className="rounded-lg bg-surface2 p-2">
          <div className="font-semibold text-textPrimary">
            {whaleLongPercent !== undefined ? `${whaleLongPercent.toFixed(0)}%` : '—'}
          </div>
          <div className="text-textMuted">Whale long</div>
        </div>
        <div className="rounded-lg bg-danger/10 p-2">
          <div className="font-semibold text-danger">{shortPercent.toFixed(1)}%</div>
          <div className="text-textMuted">Shorts</div>
        </div>
      </div>
    </div>
  );
}
