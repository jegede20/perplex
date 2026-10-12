import { cn } from '@/lib/utils/cn';
import { SCORE_PURPLE_MIN, SCORE_YELLOW_MIN } from '@/lib/utils/constants';

export interface ScoreBarProps {
  score: number;
  showValue?: boolean;
  height?: 'sm' | 'md';
  className?: string;
}

function scoreColor(score: number): string {
  if (score >= SCORE_PURPLE_MIN) return 'bg-primary';
  if (score >= SCORE_YELLOW_MIN) return 'bg-warning';
  return 'bg-danger';
}

export default function ScoreBar({ score, showValue = true, height = 'sm', className }: ScoreBarProps) {
  const clamped = Math.min(Math.max(score, 0), 100);
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Smart money score ${clamped} out of 100`}
        data-testid="score-bar"
        data-score={clamped}
        className={cn(
          'w-full overflow-hidden rounded-full bg-surface2',
          height === 'sm' ? 'h-1.5' : 'h-2.5'
        )}
      >
        <div
          data-testid="score-bar-fill"
          className={cn('h-full rounded-full transition-all duration-300', scoreColor(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showValue && (
        <span
          data-testid="score-bar-value"
          className={cn(
            'tabular min-w-[22px] text-right text-[12px] font-bold',
            clamped >= SCORE_PURPLE_MIN
              ? 'text-primary'
              : clamped >= SCORE_YELLOW_MIN
                ? 'text-warning'
                : 'text-danger'
          )}
        >
          {clamped}
        </span>
      )}
    </div>
  );
}
