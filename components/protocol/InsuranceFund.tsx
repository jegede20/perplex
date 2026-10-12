'use client';

import { Lock, TrendingUp, TrendingDown } from 'lucide-react';
import type { ProtocolStats as ProtocolStatsType } from '@/lib/types';
import MetricRow from '@/components/ui/MetricRow';
import { formatPnL, formatUSD } from '@/lib/utils/format';

export interface InsuranceFundProps {
  stats: ProtocolStatsType | null;
}

/**
 * Insurance fund health widget — balance, 24h change, coverage ratio
 * vs 24h liquidation volume.
 */
export default function InsuranceFund({ stats }: InsuranceFundProps) {
  if (!stats) return null;

  const growing = stats.insuranceFundChange24h >= 0;
  const coverageRatio =
    stats.liquidationVolume24h > 0
      ? stats.insuranceFundBalance / stats.liquidationVolume24h
      : 4.2;

  return (
    <div className="card-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
          <Lock size={14} className="text-primary" aria-hidden /> Insurance Fund
        </h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            growing ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
          }`}
        >
          {growing ? <TrendingUp size={11} aria-hidden /> : <TrendingDown size={11} aria-hidden />}
          {growing ? 'Growing' : 'Shrinking'}
        </span>
      </div>

      <div className="mb-1 text-[28px] font-bold leading-tight text-textPrimary">
        {formatUSD(stats.insuranceFundBalance)}
      </div>
      <div
        className={`mb-3 text-[12px] font-medium ${growing ? 'text-success' : 'text-danger'}`}
      >
        {growing ? '+' : ''}
        {formatPnL(stats.insuranceFundChange24h)} (24h)
      </div>

      <div className="divide-y divide-border border-t border-border">
        <MetricRow
          label="Liquidations (24h)"
          value={formatUSD(stats.liquidationVolume24h)}
          tooltip="Total value liquidated in the last 24 hours"
        />
        <MetricRow
          label="Coverage ratio"
          value={`${coverageRatio.toFixed(1)}x`}
          valueClassName={coverageRatio >= 1 ? 'text-success' : 'text-warning'}
          tooltip="Insurance fund balance ÷ 24h liquidation volume"
        />
        <MetricRow
          label="Backstop status"
          value={coverageRatio >= 1 ? 'Healthy' : 'Watch'}
          valueClassName={coverageRatio >= 1 ? 'text-success' : 'text-warning'}
          tooltip="Healthy = fund covers recent liquidation volume"
        />
      </div>
    </div>
  );
}
