'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { OverallSentiment } from '@/lib/types';
import LiveDot from '@/components/ui/LiveDot';
import { cn } from '@/lib/utils/cn';

interface SentimentMiniResponse {
  overall?: OverallSentiment;
}

const LABEL_STYLE: Record<OverallSentiment['sentimentLabel'], string> = {
  'EXTREME FEAR': 'text-danger',
  FEAR: 'text-[#F97316]',
  NEUTRAL: 'text-textSecondary',
  GREED: 'text-[#86EFAC]',
  'EXTREME GREED': 'text-success',
};

/**
 * Compact whale-sentiment strip for the protocol dashboard — teases the
 * full gauge at /app/sentiment.
 */
export default function SentimentMiniWidget() {
  const [overall, setOverall] = useState<OverallSentiment | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/sentiment/detailed')
      .then((res) => res.json() as Promise<SentimentMiniResponse>)
      .then((json) => {
        if (!cancelled && json.overall) setOverall(json.overall);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="card-surface glass-glow-hover flex flex-wrap items-center justify-between gap-3 px-4 py-3"
      data-testid="sentiment-mini"
    >
      <div className="flex items-center gap-2.5">
        <LiveDot />
        <p className="text-[12px] text-textSecondary">
          Whale Sentiment:{' '}
          {overall ? (
            <span className="font-semibold">
              <span aria-hidden>{overall.netSentiment >= 0 ? '🟢' : '🔴'}</span>{' '}
              <span className={LABEL_STYLE[overall.sentimentLabel]}>
                {overall.sentimentLabel}
              </span>{' '}
              <span
                className={cn(
                  'tabular',
                  overall.netSentiment >= 0 ? 'text-success' : 'text-danger'
                )}
              >
                ({overall.netSentiment > 0 ? '+' : ''}
                {Math.round(overall.netSentiment)})
              </span>{' '}
              · {Math.round(overall.longPercent)}% Long
            </span>
          ) : (
            <span className="text-textMuted">loading…</span>
          )}
        </p>
      </div>
      <Link
        href="/app/sentiment"
        className="text-[11px] font-semibold text-primary transition-colors duration-150 hover:text-white"
      >
        View Full Gauge →
      </Link>
    </div>
  );
}
