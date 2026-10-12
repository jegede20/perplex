'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PnLPoint, WalletProfile } from '@/lib/types';
import TimeRangeTabs from '@/components/ui/TimeRangeTabs';
import { formatChartDate, formatPnL, formatAddress } from '@/lib/utils/format';

export interface ComparePnLChartProps {
  pnlA: PnLPoint[];
  pnlB: PnLPoint[];
  walletA: WalletProfile;
  walletB: WalletProfile;
  loading?: boolean;
}

const RANGE_OPTIONS = ['7D', '14D', '30D'] as const;
type PnLRange = (typeof RANGE_OPTIONS)[number];

interface TooltipPayloadEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}

function PnLTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-[11px] shadow-xl">
      <p className="mb-1 font-semibold text-textPrimary">{label ? formatChartDate(label) : ''}</p>
      {payload.map((entry) => (
        <p key={String(entry.name)} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-textSecondary">{entry.name}</span>
          <span className="tabular font-semibold text-textPrimary">{formatPnL(Number(entry.value))}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Cumulative realized PnL for both wallets on one chart.
 * Line A = purple · Line B = green · zero line dashed.
 */
export default function ComparePnLChart({ pnlA, pnlB, walletA, walletB, loading }: ComparePnLChartProps) {
  const [range, setRange] = useState<PnLRange>('14D');

  const rows = useMemo(() => {
    const days = range === '7D' ? 7 : range === '14D' ? 14 : 30;
    const a = pnlA.slice(-days);
    const b = pnlB.slice(-days);
    const byDate = new Map<string, { date: string; A?: number; B?: number }>();
    for (const point of a) {
      byDate.set(point.date, { date: point.date, A: point.cumulativePnl });
    }
    for (const point of b) {
      const existing = byDate.get(point.date) ?? { date: point.date };
      existing.B = point.cumulativePnl;
      byDate.set(point.date, existing);
    }
    return [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date));
  }, [pnlA, pnlB, range]);

  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-textPrimary">PnL Comparison</h3>
          <p className="mt-0.5 text-[12px] text-textMuted">
            Cumulative realized PnL over time
          </p>
        </div>
        <TimeRangeTabs<PnLRange> value={range} onChange={setRange} options={RANGE_OPTIONS} />
      </div>

      <div className="mt-4 h-[320px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[12px] text-textMuted">
            Loading PnL curves…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="#2A2A3D" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => formatChartDate(d)}
                stroke="#505070"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#2A2A3D' }}
                minTickGap={30}
              />
              <YAxis
                tickFormatter={(v: number) => formatPnL(v)}
                stroke="#505070"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#2A2A3D' }}
                width={64}
              />
              <Tooltip content={<PnLTooltip />} />
              <Legend
                formatter={(value: string) => (
                  <span className="text-[11px] text-textSecondary">
                    {value === 'A'
                      ? `Wallet A (${formatAddress(walletA.address)})`
                      : `Wallet B (${formatAddress(walletB.address)})`}
                  </span>
                )}
              />
              <ReferenceLine y={0} stroke="#A0A0B8" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="A"
                name="A"
                stroke="#7B5EA7"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="B"
                name="B"
                stroke="#22C55E"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
