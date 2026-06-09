import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { analyticsApi } from "../../services/api";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MessagesOverTimeChart() {
  const [data, setData] = useState<{ day: string; inbound: number; outbound: number }[]>([]);

  useEffect(() => {
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
      .catch(() => {});
  }, []);

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
