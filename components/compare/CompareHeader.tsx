'use client';

import { Copy, ExternalLink } from 'lucide-react';
import type { WalletProfile } from '@/lib/types';
import TierBadge from '@/components/ui/TierBadge';
import ScoreBar from '@/components/ui/ScoreBar';
import MetricRow from '@/components/ui/MetricRow';
import {
  formatAddress,
  formatPercent,
  formatPnL,
  formatUSD,
  getMonadScanAddressUrl,
} from '@/lib/utils/format';

export interface CompareHeaderProps {
  walletA: WalletProfile;
  walletB: WalletProfile;
}

function WalletPanel({ wallet, side }: { wallet: WalletProfile; side: 'A' | 'B' }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TierBadge tier={wallet.tier} size="md" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-textMuted">
            Wallet {side}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(wallet.address)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-textMuted transition-colors duration-150 hover:text-primary"
            aria-label="Copy address"
          >
            <Copy size={12} aria-hidden />
          </button>
          <a
            href={getMonadScanAddressUrl(wallet.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-7 items-center gap-1 rounded-lg border border-border px-2 text-[10px] text-textMuted transition-colors duration-150 hover:text-primary"
          >
            MonadScan <ExternalLink size={10} aria-hidden />
          </a>
        </div>
      </div>

      <p className="mt-3 font-mono text-[15px] font-semibold text-textPrimary">
        {formatAddress(wallet.address)}
      </p>

      <div className="mt-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-textMuted">
          Smart Money Score
        </p>
        <ScoreBar score={wallet.smartMoneyScore} height="md" />
      </div>

      <div className="mt-4 space-y-2">
        <MetricRow label="Win Rate" value={formatPercent(wallet.winRate / 100)} valueClassName="text-success" />
        <MetricRow
          label="Realized PnL"
          value={formatPnL(wallet.realizedPnl)}
          valueClassName={wallet.realizedPnl >= 0 ? 'text-success' : 'text-danger'}
        />
        <MetricRow label="Total Volume" value={formatUSD(wallet.totalVolume)} />
        <MetricRow
          label="Active Since"
          value={new Date(wallet.firstSeen).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        />
      </div>
    </div>
  );
}

/**
 * Side-by-side wallet identity panels divided by a VS badge.
 */
export default function CompareHeader({ walletA, walletB }: CompareHeaderProps) {
  return (
    <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-stretch">
      <WalletPanel wallet={walletA} side="A" />
      <div className="flex shrink-0 items-center justify-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/50 bg-primary/15 text-[13px] font-black text-primary">
          VS
        </div>
      </div>
      <WalletPanel wallet={walletB} side="B" />
    </div>
  );
}
