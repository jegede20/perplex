import { cn } from '@/lib/utils/cn';

export interface SentimentBarProps {
  longPercent: number;
  shortPercent: number;
  height?: 'sm' | 'md';
  showLabels?: boolean;
  className?: string;
}

export default function SentimentBar({
  longPercent,
  shortPercent,
  height = 'sm',
  showLabels = true,
  className,
}: SentimentBarProps) {
  const total = longPercent + shortPercent || 1;
  const long = Math.round((longPercent / total) * 100);
  const short = 100 - long;

  return (
    <div className={cn('w-full', className)} data-testid="sentiment-bar">
      {showLabels && (
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="font-medium text-success">L {long}%</span>
          <span className="font-medium text-danger">{short}% S</span>
        </div>
      )}
      <div
        className={cn('flex w-full overflow-hidden rounded-full bg-surface2', height === 'sm' ? 'h-1.5' : 'h-2.5')}
        role="img"
        aria-label={`Long ${long} percent, Short ${short} percent`}
      >
        <div className="h-full bg-success transition-all duration-300" style={{ width: `${long}%` }} />
        <div className="h-full bg-danger transition-all duration-300" style={{ width: `${short}%` }} />
      </div>
    </div>
  );
}
