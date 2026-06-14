import { useState, useEffect } from "react";
import { analyticsApi } from "../../services/api";

const STATUS_COLORS: Record<string, string> = {
  new: "#A1A1AA",      // Silver/Zinc
  contacted: "#3B82F6", // Blue
  qualified: "#8B5CF6", // Purple/Indigo
  converted: "#10B981", // Green
  lost: "#64748B",      // Slate/Gray
};

export function LeadPipelineFunnel() {
  const [stages, setStages] = useState<{ label: string; count: number; color: string }[]>([]);
  const [conversionRate, setConversionRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsApi.getConversionFunnel(),
      analyticsApi.getDashboardStats(),
    ])
      .then(([funnel, stats]) => {
        const mapped = funnel.map((item: { status: string; count: number }) => ({
          label: item.status.charAt(0).toUpperCase() + item.status.slice(1),
          count: item.count,
          color: STATUS_COLORS[item.status] || "#71717a",
        }));
        setStages(mapped);
        setConversionRate(stats.conversionRate ?? 0);
      })
      .catch((err) => console.error("Pipeline load failed:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 animate-pulse">
        <div className="h-4 w-24 bg-zinc-800 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-16 bg-zinc-800 rounded shrink-0" />
              <div className="flex-1 h-6 bg-zinc-850 rounded-md" />
              <div className="h-3 w-6 bg-zinc-800 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center min-h-[180px]">
        <span className="text-zinc-500 text-xs font-sans">No pipeline stage data found.</span>
      </div>
    );
  }

  const maxCount = stages.length > 0 ? Math.max(...stages.map((s) => s.count)) : 1;

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
      <h3 className="text-[13px] font-semibold text-zinc-200 mb-4">Lead Pipeline</h3>
      <div className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500 w-20 shrink-0">{stage.label}</span>
            <div className="flex-1 h-6 bg-zinc-800 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{
                  width: `${(stage.count / maxCount) * 100}%`,
                  backgroundColor: stage.color,
                  opacity: 0.7,
                }}
              />
            </div>
            <span className="text-[12px] font-semibold text-zinc-300 w-6 text-right">{stage.count}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-zinc-600">Conversion Rate</span>
        <span className="text-[13px] font-bold text-emerald-400">{conversionRate}%</span>
      </div>
    </div>
  );
}
