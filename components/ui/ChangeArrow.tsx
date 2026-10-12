import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatSignedPercent } from '@/lib/utils/format';

export interface ChangeArrowProps {
  value: number;
  decimals?: number;
  showValue?: boolean;
  className?: string;
}

export default function ChangeArrow({ value, decimals = 1, showValue = true, className }: ChangeArrowProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  return (
    <span
      data-testid="change-arrow"
      data-direction={isPositive ? 'up' : isNegative ? 'down' : 'flat'}
      className={cn(
        'tabular inline-flex items-center gap-0.5 text-[12px] font-medium',
        isPositive && 'text-success',
        isNegative && 'text-danger',
        !isPositive && !isNegative && 'text-textMuted',
        className
      )}
    >
      {isPositive ? (
        <ArrowUpRight size={13} aria-label="up" />
      ) : isNegative ? (
        <ArrowDownRight size={13} aria-label="down" />
      ) : (
        <Minus size={13} aria-label="flat" />
      )}
      {showValue && formatSignedPercent(value, decimals)}
    </span>
  );
}
