import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface MetricRowProps {
  label: string;
  value: ReactNode;
  tooltip?: string;
  valueClassName?: string;
  className?: string;
}

export default function MetricRow({ label, value, tooltip, valueClassName, className }: MetricRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3 py-1.5', className)}>
      <span className="flex items-center gap-1 text-[12px] text-textSecondary">
        {label}
        {tooltip && (
          <span title={tooltip} aria-label={`About ${label}`}>
            <Info size={11} className="text-textMuted" aria-hidden />
          </span>
        )}
      </span>
      <span className={cn('tabular text-[13px] font-semibold text-textPrimary', valueClassName)}>
        {value}
      </span>
    </div>
  );
}
