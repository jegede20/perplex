'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ConvictionMeterProps {
  /** 0-100 */
  conviction: number;
  showLabel?: boolean;
  className?: string;
  /** extra content (tooltip text) */
  tooltip?: ReactNode;
}

/**
 * Conviction meter — purple fill showing how decisive smart money
 * positioning is. Higher = stronger directional bias.
 */
export default function ConvictionMeter({
  conviction,
  showLabel = true,
  className,
  tooltip,
}: ConvictionMeterProps) {
  const value = Math.min(Math.max(Math.round(conviction), 0), 100);
  return (
    <div
      className={cn('w-full', className)}
      data-testid="conviction-meter"
      data-value={value}
      title="How decisive smart money positioning is. Higher = stronger directional bias."
    >
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-textSecondary">Conviction</span>
          <span className="tabular font-semibold text-primary">{value}/100</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      {tooltip && <p className="mt-1 text-[10px] text-textMuted">{tooltip}</p>}
    </div>
  );
}
