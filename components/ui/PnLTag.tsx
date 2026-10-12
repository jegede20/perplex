import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatPnL } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface PnLTagProps {
  value: number;
  showIcon?: boolean;
  compact?: boolean;
  children?: ReactNode;
  className?: string;
}

export default function PnLTag({ value, showIcon = true, compact = false, children, className }: PnLTagProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const label = children ?? formatPnL(value);

  return (
    <span
      data-testid="pnl-tag"
      data-sign={isPositive ? 'positive' : isNegative ? 'negative' : 'zero'}
      className={cn(
        'tabular inline-flex items-center gap-1 rounded-md font-semibold',
        compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-[12px]',
        isPositive && 'bg-success/15 text-success',
        isNegative && 'bg-danger/15 text-danger',
        !isPositive && !isNegative && 'bg-surface2 text-textSecondary',
        className
      )}
    >
      {showIcon &&
        (isPositive ? (
          <TrendingUp size={12} aria-label="profit up" />
        ) : isNegative ? (
          <TrendingDown size={12} aria-label="loss down" />
        ) : (
          <Minus size={12} aria-label="flat" />
        ))}
      {label}
    </span>
  );
}
