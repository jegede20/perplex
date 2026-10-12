'use client';

import StatCard from '@/components/ui/StatCard';
import type { LiquidationMapData } from '@/lib/types';
import { formatPercent, formatUSD } from '@/lib/utils/format';

export interface LiquidationMapStatsProps {
  data: LiquidationMapData;
}

function distanceFromMark(price: number, markPrice: number): number {
  if (markPrice <= 0 || price <= 0) return 0;
  return ((price - markPrice) / markPrice) * 100;
}

/**
 * Four summary cards above the liquidation heatmap:
 * total longs/shorts at risk and the nearest liquidation on each side.
 */
export default function LiquidationMapStats({ data }: LiquidationMapStatsProps) {
  const longDist = Math.abs(distanceFromMark(data.nearestLongLiq, data.markPrice));
  const shortDist = Math.abs(distanceFromMark(data.nearestShortLiq, data.markPrice));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Longs at Risk"
        value={formatUSD(data.totalLongAtRisk)}
        subValue="within ±30% of mark price"
        highlight="LONG"
      />
      <StatCard
        label="Total Shorts at Risk"
        value={formatUSD(data.totalShortAtRisk)}
        subValue="within ±30% of mark price"
        highlight="SHORT"
      />
      <StatCard
        label="Nearest Long Liquidation"
        value={`${formatUSD(data.nearestLongLiq)} ↓`}
        subValue={`${formatPercent(longDist)} from mark`}
        highlight={longDist < 5 ? 'WARNING' : 'LONG'}
      />
      <StatCard
        label="Nearest Short Liquidation"
        value={`${formatUSD(data.nearestShortLiq)} ↑`}
        subValue={`${formatPercent(shortDist)} from mark`}
        highlight={shortDist < 5 ? 'WARNING' : 'SHORT'}
      />
    </div>
  );
}
