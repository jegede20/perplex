'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { OpenPosition } from '@/lib/types';
import MarketBadge from '@/components/ui/MarketBadge';
import PnLTag from '@/components/ui/PnLTag';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import {
  formatDuration,
  formatLeverage,
  formatPrice,
  formatUSD,
} from '@/lib/utils/format';
import { POSITIONS_REFRESH_INTERVAL } from '@/lib/utils/constants';

export interface OpenPositionsProps {
  positions: OpenPosition[];
  walletAddress: string;
  loading?: boolean;
  emptyState?: ReactNode;
  refreshable?: boolean;
}

/**
 * Live open positions table — uPnL, liq price, distance, margin bar.
 * Refreshes every 30s from contract reads (getPosition per market).
 */
export default function OpenPositions({
  positions: positionsProp,
  walletAddress,
  loading: loadingProp,
  emptyState,
  refreshable = true,
}: OpenPositionsProps) {
  const [positions, setPositions] = useState<OpenPosition[]>(positionsProp);
  const [loading, setLoading] = useState<boolean>(loadingProp ?? false);

  useEffect(() => {
    setPositions(positionsProp);
  }, [positionsProp]);

  useEffect(() => {
    if (!refreshable) return;
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/wallet/${walletAddress}`);
        const data = (await res.json()) as { wallet?: { openPositions?: OpenPosition[] } };
        if (!cancelled && data.wallet?.openPositions) {
          setPositions(data.wallet.openPositions);
        }
      } catch (error) {
        console.error('[OpenPositions]', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const timer = setInterval(() => void load(), POSITIONS_REFRESH_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [walletAddress, refreshable]);

  if (loading) return <LoadingSkeleton variant="table" rows={3} />;

  if (positions.length === 0) {
    return (
      <div className="card-surface flex flex-col items-center justify-center gap-2 p-10 text-center">
        {emptyState ?? (
          <>
            <p className="text-[13px] text-textSecondary">No open positions</p>
            <p className="text-[11px] text-textMuted">Wallet holds no positions — flat across all 6 markets.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="card-surface overflow-x-auto">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
          Open Positions
        </h3>
        <span className="text-[10px] text-textMuted">Live · refreshes every 30s</span>
      </div>
      <table className="w-full min-w-[980px] text-left text-[12px]">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-textMuted">
            <th scope="col" className="px-4 py-2.5 font-semibold">Market</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Side</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Size</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Entry</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Mark</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">uPnL</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Lev</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Liq Price</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Distance</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Margin</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position, i) => (
            <tr key={`${position.market}-${i}`} className="border-b border-border last:border-b-0 hover:bg-surface2">
              <td className="px-4 py-2.5"><MarketBadge market={position.market} /></td>
              <td className="px-3 py-2.5">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    position.side === 'LONG' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                  }`}
                >
                  {position.side}
                </span>
              </td>
              <td className="tabular px-3 py-2.5 font-semibold text-textPrimary">
                {formatUSD(position.notionalValue)}
              </td>
              <td className="tabular px-3 py-2.5 text-textSecondary">{formatPrice(position.entryPrice)}</td>
              <td className="tabular px-3 py-2.5 text-textPrimary">{formatPrice(position.markPrice)}</td>
              <td className="px-3 py-2.5">
                <PnLTag value={position.unrealizedPnl} compact>
                  {position.unrealizedPnl >= 0 ? '+' : '-'}
                  {formatUSD(Math.abs(position.unrealizedPnl))} / {position.unrealizedPnlPercent >= 0 ? '+' : ''}
                  {position.unrealizedPnlPercent.toFixed(1)}%
                </PnLTag>
              </td>
              <td className="tabular px-3 py-2.5 text-textSecondary">{formatLeverage(position.leverage)}</td>
              <td className="tabular px-3 py-2.5 text-textSecondary">
                {position.liquidationPrice > 0 ? formatPrice(position.liquidationPrice) : '—'}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`tabular text-[11px] font-semibold ${
                    position.distanceToLiq < 5
                      ? 'text-danger'
                      : position.distanceToLiq < 15
                        ? 'text-warning'
                        : 'text-success'
                  }`}
                >
                  {position.distanceToLiq.toFixed(1)}% away
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface2" title={`Margin ratio ${(position.marginRatio * 100).toFixed(1)}%`}>
                    <div
                      className={`h-full rounded-full ${position.marginRatio < 0.15 ? 'bg-danger' : position.marginRatio < 0.3 ? 'bg-warning' : 'bg-success'}`}
                      style={{ width: `${Math.min(position.marginRatio * 100, 100)}%` }}
                    />
                  </div>
                  <span className="tabular text-[10px] text-textMuted">
                    {(position.marginRatio * 100).toFixed(0)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 text-[10px] text-textMuted">
        Opened via on-chain reads · durations: {positions.map((p) => formatDuration((Date.now() - new Date(p.openedAt).getTime()) / 1000)).join(', ') || '—'}
      </div>
    </div>
  );
}
