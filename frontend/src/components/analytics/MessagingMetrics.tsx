import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartCard } from './ChartCard';

import { analyticsApi } from '../../services/api';
import { StatsCard, StatsGrid } from '../ui/stats-card';
import { Clock, MessageSquare, TrendingUp } from 'lucide-react';

export function MessagingMetrics() {
  const [messageVolume, setMessageVolume] = useState<Array<{date: string; inbound: number; outbound: number}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getMessageVolume(30)
      .then(setMessageVolume)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalInbound = messageVolume.reduce((s, d) => s + d.inbound, 0);
  const totalOutbound = messageVolume.reduce((s, d) => s + d.outbound, 0);
  const avgResponseTime = '—';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatsGrid columns={3}>
        <StatsCard label="Total Messages (30d)" value={(totalInbound + totalOutbound).toLocaleString()} change={`${totalInbound.toLocaleString()} in / ${totalOutbound.toLocaleString()} out`} trend="neutral" icon={<MessageSquare className="w-4 h-4 text-green-400" />} />
        <StatsCard label="Avg per Day" value={Math.round((totalInbound + totalOutbound) / 30)} icon={<TrendingUp className="w-4 h-4 text-blue-400" />} />
        <StatsCard label="Avg Response Time" value={avgResponseTime} icon={<Clock className="w-4 h-4 text-yellow-400" />} />
      </StatsGrid>

      <ChartCard title="Messages Over Time" description="Inbound vs outbound messages per day">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={messageVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#a1a1aa' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="inbound" stroke="#25D366" fill="#25D366" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="outbound" stroke="#4ade80" fill="#4ade80" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Messages by Bot" description="Volume per bot across all platforms">
          <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
            No data available
          </div>
        </ChartCard>

        <ChartCard title="Busiest Hours" description="Message volume by day and hour">
          <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
            No data available
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
