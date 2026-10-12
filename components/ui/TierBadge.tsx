import type { WalletTier } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

export interface TierBadgeProps {
  tier: WalletTier;
  size?: 'sm' | 'md';
  className?: string;
}

const TIER_CONFIG: Record<WalletTier, { emoji: string; label: string; className: string }> = {
  WHALE: {
    emoji: '🐋',
    label: 'WHALE',
    className: 'border-primary/60 bg-primary/15 text-primary',
  },
  SHARK: {
    emoji: '🦈',
    label: 'SHARK',
    className: 'border-warning/50 bg-warning/15 text-warning',
  },
  FISH: {
    emoji: '🐟',
    label: 'FISH',
    className: 'border-border bg-surface2 text-textSecondary',
  },
};

export default function TierBadge({ tier, size = 'sm', className }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  return (
    <span
      data-testid="tier-badge"
      data-tier={tier}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        config.className,
        className
      )}
    >
      <span aria-hidden>{config.emoji}</span>
      {config.label}
    </span>
  );
}
