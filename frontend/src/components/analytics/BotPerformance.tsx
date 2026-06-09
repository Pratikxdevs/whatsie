import { ChartCard } from './ChartCard';

import { StatsCard, StatsGrid } from '../ui/stats-card';
import { Activity, MessageSquare, Users, AlertCircle } from 'lucide-react';

export function BotPerformance() {
  return (
    <div className="space-y-4">
      <StatsGrid columns={4}>
        <StatsCard label="Avg Uptime" value="—" icon={<Activity className="w-4 h-4 text-green-400" />} />
        <StatsCard label="Total Conversations" value="—" icon={<MessageSquare className="w-4 h-4 text-blue-400" />} />
        <StatsCard label="Total Leads" value="—" icon={<Users className="w-4 h-4 text-purple-400" />} />
        <StatsCard label="Avg Error Rate" value="—" icon={<AlertCircle className="w-4 h-4 text-red-400" />} />
      </StatsGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Uptime by Bot" description="Percentage uptime over 30 days">
          <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
            No data available
          </div>
        </ChartCard>

        <ChartCard title="Conversations by Bot" description="Total conversations per bot">
          <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
            No data available
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Leads Captured by Bot" description="New leads attributed to each bot">
        <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
          No data available
        </div>
      </ChartCard>
    </div>
  );
}
