import { cn } from '@/lib/utils/cn';

export interface DemoDataBadgeProps {
  className?: string;
}

/**
 * Marks surfaces that are showing the deterministic seeded dataset
 * (synthetic wallets, trades and tx hashes). Hidden automatically once
 * responses carry live Perpl/indexed rows (dataSource === 'live').
 */
export default function DemoDataBadge({ className }: DemoDataBadgeProps) {
  return (
    <span
      data-testid="demo-data-badge"
      title="Seeded demo dataset — synthetic wallets, trades and tx hashes (they will not resolve on a Monad explorer by design). Replaced automatically when live Perpl feeds or the indexer provide rows."
      className={cn(
        'inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning',
        className
      )}
    >
      Demo data
    </span>
  );
}
