'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SentimentHistoryPoint } from '@/lib/types';
import TimeRangeTabs from '@/components/ui/TimeRangeTabs';
import { SENTIMENT_HISTORY_WINDOWS } from '@/lib/sentiment/sentimentEngine';
import type { SentimentHistoryWindow } from '@/lib/sentiment/sentimentEngine';
import { formatTimeAgo } from '@/lib/utils/format';

export interface SentimentHistoryProps {
  points: SentimentHistoryPoint[];
  loading?: boolean;
}

interface TooltipPayloadEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}

function HistoryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-[11px] shadow-xl">
      <p className="mb-1 font-semibold text-textPrimary">
        {label ? formatTimeAgo(label) : ''}
      </p>
      {payload.map((entry) => (
        <p key={String(entry.name)} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-textSecondary">{entry.name}:</span>
          <span className="tabular font-semibold text-textPrimary">
            {Number(entry.value) > 0 ? '+' : ''}
            {Math.round(Number(entry.value))}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Sentiment history line chart with fear/greed zones and threshold
 * reference lines. Lines: overall (purple), BTC (blue), ETH (teal).
 */
export default function SentimentHistory({ points, loading }: SentimentHistoryProps) {
  const [window, setWindow] = useState<SentimentHistoryWindow['window']>('24H');

  const rows = useMemo(() => {
    return points.map((p) => ({
      time: p.timestamp,
      overall: p.overall,
      BTC: p.byMarket.BTC,
      ETH: p.byMarket.ETH,
    }));
  }, [points]);

  const count = { '1H': 12, '4H': 48, '24H': 96, '7D': 168 }[window];
  const visible = rows.slice(-count);

  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-textPrimary">Sentiment History</h3>
          <p className="mt-0.5 text-[12px] text-textMuted">
            Smart money net sentiment over time (−100 to +100)
          </p>
        </div>
        <TimeRangeTabs<SentimentHistoryWindow['window']>
          value={window}
          onChange={setWindow}
          options={SENTIMENT_HISTORY_WINDOWS}
        />
      </div>

      <div className="mt-4 h-[320px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[12px] text-textMuted">
            Loading sentiment history…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visible} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
              {/* colored zones */}
              <ReferenceArea y1={60} y2={100} fill="rgba(34, 197, 94, 0.08)" />
              <ReferenceArea y1={20} y2={60} fill="rgba(34, 197, 94, 0.04)" />
              <ReferenceArea y1={-20} y2={20} fill="rgba(160, 160, 184, 0.04)" />
              <ReferenceArea y1={-60} y2={-20} fill="rgba(239, 68, 68, 0.04)" />
              <ReferenceArea y1={-100} y2={-60} fill="rgba(239, 68, 68, 0.08)" />

              <CartesianGrid stroke="#2A2A3D" strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickFormatter={(t: string) => formatTimeAgo(t)}
                stroke="#505070"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#2A2A3D' }}
                minTickGap={40}
              />
              <YAxis
                domain={[-100, 100]}
                ticks={[-100, -60, -20, 0, 20, 60, 100]}
                stroke="#505070"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#2A2A3D' }}
                width={40}
              />
              <Tooltip content={<HistoryTooltip />} />

              <ReferenceLine y={60} stroke="#22C55E" strokeDasharray="6 4" />
              <ReferenceLine y={20} stroke="#86EFAC" strokeDasharray="6 4" />
              <ReferenceLine y={0} stroke="#A0A0B8" />
              <ReferenceLine y={-20} stroke="#F97316" strokeDasharray="6 4" />
              <ReferenceLine y={-60} stroke="#EF4444" strokeDasharray="6 4" />

              <Line
                type="monotone"
                dataKey="overall"
                name="Overall"
                stroke="#7B5EA7"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="BTC"
                name="BTC"
                stroke="#60A5FA"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="ETH"
                name="ETH"
                stroke="#2DD4BF"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px] text-textMuted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-[#7B5EA7]" /> Overall
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-[#60A5FA]" /> BTC
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-[#2DD4BF]" /> ETH
        </span>
      </div>
    </div>
  );
}
