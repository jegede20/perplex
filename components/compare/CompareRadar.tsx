'use client';

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type { RadarDataPoint, WalletProfile } from '@/lib/types';
import { formatAddress } from '@/lib/utils/format';
import { radarArea } from '@/lib/compare/compareEngine';

export interface CompareRadarProps {
  data: RadarDataPoint[];
  walletA: WalletProfile;
  walletB: WalletProfile;
  loading?: boolean;
}

/**
 * Performance radar — all metrics normalized 0–100. Overlaid purple
 * (A) and green (B) polygons show strengths and gaps at a glance.
 */
export default function CompareRadar({ data, walletA, walletB, loading }: CompareRadarProps) {
  const areaA = radarArea(data, 'A');
  const areaB = radarArea(data, 'B');
  const dominant = Math.abs(areaA - areaB) < 5 ? 'TIE' : areaA > areaB ? 'A' : 'B';

  return (
    <div className="card-surface p-5">
      <div>
        <h3 className="text-[15px] font-semibold text-textPrimary">Performance Radar</h3>
        <p className="mt-0.5 text-[12px] text-textMuted">
          All metrics normalized to 0-100 scale
        </p>
      </div>

      <div className="mt-4 h-[320px] w-full min-w-0">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[12px] text-textMuted">
            Loading radar…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="72%">
              <PolarGrid stroke="#2A2A3D" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#A0A0B8', fontSize: 10 }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={{ fill: '#505070', fontSize: 9 }}
                axisLine={false}
              />
              <Radar
                name={`A · ${formatAddress(walletA.address)}`}
                dataKey="valueA"
                stroke="#7B5EA7"
                fill="#7B5EA7"
                fillOpacity={0.35}
                isAnimationActive={false}
              />
              <Radar
                name={`B · ${formatAddress(walletB.address)}`}
                dataKey="valueB"
                stroke="#22C55E"
                fill="#22C55E"
                fillOpacity={0.35}
                isAnimationActive={false}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-[11px] text-textSecondary">{value}</span>
                )}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && dominant !== 'TIE' && (
        <div className="mt-2 text-center">
          <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            🏆 Wallet {dominant} has larger overall radar
          </span>
        </div>
      )}
    </div>
  );
}
