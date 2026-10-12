import type { Market } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { MARKETS } from '@/lib/perpl/markets';

export interface MarketBadgeProps {
  market: Market;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const MARKET_COLORS: Record<Market, { bg: string; text: string; letter: string }> = {
  BTC: { bg: 'bg-warning/15', text: 'text-warning', letter: '₿' },
  ETH: { bg: 'bg-primary/15', text: 'text-primary', letter: 'Ξ' },
  SOL: { bg: 'bg-success/15', text: 'text-success', letter: '◎' },
  MON: { bg: 'bg-primary/15', text: 'text-primary', letter: 'M' },
  HYPE: { bg: 'bg-warning/15', text: 'text-warning', letter: 'H' },
  ZEC: { bg: 'bg-success/15', text: 'text-success', letter: 'Z' },
};

const SIZE = {
  sm: { wrap: 'h-5 w-5 text-[10px]', text: 'text-[11px]' },
  md: { wrap: 'h-6 w-6 text-[12px]', text: 'text-[13px]' },
  lg: { wrap: 'h-9 w-9 text-[16px]', text: 'text-[15px]' },
};

export default function MarketBadge({ market, size = 'sm', className }: MarketBadgeProps) {
  const colors = MARKET_COLORS[market];
  const s = SIZE[size];
  return (
    <span
      data-testid="market-badge"
      data-market={market}
      className={cn('inline-flex items-center gap-1.5 font-semibold text-textPrimary', className)}
      title={`${MARKETS[market].name} (${market}-PERP)`}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full font-bold',
          s.wrap,
          colors.bg,
          colors.text
        )}
        aria-hidden
      >
        {colors.letter}
      </span>
      <span className={s.text}>{market}</span>
    </span>
  );
}
