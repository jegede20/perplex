'use client';

import type { TimeRange } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

export interface TimeRangeTabsProps<T extends string = TimeRange> {
  value: T;
  onChange: (range: T) => void;
  options?: readonly T[];
  className?: string;
}

const DEFAULT_OPTIONS: readonly TimeRange[] = ['24H', '7D', '30D', 'ALL'];

export default function TimeRangeTabs<T extends string = TimeRange>({
  value,
  onChange,
  options,
  className,
}: TimeRangeTabsProps<T>) {
  const resolved = (options ?? DEFAULT_OPTIONS) as readonly T[];
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className={cn('inline-flex items-center rounded-lg bg-surface2 p-1', className)}
    >
      {resolved.map((option) => (
        <button
          key={option}
          role="tab"
          type="button"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'rounded-md px-3 py-1 text-[12px] font-medium transition-colors duration-150',
            value === option
              ? 'bg-primary text-white'
              : 'text-textSecondary hover:text-textPrimary'
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
