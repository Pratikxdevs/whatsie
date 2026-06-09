import { useState } from 'react';
import { Calendar } from 'lucide-react';

type DateRange = '7d' | '30d' | '90d' | 'custom';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const ranges: { label: string; value: DateRange }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-lg p-1">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === range.value
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
