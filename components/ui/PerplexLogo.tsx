import { cn } from '@/lib/utils/cn';

export interface PerplexLogoProps {
  /** Tile (mark) size in px. */
  size?: number;
  /** Show the purple gradient tile around the mark. */
  tile?: boolean;
  /** Show the "Perplex" wordmark beside the mark. */
  wordmark?: boolean;
  /** Show the "Smart Money Radar" tagline (requires wordmark). */
  tagline?: boolean;
  className?: string;
}

/**
 * Perplex brand mark — a hand-drawn geometric "P" whose bowl is a
 * radar sweep, echoed by a signal wave. Stays crisp from 16px favicons
 * to hero sizes. The purple tile comes from CSS; the mark itself is
 * single-color (currentColor) so it reverses cleanly.
 */
export function PerplexMark({
  size = 32,
  tile = true,
  className,
}: {
  size?: number;
  tile?: boolean;
  className?: string;
}) {
  const svg = (
    <svg
      viewBox="0 0 32 32"
      width={Math.round(size * (tile ? 0.82 : 1))}
      height={Math.round(size * (tile ? 0.82 : 1))}
      role="img"
      aria-label="Perplex"
    >
      <g>
        {/* stem */}
        <rect x="6.7" y="4.8" width="5" height="22.4" rx="1.6" fill="currentColor" />
        {/* bowl — radar sweep core, flush into the stem */}
        <path
          d="M 11 7.1 A 7.7 7.7 0 0 1 11 22.5"
          stroke="currentColor"
          strokeWidth="4.8"
          strokeLinecap="butt"
          fill="none"
        />
        {/* signal wave */}
        <path
          d="M 20.94 7.48 A 12.4 12.4 0 0 1 20.94 22.12"
          stroke="currentColor"
          strokeOpacity="0.72"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );

  if (tile) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-[26%] bg-gradient-to-b from-[#8B6BC4] to-[#6A4CA0] text-white shadow-[0_2px_12px_rgba(123,94,167,0.35)] ring-1 ring-white/10',
          className
        )}
        style={{ width: size, height: size }}
      >
        {svg}
      </span>
    );
  }
  return <span className={cn('inline-flex text-primary', className)}>{svg}</span>;
}

/**
 * Perplex lockup — mark + wordmark + optional tagline. The single
 * source of truth for the brand across sidebar, headers, and footer.
 */
export default function PerplexLogo({
  size = 32,
  tile = true,
  wordmark = true,
  tagline = true,
  className,
}: PerplexLogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <PerplexMark size={size} tile={tile} />
      {wordmark && (
        <span className="flex flex-col leading-tight">
          <span
            className="font-extrabold tracking-tight text-primary"
            style={{ fontSize: Math.max(15, Math.round(size * 0.58)) }}
          >
            Perplex
          </span>
          {tagline && (
            <span className="text-[10px] text-textMuted sm:text-[11px]">
              Smart Money Radar
            </span>
          )}
        </span>
      )}
    </span>
  );
}
