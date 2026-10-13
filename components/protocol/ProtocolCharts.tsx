'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import type { ProtocolChartPoint, TimeRange } from '@/lib/types';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { formatChartDate, formatIntradayLabel, formatUSD } from '@/lib/utils/format';

export interface ProtocolChartsProps {
  points: ProtocolChartPoint[];
  range: TimeRange;
  loading?: boolean;
}

interface TooltipPayloadEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  formatter: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-surface2 px-3 py-2 text-[11px] shadow-glow-sm">
      <p className="mb-1 font-semibold text-textPrimary">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-1.5 text-textSecondary">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}: <span className="tabular font-semibold text-textPrimary">{formatter(Number(entry.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

const AXIS = { stroke: '#505070', fontSize: 10 };
const GRID_STROKE = '#2A2A3D';

/** Volume bars, OI long/short lines, active users bars — shared time range. */
export default function ProtocolCharts({ points, range, loading }: ProtocolChartsProps) {
  if (loading || points.length === 0) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton variant="chart" />
        <LoadingSkeleton variant="chart" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Volume */}
      <div className="card-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
            Daily Volume
          </h3>
          <span className="text-[11px] text-textMuted">{range}</span>
        </div>
        <div className="h-[200px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => (range === '24H' ? formatIntradayLabel(d) : formatChartDate(d))} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID_STROKE }} />
              <YAxis tickFormatter={(v: number) => formatUSD(v)} tick={AXIS} tickLine={false} axisLine={false} width={52} />
              <Tooltip
                content={<ChartTooltip formatter={(v) => formatUSD(v)} />}
                cursor={{ fill: '#7B5EA730' }}
              />
              <Bar dataKey="volume" name="Volume" fill="#7B5EA7" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Open Interest */}
      <div className="card-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
            Open Interest — Long vs Short
          </h3>
          <span className="text-[11px] text-textMuted">{range}</span>
        </div>
        <div className="h-[200px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => (range === '24H' ? formatIntradayLabel(d) : formatChartDate(d))} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID_STROKE }} />
              <YAxis tickFormatter={(v: number) => formatUSD(v)} tick={AXIS} tickLine={false} axisLine={false} width={52} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v: number) => formatUSD(v)} tick={AXIS} tickLine={false} axisLine={false} width={52} />
              <Tooltip content={<ChartTooltip formatter={(v) => formatUSD(v)} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#A0A0B8' }} />
              <Line type="monotone" dataKey="oiLong" name="OI Long" stroke="#22C55E" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="oiShort" name="OI Short" stroke="#EF4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="fees" name="Fees" yAxisId="right" stroke="#7B5EA7" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active users */}
      <div className="card-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
            Active Users
          </h3>
          <span className="text-[11px] text-textMuted">{range}</span>
        </div>
        <div className="h-[180px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => (range === '24H' ? formatIntradayLabel(d) : formatChartDate(d))} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID_STROKE }} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                content={<ChartTooltip formatter={(v) => v.toLocaleString('en-US')} />}
                cursor={{ fill: '#7B5EA730' }}
              />
              <Bar dataKey="activeUsers" name="Active Users" fill="#A78BFA" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
