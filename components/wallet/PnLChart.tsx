'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PnLPoint } from '@/lib/types';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import TimeRangeTabs from '@/components/ui/TimeRangeTabs';
import { formatChartDate, formatPnL } from '@/lib/utils/format';

export interface PnLChartProps {
  points: PnLPoint[];
  loading?: boolean;
}

type PnLRange = '7D' | '14D' | '30D';

/**
 * Cumulative PnL area chart with 7D / 14D / 30D tabs.
 * Green fill when ending positive, red when negative.
 */
export default function PnLChart({ points, loading }: PnLChartProps) {
  const [range, setRange] = useState<PnLRange>('30D');

  const data = useMemo(() => {
    const days = range === '7D' ? 7 : range === '14D' ? 14 : 30;
    return points.slice(-days);
  }, [points, range]);

  if (loading) return <LoadingSkeleton variant="chart" />;

  if (points.length === 0) {
    return (
      <div className="card-surface flex flex-col items-center justify-center gap-1 p-10 text-center">
        <p className="text-[13px] text-textSecondary">No PnL history yet</p>
        <p className="text-[11px] text-textMuted">Closed trades build this curve over time.</p>
      </div>
    );
  }

  const last = data[data.length - 1];
  const positive = (last?.cumulativePnl ?? 0) >= 0;
  const lineColor = positive ? '#22C55E' : '#EF4444';
  const fillId = positive ? 'pnlFillGreen' : 'pnlFillRed';

  return (
    <div className="card-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
            Cumulative PnL
          </h3>
          <p className={`tabular mt-0.5 text-[20px] font-bold ${positive ? 'text-success' : 'text-danger'}`}>
            {formatPnL(last?.cumulativePnl ?? 0)}
            <span className="ml-2 text-[11px] font-normal text-textMuted">
              {data.length} day{data.length === 1 ? '' : 's'}
            </span>
          </p>
        </div>
        <TimeRangeTabs<PnLRange>
          value={range}
          onChange={setRange}
          options={['7D', '14D', '30D']}
        />
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlFillGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="pnlFillRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              tick={{ stroke: '#505070', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#2A2A3D' }}
            />
            <YAxis
              tickFormatter={(v: number) => formatPnL(v)}
              tick={{ stroke: '#505070', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip
              contentStyle={{ background: '#1A1A26', border: '1px solid #2A2A3D', borderRadius: 8, fontSize: 11 }}
              labelFormatter={(label: string) => `Date: ${label}`}
              formatter={(value: number | string, name: string) => [
                formatPnL(Number(value)),
                name === 'cumulativePnl' ? 'Cumulative PnL' : name === 'dailyPnl' ? 'Daily PnL' : 'Trades',
              ]}
            />
            <ReferenceLine y={0} stroke="#505070" strokeDasharray="2 2" />
            <Area
              type="monotone"
              dataKey="cumulativePnl"
              stroke={lineColor}
              strokeWidth={2}
              fill={`url(#${fillId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
