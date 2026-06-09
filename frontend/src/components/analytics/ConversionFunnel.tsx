const STATUS_COLORS: Record<string, string> = {
  new: '#60A5FA',
  contacted: '#FBBF24',
  qualified: '#34D399',
  converted: '#10B981',
  lost: '#EF4444',
};

interface ConversionFunnelProps {
  data: Array<{ status: string; count: number }>;
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const sharePct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
        const color = STATUS_COLORS[item.status] || '#7D7D8A';

        return (
          <div key={item.status} className="flex items-center gap-3">
            <span className="w-24 text-sm text-[#7D7D8A] capitalize shrink-0">
              {item.status}
            </span>
            <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
              >
                <span className="text-xs font-medium text-white whitespace-nowrap">
                  {item.count}
                </span>
              </div>
            </div>
            <span className="w-14 text-right text-sm text-[#7D7D8A] shrink-0">
              {sharePct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
