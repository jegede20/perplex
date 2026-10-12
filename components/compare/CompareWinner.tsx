'use client';

import type { ComparisonWinner, WalletProfile } from '@/lib/types';
import { formatAddress } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface CompareWinnerBannerProps {
  winner: ComparisonWinner;
  walletA: WalletProfile;
  walletB: WalletProfile;
}

/**
 * Verdict banner — who won the head-to-head, by how much, and why.
 */
export default function CompareWinner({ winner, walletA, walletB }: CompareWinnerBannerProps) {
  const isTie = winner.winner === 'TIE';
  const winningWallet = winner.winner === 'A' ? walletA : walletB;

  return (
    <div
      className={cn(
        'rounded-2xl border bg-surface p-6',
        isTie
          ? 'border-primary/50'
          : winner.winner === 'A'
            ? 'border-success/50 shadow-[0_0_24px_rgba(34,197,94,0.12)]'
            : 'border-success/50 shadow-[0_0_24px_rgba(34,197,94,0.12)]'
      )}
      data-testid="compare-winner"
      data-winner={winner.winner}
    >
      {isTie ? (
        <>
          <p className="text-[18px] font-bold text-textPrimary">
            🤝 Too Close To Call · {winner.metricsWon} wins each
          </p>
          <p className="mt-1 text-[13px] text-textSecondary">{winner.verdict}</p>
        </>
      ) : (
        <>
          <p className="text-[18px] font-bold text-textPrimary">
            🏆 Wallet {winner.winner} Wins · {winner.metricsWon} of 10 metrics
          </p>
          <p className="mt-1 text-[13px] text-textSecondary">
            <span className="font-mono text-primary">{formatAddress(winningWallet.address)}</span>{' '}
            outperforms across most metrics
          </p>
          <p className="mt-1 text-[12px] text-textMuted">
            Key advantage: <span className="text-textSecondary">{winner.keyAdvantage}</span>
          </p>
        </>
      )}
    </div>
  );
}
