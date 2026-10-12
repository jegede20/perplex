import { cn } from '@/lib/utils/cn';

export interface LiveDotProps {
  className?: string;
  color?: 'success' | 'warning' | 'danger' | 'primary';
}

const COLOR_MAP: Record<NonNullable<LiveDotProps['color']>, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  primary: 'bg-primary',
};

export default function LiveDot({ className, color = 'success' }: LiveDotProps) {
  return (
    <span className="relative flex h-2 w-2" aria-hidden>
      <span
        className={cn(
          'absolute inline-flex h-full w-full animate-pulse-dot rounded-full opacity-75',
          COLOR_MAP[color],
          className
        )}
      />
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', COLOR_MAP[color])} />
    </span>
  );
}
