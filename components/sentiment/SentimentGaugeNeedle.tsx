'use client';

export interface SentimentGaugeNeedleProps {
  /** 0° = leftmost (-100) · 180° = rightmost (+100) */
  angleDegrees: number;
  /** SVG pivot X */
  cx: number;
  /** SVG pivot Y */
  cy: number;
  length: number;
}

/**
 * Animated gauge needle. Points left at -100, straight up at 0, right
 * at +100 — rotates smoothly via CSS transition when sentiment updates.
 */
export default function SentimentGaugeNeedle({
  angleDegrees,
  cx,
  cy,
  length,
}: SentimentGaugeNeedleProps) {
  return (
    <g
      style={{
        transform: `rotate(${angleDegrees}deg)`,
        transformOrigin: `${cx}px ${cy}px`,
        transition: 'transform 1s ease-in-out',
      }}
    >
      <polygon
        points={`${cx - length},${cy} ${cx - 12},${cy - 5} ${cx - 12},${cy + 5}`}
        fill="#FFFFFF"
      />
      <line
        x1={cx - length}
        y1={cy}
        x2={cx + 10}
        y2={cy}
        stroke="#FFFFFF"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </g>
  );
}
