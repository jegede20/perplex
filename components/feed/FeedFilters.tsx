'use client';

import type { FeedEventType, Market, WalletTier } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

export interface FeedFilterState {
  market: Market | 'ALL';
  tier: WalletTier | 'ALL';
  type: FeedEventType | 'ALL';
  minSize: number;
}

export interface FeedFiltersProps {
  value: FeedFilterState;
  onChange: (next: FeedFilterState) => void;
}

const MARKET_OPTIONS: Array<Market | 'ALL'> = ['ALL', 'BTC', 'ETH', 'SOL', 'MON', 'HYPE', 'ZEC'];
const TIER_OPTIONS: Array<{ value: WalletTier | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All tiers' },
  { value: 'WHALE', label: '🐋 Whale' },
  { value: 'SHARK', label: '🦈 Shark' },
  { value: 'FISH', label: '🐟 Fish' },
];
const TYPE_OPTIONS: Array<{ value: FeedEventType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All events' },
  { value: 'OPEN', label: 'Opens' },
  { value: 'CLOSE', label: 'Closes' },
  { value: 'LIQUIDATION', label: 'Liquidations' },
];
const SIZE_OPTIONS = [10_000, 50_000, 100_000, 500_000];

/** Market / tier / type / min-size filters — all combine with AND logic. */
export default function FeedFilters({ value, onChange }: FeedFiltersProps) {
  return (
    <div className="card-surface flex flex-wrap items-center gap-3 p-3">
      {/* Market */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-textMuted">Market</span>
        {MARKET_OPTIONS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange({ ...value, market: m })}
            aria-pressed={value.market === m}
            className={cn(
              'rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-150',
              value.market === m ? 'bg-primary text-white' : 'bg-surface2 text-textSecondary hover:text-textPrimary'
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Tier */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-textMuted">Tier</span>
        {TIER_OPTIONS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange({ ...value, tier: t.value })}
            aria-pressed={value.tier === t.value}
            className={cn(
              'rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-150',
              value.tier === t.value ? 'bg-primary text-white' : 'bg-surface2 text-textSecondary hover:text-textPrimary'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Type */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-textMuted">Type</span>
        {TYPE_OPTIONS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange({ ...value, type: t.value })}
            aria-pressed={value.type === t.value}
            className={cn(
              'rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-150',
              value.type === t.value ? 'bg-primary text-white' : 'bg-surface2 text-textSecondary hover:text-textPrimary'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Min size */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-textMuted">Min size</span>
        {SIZE_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ ...value, minSize: value.minSize === s ? 0 : s })}
            aria-pressed={value.minSize === s}
            className={cn(
              'rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-150',
              value.minSize === s ? 'bg-primary text-white' : 'bg-surface2 text-textSecondary hover:text-textPrimary'
            )}
          >
            ${s / 1000}K
          </button>
        ))}
      </div>
    </div>
  );
}
