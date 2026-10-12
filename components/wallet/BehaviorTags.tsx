import type { BehaviorTag } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

export interface BehaviorTagsProps {
  tags: BehaviorTag[];
  className?: string;
  /** Tags present on BOTH compared wallets — purple ring + "Both" badge. */
  sharedTags?: readonly BehaviorTag[];
}

const TAG_CONFIG: Record<BehaviorTag, { label: string; className: string }> = {
  HIGH_LEVERAGE: { label: 'High Leverage', className: 'bg-warning/15 text-warning border-warning/40' },
  SCALPER: { label: 'Scalper', className: 'bg-sky-500/15 text-sky-400 border-sky-500/40' },
  SWING_TRADER: { label: 'Swing Trader', className: 'bg-teal-500/15 text-teal-400 border-teal-500/40' },
  DIAMOND_HANDS: { label: 'Diamond Hands', className: 'bg-primary/15 text-primary border-primary/40' },
  BTC_MAXI: { label: 'BTC Maxi', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40' },
  CONTRARIAN: { label: 'Contrarian', className: 'bg-purple-500/15 text-purple-400 border-purple-500/40' },
  CONSISTENT: { label: 'Consistent', className: 'bg-success/15 text-success border-success/40' },
  HIGH_VOLUME: { label: 'High Volume', className: 'bg-primary/15 text-primary border-primary/40' },
  RISK_TAKER: { label: 'Risk Taker', className: 'bg-danger/15 text-danger border-danger/40' },
  LOSS_CUTTER: { label: 'Loss Cutter', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' },
};

/** Auto-generated behavior tag pills. */
export default function BehaviorTags({ tags, className, sharedTags }: BehaviorTagsProps) {
  const shared = new Set<BehaviorTag>(sharedTags ?? []);
  if (tags.length === 0) {
    return <p className="text-[11px] text-textMuted">No distinctive behaviors detected yet.</p>;
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {tags.map((tag) => {
        const config = TAG_CONFIG[tag];
        const isShared = shared.has(tag);
        return (
          <span
            key={tag}
            data-tag={tag}
            data-shared={isShared ? 'true' : undefined}
            title={tag.replace(/_/g, ' ').toLowerCase()}
            className={cn(
              'relative rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              config.className,
              isShared && 'border-primary ring-1 ring-primary/60'
            )}
          >
            {config.label}
            {isShared && (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-primary px-1 py-[1px] text-[7px] font-bold uppercase leading-none text-white">
                Both
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
