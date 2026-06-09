import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const DATA = [
  { name: "WhatsApp", value: 4500, color: "#25D366" },
  { name: "Telegram", value: 1200, color: "#26A5E4" },
  { name: "Discord", value: 800, color: "#5865F2" },
  { name: "Messenger", value: 600, color: "#0084FF" },
  { name: "Instagram", value: 400, color: "#E4405F" },
  { name: "Teams", value: 300, color: "#6264A7" },
  { name: "Twitter/X", value: 200, color: "#1DA1F2" },
];

export function PlatformBreakdown() {
  return (
    <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
      <h3 className="text-[13px] font-semibold text-zinc-200 mb-4">Platform Breakdown</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={DATA}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {DATA.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
              formatter={(value: number) => [`${value.toLocaleString()} msgs`, "Messages"]}
            />
            <Legend
              wrapperStyle={{ fontSize: 10 }}
              formatter={(value) => <span style={{ color: "#a1a1aa" }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
