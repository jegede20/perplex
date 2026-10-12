'use client';

import { useMemo, useState } from 'react';
import type { CascadeDirection } from '@/lib/liquidation/mapBuilder';
import { calculateCascadeRisk } from '@/lib/liquidation/mapBuilder';
import type { CascadeRiskLevel, LiquidationCluster, LiquidationMapData } from '@/lib/types';
import { formatPercent, formatPrice, formatUSD } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface LiquidationMapControlsProps {
  data: LiquidationMapData;
}

const RISK_STYLE: Record<CascadeRiskLevel, { badge: string; border: string; bar: string; glow: string }> = {
  LOW: {
    badge: 'bg-success/15 text-success border-success/30',
    border: 'border-success/40',
    bar: 'bg-success',
    glow: '',
  },
  MEDIUM: {
    badge: 'bg-warning/15 text-warning border-warning/30',
    border: 'border-warning/40',
    bar: 'bg-warning',
    glow: '',
  },
  HIGH: {
    badge: 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30',
    border: 'border-[#F97316]/40',
    bar: 'bg-[#F97316]',
    glow: '',
  },
  EXTREME: {
    badge: 'bg-danger/20 text-danger border-danger/50',
    border: 'border-danger/50',
    bar: 'bg-danger',
    glow: 'animate-pulse shadow-[0_0_24px_rgba(239,68,68,0.25)]',
  },
};

const RISK_LABEL: Record<CascadeRiskLevel, string> = {
  LOW: 'LOW RISK',
  MEDIUM: 'MEDIUM RISK',
  HIGH: 'HIGH RISK',
  EXTREME: 'EXTREME RISK',
};

/**
 * Cascade Risk Simulator — drag the slider to model a price drop or
 * rise and see how much liquidation volume would trigger, live.
 */
export default function LiquidationMapControls({ data }: LiquidationMapControlsProps) {
  const [direction, setDirection] = useState<CascadeDirection>('DROP');
  const [movePercent, setMovePercent] = useState(8.5);

  const result = useMemo(
    () =>
      calculateCascadeRisk(
        data.clusters,
        data.markPrice,
        movePercent,
        direction
      ),
    [data.clusters, data.markPrice, movePercent, direction]
  );

  const style = RISK_STYLE[result.cascadeRisk];
  const fillPercent = Math.min((result.totalLiquidated / 5_000_000) * 100, 100);
  const positionsAffected = result.triggeredClusters.reduce(
    (sum, c) => sum + (direction === 'DROP' ? c.longCount : c.shortCount),
    0
  );

  return (
    <div className="card-surface p-5">
      <h3 className="text-[15px] font-semibold text-textPrimary">Cascade Risk Simulator</h3>
      <p className="mt-0.5 text-[12px] text-textMuted">
        Simulate a price move and see what breaks
      </p>

      {/* direction toggle */}
      <div className="mt-4 inline-flex rounded-lg bg-surface2 p-1">
        <button
          type="button"
          onClick={() => setDirection('DROP')}
          className={cn(
            'rounded-md px-3.5 py-1.5 text-[12px] font-medium transition-colors duration-150',
            direction === 'DROP'
              ? 'bg-danger/20 text-danger'
              : 'text-textSecondary hover:text-textPrimary'
          )}
        >
          📉 Price Drop
        </button>
        <button
          type="button"
          onClick={() => setDirection('RISE')}
          className={cn(
            'rounded-md px-3.5 py-1.5 text-[12px] font-medium transition-colors duration-150',
            direction === 'RISE'
              ? 'bg-success/20 text-success'
              : 'text-textSecondary hover:text-textPrimary'
          )}
        >
          📈 Price Rise
        </button>
      </div>

      {/* slider */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <label htmlFor="cascade-slider" className="text-[12px] text-textSecondary">
            Simulate price move:{' '}
            <span className="tabular font-semibold text-textPrimary">
              {direction === 'DROP' ? '-' : '+'}
              {movePercent.toFixed(1)}%
            </span>
          </label>
          <span className="tabular text-[11px] text-textMuted">
            target {formatPrice(result.priceTarget)}
          </span>
        </div>
        <input
          id="cascade-slider"
          type="range"
          min={1}
          max={30}
          step={0.5}
          value={movePercent}
          onChange={(e) => setMovePercent(Number.parseFloat(e.target.value))}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-surface2 accent-primary"
          style={{
            backgroundImage: `linear-gradient(to right, #7B5EA7 ${((movePercent - 1) / 29) * 100}%, #1A1A26 ${((movePercent - 1) / 29) * 100}%)`,
          }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-textMuted">
          <span>1%</span>
          <span>30%</span>
        </div>
      </div>

      {/* live result card */}
      <div className={cn('mt-5 rounded-xl border bg-surface2 p-4', style.border, style.glow)}>
        <p className="text-[13px] text-textSecondary">
          If <span className="font-semibold text-textPrimary">{data.market}</span>{' '}
          {direction === 'DROP' ? 'drops' : 'rises'}{' '}
          <span className="tabular font-semibold text-textPrimary">
            {movePercent.toFixed(1)}%
          </span>{' '}
          to{' '}
          <span className="tabular font-semibold text-textPrimary">
            {formatPrice(result.priceTarget)}
          </span>
        </p>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-textMuted">
          Liquidations Triggered
        </p>
        <p className="tabular mt-0.5 text-[28px] font-bold leading-none text-textPrimary">
          {formatUSD(result.totalLiquidated)}
        </p>

        {/* severity bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
            <div
              className={cn('h-full rounded-full transition-all duration-300', style.bar)}
              style={{ width: `${Math.max(fillPercent, 2)}%` }}
            />
          </div>
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider',
              style.badge
            )}
            data-testid="cascade-risk-badge"
            data-risk={result.cascadeRisk}
          >
            {RISK_LABEL[result.cascadeRisk]}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
          <div>
            <p className="text-textMuted">Positions Affected</p>
            <p className="tabular text-[16px] font-semibold text-textPrimary">
              {positionsAffected}
            </p>
          </div>
          <div>
            <p className="text-textMuted">Unique Wallets</p>
            <p className="tabular text-[16px] font-semibold text-textPrimary">
              {result.affectedWallets}
            </p>
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-3 text-[12px]">
          <span className="text-textMuted">Cascade Risk: </span>
          <span
            className={cn(
              'font-semibold',
              result.cascadeRisk === 'LOW' && 'text-success',
              result.cascadeRisk === 'MEDIUM' && 'text-warning',
              result.cascadeRisk === 'HIGH' && 'text-[#F97316]',
              result.cascadeRisk === 'EXTREME' && 'text-danger'
            )}
          >
            {result.cascadeRisk === 'EXTREME' ? '🔴' : result.cascadeRisk === 'LOW' ? '🟢' : '🟠'}{' '}
            {result.cascadeRisk}
          </span>
          <span className="ml-2 text-textMuted">
            ({result.triggeredClusters.length} cluster{result.triggeredClusters.length === 1 ? '' : 's'} in the{' '}
            {formatPercent(movePercent)} {direction === 'DROP' ? 'downside' : 'upside'} window)
          </span>
        </div>
      </div>
    </div>
  );
}
