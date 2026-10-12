'use client';

import type { OverallSentiment, SentimentLabel } from '@/lib/types';
import SentimentGaugeNeedle from '@/components/sentiment/SentimentGaugeNeedle';
import ConvictionMeter from '@/components/sentiment/ConvictionMeter';
import { cn } from '@/lib/utils/cn';

export interface SentimentGaugeProps {
  overall: OverallSentiment;
}

const CX = 180;
const CY = 165;
const RADIUS = 115;
const STROKE = 22;

const ZONES: Array<{ from: number; to: number; color: string }> = [
  { from: -100, to: -60, color: '#EF4444' },
  { from: -60, to: -20, color: '#F97316' },
  { from: -20, to: 20, color: '#A0A0B8' },
  { from: 20, to: 60, color: '#86EFAC' },
  { from: 60, to: 100, color: '#22C55E' },
];

const LABEL_BADGE: Record<SentimentLabel, string> = {
  'EXTREME FEAR': 'bg-danger/20 text-danger border-danger/40',
  FEAR: 'bg-[#F97316]/20 text-[#F97316] border-[#F97316]/40',
  NEUTRAL: 'bg-textMuted/20 text-textSecondary border-textMuted/40',
  GREED: 'bg-[#86EFAC]/15 text-[#86EFAC] border-[#86EFAC]/40',
  'EXTREME GREED': 'bg-success/20 text-success border-success/40',
};

/** sentiment value → standard math angle (deg, ccw from east). */
function angleOf(value: number): number {
  return 180 - ((value + 100) / 200) * 180;
}

function pointOn(value: number, radius: number): { x: number; y: number } {
  const rad = (angleOf(value) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) };
}

function arcPath(from: number, to: number, radius: number): string {
  const a = pointOn(from, radius);
  const b = pointOn(to, radius);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/**
 * Semicircular market-temperature gauge (−100 fear → +100 greed).
 * Five color zones, animated needle, center readout, conviction meter.
 */
export default function SentimentGauge({ overall }: SentimentGaugeProps) {
  const net = Math.min(Math.max(overall.netSentiment, -100), 100);
  const needleAngle = ((net + 100) / 200) * 180;

  return (
    <div
      className="card-surface flex flex-col items-center px-4 py-5"
      data-testid="sentiment-gauge"
      data-net={Math.round(net)}
    >
      <svg
        viewBox="0 0 360 235"
        className="w-full max-w-[360px]"
        role="img"
        aria-label={`Market sentiment ${Math.round(net)} of 100, ${overall.sentimentLabel}`}
      >
        {ZONES.map((zone) => (
          <path
            key={zone.from}
            d={arcPath(zone.from, zone.to, RADIUS)}
            stroke={zone.color}
            strokeWidth={STROKE}
            fill="none"
            opacity={0.85}
          />
        ))}

        {/* arc labels */}
        <text x={42} y={212} fill="#EF4444" fontSize={11} fontWeight={600}>FEAR</text>
        <text x={156} y={32} fill="#505070" fontSize={11} fontWeight={600}>NEUTRAL</text>
        <text x={284} y={212} fill="#22C55E" fontSize={11} fontWeight={600}>GREED</text>

        <SentimentGaugeNeedle angleDegrees={needleAngle} cx={CX} cy={CY} length={100} />
        <circle cx={CX} cy={CY} r={7} fill="#7B5EA7" stroke="#FFFFFF" strokeWidth={2} />
      </svg>

      {/* center readout — below the needle pivot */}
      <div className="mt-1 flex flex-col items-center">
        <p
          className={cn(
            'text-4xl font-black leading-none',
            net > 0 ? 'text-success' : net < 0 ? 'text-danger' : 'text-textSecondary'
          )}
        >
          {net > 0 ? '+' : ''}
          {Math.round(net)}
        </p>
        <span
          className={cn(
            'mt-2 rounded-full border px-3 py-1 text-[11px] font-bold tracking-wider',
            LABEL_BADGE[overall.sentimentLabel]
          )}
          data-testid="sentiment-label"
        >
          {overall.sentimentLabel}
        </span>
      </div>

      <div className="mt-5 w-full max-w-[280px]">
        <ConvictionMeter conviction={overall.conviction} />
      </div>

      <div className="mt-4 space-y-1 text-center text-[11px] text-textMuted">
        <p>
          Tracking{' '}
          <span className="font-semibold text-textSecondary">
            {overall.trackedWhales + overall.trackedSharks}
          </span>{' '}
          Whales &amp; Sharks
        </p>
        <p>
          Total Whale OI:{' '}
          <span className="font-semibold text-textSecondary">
            ${overall.totalWhaleOI.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </p>
      </div>
    </div>
  );
}
