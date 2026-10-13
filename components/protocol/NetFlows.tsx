'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NetFlowPoint } from '@/lib/types';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { formatChartDate, formatPnL, formatUSD } from '@/lib/utils/format';

export interface NetFlowsProps {
  points: NetFlowPoint[];
  loading?: boolean;
}

/** Deposits (green) vs withdrawals (red) area chart with net-flow line. */
export default function NetFlows({ points, loading }: NetFlowsProps) {
  if (loading || points.length === 0) {
    return <LoadingSkeleton variant="chart" />;
  }

  const totalNet = points.reduce((s, p) => s + p.net, 0);

  return (
    <div className="card-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
          Net Capital Flows
        </h3>
        <span
          className={`tabular text-[12px] font-semibold ${totalNet >= 0 ? 'text-success' : 'text-danger'}`}
        >
          {totalNet >= 0 ? '+' : ''}
          {formatPnL(totalNet)} net
        </span>
      </div>
      <div className="h-[180px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="depositsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="withdrawalsFill" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(v: number) => formatUSD(v)}
              tick={{ stroke: '#505070', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              contentStyle={{
                background: '#1A1A26',
                border: '1px solid #2A2A3D',
                borderRadius: 8,
                fontSize: 11,
              }}
              formatter={(value: number | string, name: string) => [
                formatUSD(Number(value)),
                name === 'deposits' ? 'Deposits' : name === 'withdrawals' ? 'Withdrawals' : 'Net',
              ]}
            />
            <Area type="monotone" dataKey="deposits" stroke="#22C55E" strokeWidth={1.5} fill="url(#depositsFill)" />
            <Area type="monotone" dataKey="withdrawals" stroke="#EF4444" strokeWidth={1.5} fill="url(#withdrawalsFill)" />
            <Line type="monotone" dataKey="net" stroke="#7B5EA7" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
