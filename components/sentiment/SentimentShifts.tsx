'use client';

import Link from 'next/link';
import type { SentimentShift } from '@/lib/types';
import TierBadge from '@/components/ui/TierBadge';
import { formatTimeAgo } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface SentimentShiftsProps {
  shifts: SentimentShift[];
  loading?: boolean;
}

/**
 * Recent sentiment shifts — when smart money changed direction.
 * Green border = bullish shift · red border = bearish shift.
 */
export default function SentimentShifts({ shifts, loading }: SentimentShiftsProps) {
  return (
    <div className="card-surface p-5">
      <h3 className="text-[15px] font-semibold text-textPrimary">Recent Sentiment Shifts</h3>
      <p className="mt-0.5 text-[12px] text-textMuted">When smart money changed direction</p>

      {loading && (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-lg bg-surface2" />
          ))}
        </div>
      )}

      {!loading && shifts.length === 0 && (
        <p className="mt-6 text-center text-[12px] text-textMuted">
          No major shifts detected — positioning is holding steady.
        </p>
      )}

      {!loading && (
        <div className="mt-4 space-y-2.5">
          {shifts.slice(0, 8).map((shift) => {
            const bullish = shift.direction === 'TURNED_BULLISH';
            return (
              <div
                key={shift.id}
                className={cn(
                  'rounded-lg border-l-2 bg-surface2 p-3 transition-colors duration-150',
                  bullish ? 'border-l-success' : 'border-l-danger'
                )}
                data-testid="sentiment-shift"
                data-direction={shift.direction}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-textPrimary">
                    {bullish ? '📈' : '📉'} {shift.market}{' '}
                    {bullish ? 'Turned Bullish' : 'Turned Bearish'}
                  </p>
                  <span className="whitespace-nowrap text-[10px] text-textMuted">
                    {formatTimeAgo(shift.timestamp)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-textSecondary">
                  <span className={bullish ? 'text-success' : 'text-danger'}>
                    {shift.delta > 0 ? '+' : ''}
                    {Math.round(shift.delta)} pts
                  </span>{' '}
                  · from {Math.round(shift.fromSentiment)} → {Math.round(shift.toSentiment)}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                  <TierBadge tier={shift.tier} size="sm" />
                  {shift.walletAddress ? (
                    <Link
                      href={`/app/wallet/${shift.walletAddress}`}
                      className="font-mono text-primary hover:text-white"
                    >
                      {shift.walletAddress.slice(0, 6)}...{shift.walletAddress.slice(-4)}
                    </Link>
                  ) : (
                    <span className="text-textMuted">smart money</span>
                  )}
                  <span className="text-textMuted">
                    {shift.cause}
                    {shift.walletAddress ? '' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
