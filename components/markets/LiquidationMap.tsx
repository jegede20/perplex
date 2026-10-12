'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Market, PositionRisk } from '@/lib/types';
import { clusterLiquidationLevels } from '@/lib/protocol/liquidations';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { formatUSD } from '@/lib/utils/format';

export interface LiquidationMapProps {
  positions: PositionRisk[];
  markPrice: number;
  loading?: boolean;
  market?: Market;
}

/**
 * Liquidation map — positions clustered by liquidation price.
 * X-axis: price levels · Y-axis: total size at that level.
 * Green = longs liquidate below, red = shorts liquidate above.
 */
export default function LiquidationMap({ positions, markPrice, loading, market }: LiquidationMapProps) {
  const buckets = useMemo(() => clusterLiquidationLevels(positions, 1), [positions]);

  if (loading) return <LoadingSkeleton variant="chart" />;

  if (buckets.length === 0 || markPrice <= 0) {
    return (
      <div className="card-surface flex flex-col items-center justify-center gap-1 p-8 text-center">
        <p className="text-[13px] text-textSecondary">No liquidation clusters</p>
        <p className="text-[11px] text-textMuted">No open positions are near liquidation right now.</p>
      </div>
    );
  }

  const maxSize = Math.max(...buckets.map((b) => Math.max(b.longSize, b.shortSize)), 1);
  const prices = buckets.map((b) => b.price);
  const minPrice = Math.min(...prices, markPrice * 0.94);
  const maxPrice = Math.max(...prices, markPrice * 1.06);
  const span = maxPrice - minPrice || 1;
  const markPos = ((markPrice - minPrice) / span) * 100;

  return (
    <div className="card-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
          Liquidation Map
        </h3>
        {market && (
          <Link
            href={`/app/liquidation-map?market=${market}`}
            className="text-[11px] font-medium text-primary transition-colors duration-150 hover:text-white"
          >
            View Full Liquidation Map →
          </Link>
        )}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-success"><span className="h-2 w-2 rounded-sm bg-success" aria-hidden /> Long liq</span>
          <span className="flex items-center gap-1 text-danger"><span className="h-2 w-2 rounded-sm bg-danger" aria-hidden /> Short liq</span>
        </div>
      </div>

      <div className="relative h-[210px] w-full border-b border-l border-border">
        {/* Current mark price line */}
        <div
          className="absolute inset-y-0 z-10 border-l-2 border-dashed border-primary"
          style={{ left: `${Math.min(Math.max(markPos, 2), 98)}%` }}
          title={`Mark price: ${formatUSD(markPrice, false)}`}
        >
          <span className="absolute -top-1 left-1 whitespace-nowrap rounded bg-primary/20 px-1 text-[9px] font-semibold text-primary">
            MARK
          </span>
        </div>

        {buckets.map((bucket) => {
          const x = ((bucket.price - minPrice) / span) * 100;
          const longH = (bucket.longSize / maxSize) * 88;
          const shortH = (bucket.shortSize / maxSize) * 88;
          return (
            <div
              key={bucket.price}
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: `${Math.min(Math.max(x, 2), 96)}%`, transform: 'translateX(-50%)' }}
              title={`${formatUSD(bucket.longSize + bucket.shortSize, false)} at ${formatUSD(bucket.price, false)} · ${bucket.count} positions`}
            >
              {shortH > 0 && (
                <div className="w-2 rounded-t-sm bg-danger/80" style={{ height: `${shortH}%` }} />
              )}
              {longH > 0 && (
                <div className="w-2 rounded-b-sm bg-success/80" style={{ height: `${longH}%` }} />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex justify-between text-[9px] text-textMuted">
        <span>{formatUSD(minPrice, false)}</span>
        <span>liquidation price →</span>
        <span>{formatUSD(maxPrice, false)}</span>
      </div>
    </div>
  );
}
