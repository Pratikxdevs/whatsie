const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface HeatmapChartProps {
  data: number[][]; // 7x24 grid
}

function getColor(value: number, max: number): string {
  if (value === 0) return 'bg-zinc-900';
  const ratio = value / max;
  if (ratio < 0.2) return 'bg-green-900/40';
  if (ratio < 0.4) return 'bg-green-800/50';
  if (ratio < 0.6) return 'bg-green-700/60';
  if (ratio < 0.8) return 'bg-green-600/70';
  return 'bg-green-500/80';
}

export function HeatmapChart({ data }: HeatmapChartProps) {
  const max = Math.max(...data.flat());

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex ml-10 mb-1">
          {HOURS.filter((h) => h % 3 === 0).map((hour) => (
            <div key={hour} className="flex-1 text-[9px] text-zinc-600 text-center">
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Grid */}
        {data.map((row, dayIdx) => (
          <div key={dayIdx} className="flex items-center gap-0.5 mb-0.5">
            <span className="w-9 text-[9px] text-zinc-500 text-right pr-1 shrink-0">{DAYS[dayIdx]}</span>
            {row.map((value, hourIdx) => (
              <div
                key={hourIdx}
                className={`flex-1 h-4 rounded-sm ${getColor(value, max)} transition-colors`}
                title={`${DAYS[dayIdx]} ${hourIdx}:00 — ${value} messages`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
