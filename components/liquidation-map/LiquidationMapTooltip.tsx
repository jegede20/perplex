'use client';

import type { LiquidationCluster } from '@/lib/types';
import { formatPercent, formatUSD } from '@/lib/utils/format';

export interface LiquidationMapTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: LiquidationCluster }>;
  markPrice: number;
}

/**
 * Custom Recharts tooltip for the liquidation map heatmap.
 * Shows both sides of the cluster at the hovered price level.
 */
export default function LiquidationMapTooltip({
  active,
  payload,
  markPrice,
}: LiquidationMapTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const cluster = payload[0]?.payload;
  if (!cluster) return null;

  const distance =
    markPrice > 0 ? ((cluster.priceLevel - markPrice) / markPrice) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-xl">
      <p className="text-[12px] font-semibold text-textPrimary">
        Price Level: <span className="tabular">${cluster.priceLevel.toLocaleString()}</span>
      </p>
      <div className="my-2 border-t border-border" />
      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between gap-6">
          <span className="text-success">🟢 Long Volume</span>
          <span className="tabular font-semibold text-textPrimary">
            {formatUSD(cluster.longVolume)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 text-textMuted">
          <span>Positions</span>
          <span className="tabular">{cluster.longCount}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-danger">🔴 Short Volume</span>
          <span className="tabular font-semibold text-textPrimary">
            {formatUSD(cluster.shortVolume)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 text-textMuted">
          <span>Positions</span>
          <span className="tabular">{cluster.shortCount}</span>
        </div>
      </div>
      <div className="my-2 border-t border-border" />
      <div className="flex items-center justify-between gap-6 text-[11px]">
        <span className="text-textSecondary">Total at Risk</span>
        <span className="tabular font-bold text-textPrimary">{formatUSD(cluster.totalVolume)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-6 text-[11px]">
        <span className="text-textSecondary">Distance from Mark</span>
        <span className={`tabular font-semibold ${distance <= 0 ? 'text-success' : 'text-danger'}`}>
          {formatPercent(distance)}
        </span>
      </div>
    </div>
  );
}
