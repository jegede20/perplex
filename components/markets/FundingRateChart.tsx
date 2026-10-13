'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FundingPoint } from '@/lib/types';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { formatFundingRate } from '@/lib/utils/format';

export interface FundingRateChartProps {
  points: FundingPoint[];
  loading?: boolean;
}

/** Funding rate history line chart (last 7d, 8h samples). */
export default function FundingRateChart({ points, loading }: FundingRateChartProps) {
  if (loading || points.length === 0) return <LoadingSkeleton variant="chart" />;

  const data = points.map((p) => ({
    ...p,
    label: new Date(p.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
    ratePct: p.rate * 100,
  }));

  return (
    <div className="card-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
          Funding Rate History
        </h3>
        <span className="text-[11px] text-textMuted">8h intervals · 7d</span>
      </div>
      <div className="h-[200px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" vertical={false} />
            <XAxis dataKey="label" tick={{ stroke: '#505070', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#2A2A3D' }} minTickGap={28} />
            <YAxis
              tickFormatter={(v: number) => `${v.toFixed(3)}%`}
              tick={{ stroke: '#505070', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{ background: '#1A1A26', border: '1px solid #2A2A3D', borderRadius: 8, fontSize: 11 }}
              formatter={(value: number | string) => [formatFundingRate(Number(value) / 100), 'Funding']}
            />
            <ReferenceLine y={0} stroke="#505070" strokeDasharray="2 2" />
            <Line type="monotone" dataKey="ratePct" stroke="#7B5EA7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
