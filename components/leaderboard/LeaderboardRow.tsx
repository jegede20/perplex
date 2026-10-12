'use client';

import { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, ExternalLink } from 'lucide-react';
import type { WalletSummary } from '@/lib/types';
import TierBadge from '@/components/ui/TierBadge';
import ScoreBar from '@/components/ui/ScoreBar';
import PnLTag from '@/components/ui/PnLTag';
import {
  formatLeverage,
  formatPercent,
  formatTimeAgo,
  getMonadScanAddressUrl,
} from '@/lib/utils/format';

export interface LeaderboardRowProps {
  wallet: WalletSummary;
  rank: number;
  onCopy?: (address: string) => void;
}

/** Single leaderboard row: rank, wallet links, tier, score, win rate, PnL. */
function LeaderboardRow({ wallet, rank, onCopy }: LeaderboardRowProps) {
  const router = useRouter();

  const handleRowClick = useCallback(() => {
    router.push(`/app/wallet/${wallet.address}`);
  }, [router, wallet.address]);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onCopy) {
        onCopy(wallet.address);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(wallet.address);
      }
    },
    [onCopy, wallet.address]
  );

  return (
    <tr
      tabIndex={0}
      role="link"
      aria-label={`Open wallet ${wallet.shortAddress} profile`}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowClick();
        }
      }}
      className="group cursor-pointer border-b border-border transition-colors duration-150 last:border-b-0 hover:bg-surface2"
    >
      <td className="tabular px-4 py-3 text-[13px] font-bold text-textMuted">
        #{rank}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="tabular text-[13px] font-medium text-textPrimary">{wallet.shortAddress}</span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy address ${wallet.shortAddress}`}
            className="text-textMuted transition-colors duration-150 hover:text-primary"
          >
            <Copy size={11} aria-hidden />
          </button>
          <a
            href={getMonadScanAddressUrl(wallet.address)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${wallet.shortAddress} on MonadScan (opens in a new tab)`}
            onClick={(e) => e.stopPropagation()}
            className="text-textMuted transition-colors duration-150 hover:text-primary"
          >
            <ExternalLink size={11} aria-hidden />
          </a>
        </div>
      </td>
      <td className="px-3 py-3"><TierBadge tier={wallet.tier} /></td>
      <td className="w-[120px] px-3 py-3"><ScoreBar score={wallet.smartMoneyScore} /></td>
      <td className="tabular px-3 py-3">
        <span className={wallet.winRate >= 55 ? 'font-semibold text-success' : wallet.winRate >= 45 ? 'text-warning' : 'text-danger'}>
          {formatPercent(wallet.winRate / 100)}
        </span>
      </td>
      <td className="px-3 py-3"><PnLTag value={wallet.realizedPnl} compact /></td>
      <td className="tabular px-3 py-3 text-textSecondary">{formatLeverage(wallet.avgLeverage)}</td>
      <td className="px-3 py-3 text-[11px] text-textMuted">{formatTimeAgo(wallet.lastActive)}</td>
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/app/compare?a=${wallet.address}`);
          }}
          aria-label={`Compare ${wallet.shortAddress} with another wallet`}
          className="rounded-md border border-border px-2.5 py-1 text-[10px] font-semibold text-textMuted opacity-0 transition-all duration-150 hover:border-primary/50 hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
        >
          Compare with…
        </button>
      </td>
    </tr>
  );
}

export default memo(LeaderboardRow);
