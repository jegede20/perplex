'use client';

import type { TimeRange } from '@/lib/types';
import TimeRangeTabs from '@/components/ui/TimeRangeTabs';

export interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  options?: readonly TimeRange[];
  className?: string;
}

/** 24H / 7D / 30D / ALL tab switcher shared across protocol charts. */
export default function TimeRangeSelector({
  value,
  onChange,
  options,
  className,
}: TimeRangeSelectorProps) {
  return (
    <div className={className}>
      <TimeRangeTabs value={value} onChange={onChange} options={options} />
    </div>
  );
}
