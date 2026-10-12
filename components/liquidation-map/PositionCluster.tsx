'use client';

import type { LiquidationCluster, LiquidationMapData } from '@/lib/types';
import { formatPercent, formatUSD } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface PositionClusterProps {
  data: LiquidationMapData;
  selectedBucket?: number | null;
  onSelect: (priceBucket: number) => void;
}

function heatColor(intensity: number): string {
  if (intensity <= 33) return 'bg-success';
  if (intensity <= 66) return 'bg-warning';
  return 'bg-danger';
}

function ClusterRow({
  cluster,
  markPrice,
  selected,
  onSelect,
}: {
  cluster: LiquidationCluster;
  markPrice: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const distance =
    markPrice > 0 ? ((cluster.priceLevel - markPrice) / markPrice) * 100 : 0;
  const isBelow = distance <= 0;

  return (
    <tr
      onClick={onSelect}
      className={cn(
        'cursor-pointer transition-colors duration-150',
        selected ? 'bg-primary/15' : 'hover:bg-surface2'
      )}
      data-testid="cluster-row"
    >
      <td className="tabular px-3 py-2.5 text-[12px] font-semibold text-textPrimary">
        ${cluster.priceLevel.toLocaleString()}
      </td>
      <td
        className={cn(
          'px-3 py-2.5 text-[11px] font-medium',
          Math.abs(distance) < 5 ? 'text-warning' : 'text-textSecondary'
        )}
      >
        <span className={isBelow ? 'text-success' : 'text-danger'}>
          {isBelow ? '↓' : '↑'} {formatPercent(Math.abs(distance))}
        </span>{' '}
        <span className="text-textMuted">from mark</span>
      </td>
      <td className="tabular px-3 py-2.5 text-[11px] text-success">
        {cluster.longCount > 0 ? formatUSD(cluster.longVolume) : '—'}
      </td>
      <td className="tabular px-3 py-2.5 text-[11px] text-danger">
        {cluster.shortCount > 0 ? formatUSD(cluster.shortVolume) : '—'}
      </td>
      <td className="tabular px-3 py-2.5 text-[12px] font-bold text-textPrimary">
        {formatUSD(cluster.totalVolume)}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-surface2">
            <div
              className={cn('h-full rounded-full', heatColor(cluster.intensity))}
              style={{ width: `${cluster.intensity}%` }}
            />
          </div>
          <span className="tabular text-[10px] text-textMuted">{cluster.intensity}%</span>
        </div>
      </td>
    </tr>
  );
}

/**
 * Largest liquidation clusters, sorted by volume at risk.
 * Click a row to highlight the matching bar in the heatmap.
 * Full table on desktop · compact top-3 cards on mobile.
 */
export default function PositionCluster({ data, selectedBucket, onSelect }: PositionClusterProps) {
  const top = [...data.clusters]
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 10);
  const top3 = top.slice(0, 3);

  return (
    <div className="card-surface p-5">
      <h3 className="text-[15px] font-semibold text-textPrimary">
        Largest Liquidation Clusters
      </h3>
      <p className="mt-0.5 text-[12px] text-textMuted">Sorted by volume at risk</p>

      {/* desktop table */}
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-textMuted">
              <th className="px-3 py-2 font-semibold">Price Level</th>
              <th className="px-3 py-2 font-semibold">Distance</th>
              <th className="px-3 py-2 font-semibold">Long Vol</th>
              <th className="px-3 py-2 font-semibold">Short Vol</th>
              <th className="px-3 py-2 font-semibold">Total</th>
              <th className="px-3 py-2 font-semibold">Intensity</th>
            </tr>
          </thead>
          <tbody>
            {top.map((cluster) => (
              <ClusterRow
                key={cluster.priceBucket}
                cluster={cluster}
                markPrice={data.markPrice}
                selected={selectedBucket === cluster.priceBucket}
                onSelect={() => onSelect(cluster.priceBucket)}
              />
            ))}
            {top.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[12px] text-textMuted">
                  No liquidation clusters within ±30% of mark price.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* mobile: top 3 summary */}
      <div className="mt-4 space-y-2 md:hidden">
        {top3.map((cluster) => {
          const distance =
            data.markPrice > 0
              ? ((cluster.priceLevel - data.markPrice) / data.markPrice) * 100
              : 0;
          return (
            <button
              key={cluster.priceBucket}
              type="button"
              onClick={() => onSelect(cluster.priceBucket)}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-colors duration-150',
                selectedBucket === cluster.priceBucket
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border bg-surface2'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="tabular text-[13px] font-semibold text-textPrimary">
                  ${cluster.priceLevel.toLocaleString()}
                </span>
                <span className="tabular text-[12px] font-bold text-textPrimary">
                  {formatUSD(cluster.totalVolume)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className={distance <= 0 ? 'text-success' : 'text-danger'}>
                  {distance <= 0 ? '↓' : '↑'} {formatPercent(Math.abs(distance))} from mark
                </span>
                <span className="text-textMuted">
                  L {formatUSD(cluster.longVolume)} · S {formatUSD(cluster.shortVolume)}
                </span>
              </div>
            </button>
          );
        })}
        {top3.length === 0 && (
          <p className="py-4 text-center text-[12px] text-textMuted">
            No liquidation clusters within ±30% of mark price.
          </p>
        )}
      </div>
    </div>
  );
}
