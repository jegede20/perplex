import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import ChangeArrow from '@/components/ui/ChangeArrow';

export interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  change?: number;
  changeLabel?: string;
  highlight?: 'LONG' | 'SHORT' | 'NEUTRAL' | 'PURPLE' | 'WARNING';
  icon?: ReactNode;
  tooltip?: string;
  className?: string;
}

const HIGHLIGHT_STYLE: Record<NonNullable<StatCardProps['highlight']>, string> = {
  PURPLE: 'glass-glow border-primary/30',
  LONG: 'border-success/30',
  SHORT: 'border-danger/30',
  WARNING: 'border-warning/40',
  NEUTRAL: '',
};

const VALUE_STYLE: Record<NonNullable<StatCardProps['highlight']>, string> = {
  PURPLE: 'text-primary',
  LONG: 'text-success',
  SHORT: 'text-danger',
  WARNING: 'text-warning',
  NEUTRAL: 'text-textPrimary',
};

export default function StatCard({
  label,
  value,
  subValue,
  change,
  changeLabel,
  highlight = 'NEUTRAL',
  icon,
  tooltip,
  className,
}: StatCardProps) {
  return (
    <div
      data-testid="stat-card"
      data-highlight={highlight}
      title={tooltip}
      className={cn(
        'card-surface glass-glow-hover flex flex-col gap-1 p-4',
        HIGHLIGHT_STYLE[highlight],
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-textSecondary">
          {label}
        </span>
        {icon && <span className="text-textMuted">{icon}</span>}
      </div>
      <div className={cn('tabular text-[28px] font-bold leading-tight', VALUE_STYLE[highlight])}>
        {value}
      </div>
      {(subValue !== undefined || change !== undefined) && (
        <div className="flex items-center gap-1.5 text-[11px] text-textMuted">
          {change !== undefined && <ChangeArrow value={change} />}
          {subValue && <span>{changeLabel ? `${subValue} ${changeLabel}` : subValue}</span>}
        </div>
      )}
    </div>
  );
}
