'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy } from 'lucide-react';
import type { WalletSummary } from '@/lib/types';
import LeaderboardRow from '@/components/leaderboard/LeaderboardRow';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { LEADERBOARD_PAGE_SIZE } from '@/lib/utils/constants';

export interface LeaderboardProps {
  wallets?: WalletSummary[] | null;
  loading?: boolean;
  limit?: number;
  showHeader?: boolean;
  showViewAll?: boolean;
  onCopyAddress?: (address: string) => void;
}

/** Smart money ranked table — reusable on home (top 10) and /wallet. */
export default function Leaderboard({
  wallets: walletsProp,
  loading: loadingProp,
  limit = 10,
  showHeader = true,
  showViewAll = true,
  onCopyAddress,
}: LeaderboardProps) {
  const router = useRouter();
  const [wallets, setWallets] = useState<WalletSummary[]>(walletsProp ?? []);
  const [loading, setLoading] = useState<boolean>(loadingProp ?? walletsProp === undefined);

  useEffect(() => {
    if (walletsProp) {
      setWallets(walletsProp);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/wallets?limit=${limit}&sortBy=smart_money_score`);
        const data = (await res.json()) as { wallets?: WalletSummary[] };
        if (!cancelled && data.wallets) setWallets(data.wallets);
      } catch (error) {
        console.error('[Leaderboard]', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [walletsProp, limit]);

  const handleCopy = useCallback(
    (address: string) => {
      if (onCopyAddress) {
        onCopyAddress(address);
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(address);
      }
    },
    [onCopyAddress]
  );

  return (
    <div className="card-surface overflow-x-auto">
      {showHeader && (
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
            <Trophy size={14} className="text-primary" aria-hidden /> Smart Money Leaderboard
          </h3>
          {showViewAll && (
            <button
              type="button"
              onClick={() => router.push('/app/wallet')}
              className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors duration-150 hover:border-primary"
            >
              View Full Leaderboard →
            </button>
          )}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton variant="table" rows={limit > 10 ? 10 : limit} />
      ) : wallets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 p-10 text-center">
          <p className="text-[13px] text-textSecondary">No scored wallets yet</p>
          <p className="text-[11px] text-textMuted">Scores appear after the first trades are indexed.</p>
        </div>
      ) : (
        <table className="w-full min-w-[820px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-textMuted">
              <th scope="col" className="px-4 py-2.5 font-semibold"># Rank</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Wallet</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Tier</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Score</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Win Rate</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Realized PnL</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Avg Lev</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Last Active</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold"><span className="sr-only">Compare</span></th>
            </tr>
          </thead>
          <tbody>
            {wallets.slice(0, limit).map((wallet, index) => (
              <LeaderboardRow
                key={wallet.address}
                wallet={wallet}
                rank={index + 1}
                onCopy={handleCopy}
              />
            ))}
          </tbody>
        </table>
      )}

      {!loading && wallets.length > 0 && (
        <div className="px-4 py-2.5 text-[10px] text-textMuted">
          Showing top {Math.min(limit, wallets.length)} of {LEADERBOARD_PAGE_SIZE * 20}+ tracked wallets
        </div>
      )}
    </div>
  );
}
