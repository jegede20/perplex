'use client';

import {
  Bar,
  Cell,
  ComposedChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LiquidationCluster, LiquidationMapData } from '@/lib/types';
import LiquidationMapTooltip from '@/components/liquidation-map/LiquidationMapTooltip';
import { formatPrice, formatUSD } from '@/lib/utils/format';

export interface LiquidationMapChartProps {
  data: LiquidationMapData;
  selectedBucket?: number | null;
  onSelectCluster?: (priceBucket: number) => void;
}

interface ChartRow extends LiquidationCluster {
  longPlot: number;
  shortPlot: number;
}

const LONG_FILL = '#22C55E';
const SHORT_FILL = '#EF4444';
const MARK_STROKE = '#7B5EA7';

function intensityOpacity(intensity: number): number {
  return 0.3 + (Math.min(Math.max(intensity, 0), 100) / 100) * 0.7;
}

/**
 * Liquidation heatmap: volume at risk clustered along the price axis.
 * Green bars = long liquidation levels · red bars = short liquidation
 * levels · dashed purple line = live mark price. Bar opacity encodes
 * cluster intensity (0.3 → 1.0).
 */
export default function LiquidationMapChart({
  data,
  selectedBucket,
  onSelectCluster,
}: LiquidationMapChartProps) {
  const rows: ChartRow[] = data.clusters.map((c) => ({
    ...c,
    longPlot: c.longVolume,
    shortPlot: c.shortVolume,
  }));

  return (
    <div className="relative w-full min-w-0 overflow-x-auto">
      <div className="min-w-[640px]">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={rows} margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
            {/* danger zones */}
            <ReferenceArea
              x1={data.priceRangeMin}
              x2={data.markPrice}
              fill="rgba(34, 197, 94, 0.03)"
              label={{ value: 'Long Liquidation Zone', position: 'insideTopLeft', fill: '#505070', fontSize: 10 }}
            />
            <ReferenceArea
              x1={data.markPrice}
              x2={data.priceRangeMax}
              fill="rgba(239, 68, 68, 0.03)"
              label={{ value: 'Short Liquidation Zone', position: 'insideTopRight', fill: '#505070', fontSize: 10 }}
            />
            <XAxis
              type="number"
              dataKey="priceLevel"
              domain={[data.priceRangeMin, data.priceRangeMax]}
              tickCount={10}
              tickFormatter={(v: number) => formatPrice(v)}
              stroke="#505070"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#2A2A3D' }}
            />
            <YAxis
              tickFormatter={(v: number) => formatUSD(v)}
              stroke="#505070"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#2A2A3D' }}
              width={70}
            />
            <Tooltip
              content={<LiquidationMapTooltip markPrice={data.markPrice} />}
              cursor={{ fill: 'rgba(123, 94, 167, 0.08)' }}
            />
            <Bar
              dataKey="longPlot"
              name="Longs"
              fill={LONG_FILL}
              fillOpacity={0.8}
              isAnimationActive={false}
              onClick={(row: unknown) => {
                const cluster = row as ChartRow;
                onSelectCluster?.(cluster.priceBucket);
              }}
            >
              {rows.map((row) => (
                <Cell
                  key={`l-${row.priceBucket}`}
                  fillOpacity={intensityOpacity(row.intensity)}
                  stroke={selectedBucket === row.priceBucket ? '#FFFFFF' : 'none'}
                  strokeWidth={selectedBucket === row.priceBucket ? 1.5 : 0}
                />
              ))}
            </Bar>
            <Bar
              dataKey="shortPlot"
              name="Shorts"
              fill={SHORT_FILL}
              fillOpacity={0.8}
              isAnimationActive={false}
              onClick={(row: unknown) => {
                const cluster = row as ChartRow;
                onSelectCluster?.(cluster.priceBucket);
              }}
            >
              {rows.map((row) => (
                <Cell
                  key={`s-${row.priceBucket}`}
                  fillOpacity={intensityOpacity(row.intensity)}
                  stroke={selectedBucket === row.priceBucket ? '#FFFFFF' : 'none'}
                  strokeWidth={selectedBucket === row.priceBucket ? 1.5 : 0}
                />
              ))}
            </Bar>
            <ReferenceLine
              x={data.markPrice}
              stroke={MARK_STROKE}
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                value: `Mark Price ${formatPrice(data.markPrice)}`,
                position: 'top',
                fill: MARK_STROKE,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
