'use client';

import { useCallback, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import type { WalletProfile } from '@/lib/types';
import TierBadge from '@/components/ui/TierBadge';
import ScoreBar from '@/components/ui/ScoreBar';
import BehaviorTags from '@/components/wallet/BehaviorTags';
import MarketBadge from '@/components/ui/MarketBadge';
import MetricRow from '@/components/ui/MetricRow';
import {
  formatDuration,
  formatLeverage,
  formatPercent,
  formatPnL,
  formatTimeAgo,
  formatUSD,
  getMonadScanAddressUrl,
} from '@/lib/utils/format';

export interface WalletIdentityProps {
  wallet: WalletProfile;
  percentile?: number;
}

/** Left-column identity card: tier, score, stats grid, behavior profile. */
export default function WalletIdentity({ wallet, percentile = 8 }: WalletIdentityProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(wallet.address).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      });
    }
  }, [wallet.address]);

  return (
    <div className="card-surface p-5">
      {/* Tier + address */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <TierBadge tier={wallet.tier} size="md" />
        <div className="flex items-center gap-1.5">
          <span className="tabular text-[12px] text-textSecondary">{wallet.shortAddress}</span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Address copied' : 'Copy wallet address'}
            className="flex h-6 w-6 items-center justify-center rounded-md text-textMuted transition-colors duration-150 hover:bg-surface2 hover:text-primary"
          >
            {copied ? <Check size={12} className="text-success" aria-hidden /> : <Copy size={12} aria-hidden />}
          </button>
          <a
            href={getMonadScanAddressUrl(wallet.address)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on MonadScan (opens in a new tab)"
            className="flex h-6 w-6 items-center justify-center rounded-md text-textMuted transition-colors duration-150 hover:bg-surface2 hover:text-primary"
          >
            <ExternalLink size={12} aria-hidden />
          </a>
        </div>
      </div>

      {/* Smart money score */}
      <div className="mb-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-textSecondary">
          Smart Money Score
        </div>
        <div className="mb-1.5 flex items-end gap-2">
          <span className="text-[32px] font-bold leading-none text-primary">{wallet.smartMoneyScore}</span>
          <span className="pb-1 text-[11px] text-textMuted">/ 100</span>
        </div>
        <ScoreBar score={wallet.smartMoneyScore} showValue={false} height="md" />
        <p className="mt-1.5 text-[11px] text-textMuted">
          Top {percentile}% of all tracked wallets
        </p>
      </div>

      {/* Stats grid (2 col) */}
      <div className="mb-4 divide-y divide-border border-y border-border">
        <div className="grid grid-cols-2 gap-x-4">
          <MetricRow
            label="Win Rate"
            value={formatPercent(wallet.winRate / 100)}
            valueClassName={wallet.winRate >= 55 ? 'text-success' : 'text-danger'}
            tooltip={`${wallet.winCount} wins · ${wallet.lossCount} losses`}
          />
          <MetricRow
            label="Realized PnL"
            value={formatPnL(wallet.realizedPnl)}
            valueClassName={wallet.realizedPnl >= 0 ? 'text-success' : 'text-danger'}
            tooltip="Net profit from closed positions"
          />
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <MetricRow
            label="Unrealized"
            value={formatPnL(wallet.unrealizedPnl)}
            valueClassName={wallet.unrealizedPnl >= 0 ? 'text-success' : 'text-danger'}
            tooltip="Mark-to-market PnL on open positions"
          />
          <MetricRow label="Total Volume" value={formatUSD(wallet.totalVolume)} tooltip="Lifetime traded notional" />
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <MetricRow label="Avg Lev" value={formatLeverage(wallet.avgLeverage)} tooltip="Average leverage across trades" />
          <MetricRow label="Max Leverage" value={formatLeverage(wallet.maxLeverage)} tooltip="Highest leverage ever used" />
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <MetricRow label="# Trades" value={String(wallet.totalTrades)} tooltip="Total closed + open trades" />
          <MetricRow
            label="Profit Factor"
            value={wallet.profitFactor.toFixed(2)}
            valueClassName={wallet.profitFactor >= 1.5 ? 'text-success' : wallet.profitFactor >= 1 ? 'text-warning' : 'text-danger'}
            tooltip="Gross profit ÷ gross loss — above 1.5 is strong"
          />
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <MetricRow label="Active Since" value={formatTimeAgo(wallet.firstSeen)} tooltip={`First seen ${wallet.firstSeen.slice(0, 10)}`} />
          <MetricRow label="Last Active" value={formatTimeAgo(wallet.lastActive)} tooltip={`Last trade ${wallet.lastActive.slice(0, 10)}`} />
        </div>
      </div>

      {/* Behavior profile */}
      <div className="mb-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-textSecondary">
          Behavior Profile
        </div>
        <BehaviorTags tags={wallet.behaviorTags} />
      </div>

      {/* Primary markets */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-textSecondary">
          Primary Markets
        </div>
        <div className="flex flex-wrap gap-2">
          {wallet.primaryMarkets.map((market) => (
            <span
              key={market}
              className="rounded-lg border border-border bg-surface2 px-2.5 py-1"
            >
              <MarketBadge market={market} />
            </span>
          ))}
        </div>
      </div>

      {/* Hold-time meta */}
      <div className="mt-4 border-t border-border pt-3 text-[10px] text-textMuted">
        Avg hold: {formatDuration(wallet.avgHoldSeconds)} · Longest win streak: {wallet.longestWinStreak} trades
      </div>
    </div>
  );
}
