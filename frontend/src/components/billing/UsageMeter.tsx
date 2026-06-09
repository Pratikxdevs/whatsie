interface UsageMeterProps {
  label: string;
  used: number;
  total: number;
  unit: string;
}

export function UsageMeter({ label, used, total, unit }: UsageMeterProps) {
  const percentage = Math.min((used / total) * 100, 100);
  const color =
    percentage >= 90 ? 'bg-red-500' : percentage >= 80 ? 'bg-yellow-500' : 'bg-green-500';
  const textColor =
    percentage >= 90 ? 'text-red-400' : percentage >= 80 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="bg-[#0f0f11] rounded-lg border border-white/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className={`text-xs font-medium ${textColor}`}>{percentage.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{typeof used === 'number' && used % 1 !== 0 ? used.toFixed(1) : used.toLocaleString()} {unit}</span>
        <span>{typeof total === 'number' && total % 1 !== 0 ? total.toFixed(1) : total.toLocaleString()} {unit}</span>
      </div>
    </div>
  );
}
