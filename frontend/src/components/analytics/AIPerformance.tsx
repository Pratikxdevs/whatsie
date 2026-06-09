import { ChartCard } from './ChartCard';

import { StatsCard, StatsGrid } from '../ui/stats-card';
import { Cpu, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';

export function AIPerformance() {
  return (
    <div className="space-y-4">
      <StatsGrid columns={4}>
        <StatsCard label="Total Tokens (30d)" value="—" icon={<Cpu className="w-4 h-4 text-purple-400" />} />
        <StatsCard label="Total Cost (30d)" value="—" icon={<DollarSign className="w-4 h-4 text-green-400" />} />
        <StatsCard label="Workflow Completion" value="—" icon={<CheckCircle className="w-4 h-4 text-green-400" />} />
        <StatsCard label="Fallback Rate" value="—" icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />} />
      </StatsGrid>

      <ChartCard title="Token Usage Over Time" description="Daily AI token consumption and cost">
        <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
          No data available
        </div>
      </ChartCard>

      <ChartCard title="Cost Breakdown by Model" description="Token spend distribution across AI providers">
        <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
          No data available
        </div>
      </ChartCard>
    </div>
  );
}
