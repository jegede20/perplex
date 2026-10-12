'use client';

import { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { FeedEvent as FeedEventType } from '@/lib/types';
import TierBadge from '@/components/ui/TierBadge';
import MarketBadge from '@/components/ui/MarketBadge';
import PnLTag from '@/components/ui/PnLTag';
import {
  formatLeverage,
  formatPercent,
  formatPrice,
  formatTimeAgo,
  formatUSD,
  getMonadScanTxUrl,
} from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface FeedEventProps {
  event: FeedEventType;
  compact?: boolean;
  winRate?: number;
}

const BORDER_COLOR: Record<FeedEventType['type'], string> = {
  OPEN: 'border-l-success',
  CLOSE: 'border-l-primary',
  LIQUIDATION: 'border-l-warning',
  FLIP: 'border-l-danger',
};

const ACTION_LABEL: Record<FeedEventType['type'], (e: FeedEventType) => string> = {
  OPEN: (e) => `Opened ${formatUSD(e.size)} ${e.side} ${e.market}`,
  CLOSE: (e) => `Closed ${formatUSD(e.size)} ${e.side} ${e.market}`,
  LIQUIDATION: (e) => `Liquidated ${formatUSD(e.size)} ${e.side} ${e.market}`,
  FLIP: (e) => `Flipped to ${formatUSD(e.size)} ${e.side} ${e.market}`,
};

/**
 * Single feed event card — compact (side panel) and full-width variants.
 * Click anywhere to open the wallet profile.
 */
function FeedEventCard({ event, compact = false, winRate }: FeedEventProps) {
  const router = useRouter();

  const handleClick = useCallback(() => {
    router.push(`/app/wallet/${event.walletAddress}`);
  }, [router, event.walletAddress]);

  const action = ACTION_LABEL[event.type](event);

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'w-full border-l-2 bg-surface2 px-3 py-2 text-left transition-colors duration-150 hover:bg-border/40',
          BORDER_COLOR[event.type]
        )}
      >
        <div className="flex items-center gap-1.5 text-[11px]">
          <span aria-hidden>{event.tier === 'WHALE' ? '🐋' : event.tier === 'SHARK' ? '🦈' : '🐟'}</span>
          <span className="tabular font-medium text-textPrimary">{event.shortAddress}</span>
          <span className="text-textMuted">{formatTimeAgo(event.timestamp)}</span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-textSecondary">
          {event.type === 'LIQUIDATION' ? '⚠ ' : ''}
          {action}
          {event.leverage ? ` · ${formatLeverage(event.leverage)}` : ''}
        </div>
      </button>
    );
  }

  return (
    <article
      tabIndex={0}
      role="button"
      aria-label={`Open wallet ${event.shortAddress}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'cursor-pointer border-l-2 bg-surface px-4 py-3 transition-colors duration-150 hover:bg-surface2',
        BORDER_COLOR[event.type]
      )}
    >
      {/* Row 1 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TierBadge tier={event.tier} />
          <span className="tabular text-[13px] font-medium text-textPrimary">{event.shortAddress}</span>
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            score {event.smartMoneyScore}
          </span>
          <MarketBadge market={event.market} />
        </div>
        <span className="text-[11px] text-textMuted">{formatTimeAgo(event.timestamp)}</span>
      </div>

      {/* Row 2 */}
      <div className="mt-1.5 text-[15px] font-semibold text-textPrimary">
        {event.type === 'LIQUIDATION' && <span className="mr-1 text-warning" aria-label="liquidation">⚡</span>}
        <span className={event.side === 'LONG' ? 'text-success' : 'text-danger'}>{action}</span>
      </div>

      {/* Row 3 */}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-textSecondary">
        <span>Entry: {formatPrice(event.price)}</span>
        {event.leverage !== undefined && <span>Lev: {formatLeverage(event.leverage)}</span>}
        {winRate !== undefined && <span>WR: {formatPercent(winRate / 100)}</span>}
        {event.realizedPnl !== undefined && (
          <PnLTag value={event.realizedPnl} compact>
            PnL: {event.realizedPnl >= 0 ? '+' : '-'}${Math.abs(event.realizedPnl / 1000).toFixed(1)}K
          </PnLTag>
        )}
      </div>

      {/* Row 4 */}
      {event.txHash && (
        <div className="mt-1 text-right">
          <a
            href={getMonadScanTxUrl(event.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View transaction on MonadScan (opens in a new tab)"
            onClick={(e) => e.stopPropagation()}
            className="tabular text-[10px] text-primary transition-colors duration-150 hover:underline"
          >
            {event.txHash.slice(0, 10)}…{event.txHash.slice(-6)} ↗
          </a>
        </div>
      )}
    </article>
  );
}

export default memo(FeedEventCard);
