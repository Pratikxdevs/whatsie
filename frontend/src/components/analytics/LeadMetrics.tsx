import { useState, useEffect } from 'react';
import { ChartCard } from './ChartCard';

import { analyticsApi } from '../../services/api';
import { StatsCard, StatsGrid } from '../ui/stats-card';
import { Users, TrendingUp, Clock } from 'lucide-react';

const PIPELINE_COLORS: Record<string, string> = {
  new: '#606068',
  contacted: '#2563eb',
  qualified: '#f59e0b',
  converted: '#25D366',
  lost: '#ef4444',
};

export function LeadMetrics() {
  const [leadPipeline, setLeadPipeline] = useState<Array<{status: string; count: number; color: string}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getConversionFunnel()
      .then((data: Array<{status: string; count: number}>) =>
        setLeadPipeline(data.map((item) => ({
          ...item,
          color: PIPELINE_COLORS[item.status] || '#71717a',
        })))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalLeads = leadPipeline.reduce((s, d) => s + d.count, 0);
  const conversionRate = totalLeads > 0
    ? ((leadPipeline.find((d) => d.status === 'converted')?.count || 0) / totalLeads * 100).toFixed(1)
    : '0.0';

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
        <StatsCard label="Total Leads (30d)" value={totalLeads} icon={<Users className="w-4 h-4 text-blue-400" />} />
        <StatsCard label="Conversion Rate" value={`${conversionRate}%`} icon={<TrendingUp className="w-4 h-4 text-green-400" />} />
        <StatsCard label="Avg Time to Convert" value="—" icon={<Clock className="w-4 h-4 text-yellow-400" />} />
      </StatsGrid>

      <ChartCard title="Leads Over Time" description="New, qualified, and converted leads per day">
        <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
          No data available
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Lead Pipeline" description="Current lead distribution by status">
          <div className="space-y-3">
            {leadPipeline.map((stage) => (
              <div key={stage.status} className="flex items-center gap-3">
                <span className="w-20 text-xs text-zinc-400 capitalize">{stage.status}</span>
                <div className="flex-1 bg-zinc-800 rounded-full h-5 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(stage.count / totalLeads) * 100}%`, backgroundColor: stage.color }} />
                </div>
                <span className="w-8 text-xs text-zinc-300 text-right font-medium">{stage.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Source Breakdown" description="Leads by platform">
          <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
            No data available
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Conversion Rate by Bot" description="Percentage of leads converted per bot">
        <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
          No data available
        </div>
      </ChartCard>
    </div>
  );
}
