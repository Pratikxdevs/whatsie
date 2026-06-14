import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2 } from "lucide-react";
import { analyticsApi } from "../../services/api";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MessagesOverTimeChart() {
  const [data, setData] = useState<{ day: string; inbound: number; outbound: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsApi.getMessageVolume(7)
      .then((rows: { date: string; inbound: number; outbound: number }[]) => {
        const mapped = rows.map((row) => {
          const d = new Date(row.date + "T00:00:00");
          return {
            day: DAY_NAMES[d.getDay()],
            inbound: row.inbound,
            outbound: row.outbound,
          };
        });
        setData(mapped);
      })
      .catch((err) => console.error("Chart load failed:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 animate-pulse min-h-[250px] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-24 bg-zinc-800 rounded" />
          <div className="h-4 w-12 bg-zinc-800 rounded" />
        </div>
        <div className="flex-1 w-full bg-zinc-850 rounded-md flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center min-h-[250px]">
        <h3 className="text-[13px] font-semibold text-zinc-200 mb-2 align-self-start self-start">Messages (7d)</h3>
        <span className="text-zinc-500 text-xs font-sans mt-8">No message traffic recorded in the last 7 days.</span>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-zinc-200">Messages (7d)</h3>
        <div className="flex gap-1">
          <button className="px-2 py-1 text-[10px] bg-zinc-800 text-zinc-400 rounded-md hover:text-zinc-200">7d</button>
          <button className="px-2 py-1 text-[10px] text-zinc-600 rounded-md hover:text-zinc-400">30d</button>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area type="monotone" dataKey="inbound" stroke="#4ADE80" fill="url(#inboundGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="outbound" stroke="#3B82F6" fill="url(#outboundGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
