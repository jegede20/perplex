'use client';

import type { BehaviorTag, WalletProfile } from '@/lib/types';
import MarketBadge from '@/components/ui/MarketBadge';
import BehaviorTags from '@/components/wallet/BehaviorTags';

export interface CompareTradeStyleProps {
  walletA: WalletProfile;
  walletB: WalletProfile;
}

function StyleColumn({
  wallet,
  side,
  sharedTags,
}: {
  wallet: WalletProfile;
  side: 'A' | 'B';
  sharedTags: readonly BehaviorTag[];
}) {
  return (
    <div className="flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-textMuted">
        Trading Style · Wallet {side}
      </p>
      <div className="mt-3">
        <BehaviorTags tags={wallet.behaviorTags} sharedTags={sharedTags} />
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-textMuted">
        Primary Markets
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {wallet.primaryMarkets.map((market) => (
          <MarketBadge key={market} market={market} size="sm" />
        ))}
        {wallet.primaryMarkets.length === 0 && (
          <p className="text-[11px] text-textMuted">No dominant markets yet.</p>
        )}
      </div>
    </div>
  );
}

/**
 * Behavior tags side by side. Tags present on BOTH wallets get a
 * purple ring + "Both" badge so shared trading DNA is obvious.
 */
export default function CompareTradeStyle({ walletA, walletB }: CompareTradeStyleProps) {
  const sharedTags = walletA.behaviorTags.filter((tag) =>
    walletB.behaviorTags.includes(tag)
  );

  return (
    <div className="card-surface p-5">
      <h3 className="text-[15px] font-semibold text-textPrimary">Trading Style</h3>
      <p className="mt-0.5 text-[12px] text-textMuted">
        Auto-generated behavior profiles · shared tags are highlighted
      </p>
      <div className="mt-5 flex flex-col gap-6 md:flex-row md:gap-8">
        <StyleColumn wallet={walletA} side="A" sharedTags={sharedTags} />
        <div className="hidden w-px bg-border md:block" aria-hidden />
        <div className="h-px w-full bg-border md:hidden" aria-hidden />
        <StyleColumn wallet={walletB} side="B" sharedTags={sharedTags} />
      </div>
    </div>
  );
}
