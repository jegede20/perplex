import { cn } from '@/lib/utils/cn';

export interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'chart' | 'text' | 'list' | 'stat-grid' | 'full';
  rows?: number;
  className?: string;
}

function Bar({ className }: { className?: string }) {
  return <div className={cn('animate-shimmer rounded-md bg-surface2', className)} style={{
    backgroundImage:
      'linear-gradient(90deg, #1A1A26 0%, #242438 40%, #1A1A26 80%)',
    backgroundSize: '400px 100%',
  }} />;
}

export default function LoadingSkeleton({ variant = 'card', rows = 5, className }: LoadingSkeletonProps) {
  if (variant === 'stat-grid') {
    return (
      <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)} aria-label="Loading metrics">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card-surface p-4">
            <Bar className="mb-3 h-3 w-20" />
            <Bar className="mb-2 h-7 w-28" />
            <Bar className="h-3 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={cn('card-surface flex flex-col gap-3 p-4', className)} aria-label="Loading chart">
        <Bar className="h-4 w-32" />
        <Bar className="h-[220px] w-full" />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('card-surface p-4', className)} aria-label="Loading table">
        <Bar className="mb-4 h-4 w-40" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-border py-3">
            <Bar className="h-4 w-24" />
            <Bar className="h-4 flex-1" />
            <Bar className="h-4 w-16" />
            <Bar className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-2', className)} aria-label="Loading list">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
            <Bar className="h-6 w-6 rounded-full" />
            <Bar className="h-4 flex-1" />
            <Bar className="h-4 w-14" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn('space-y-2', className)} aria-label="Loading text">
        {Array.from({ length: rows }).map((_, i) => (
          <Bar key={i} className="h-3 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('card-surface space-y-3 p-4', className)} aria-label="Loading">
      <Bar className="h-5 w-48" />
      <Bar className="h-24 w-full" />
      <Bar className="h-24 w-full" />
    </div>
  );
}
