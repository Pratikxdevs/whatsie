import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const usageOverTime: any[] = [];

export function UsageChart() {
  if (usageOverTime.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-zinc-500">No usage data available</p>
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={usageOverTime}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
          <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="messages" stroke="#4ade80" fill="#4ade80" fillOpacity={0.1} strokeWidth={2} name="Messages/day" />
          <Area type="monotone" dataKey="tokens" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} strokeWidth={2} name="AI Tokens" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
