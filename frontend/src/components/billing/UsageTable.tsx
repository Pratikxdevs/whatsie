/**
 * UsageTable — displays billing usage metrics in a styled table.
 */

export interface BillingUsage {
  id: string;
  metric: string;
  quantity: number;
  periodStart: string;
  periodEnd: string;
}

const METRIC_LABELS: Record<string, string> = {
  messages_sent: 'Messages Sent',
  ai_tokens: 'AI Tokens',
  api_calls: 'API Calls',
  storage_mb: 'Storage (MB)',
};

const METRIC_COLORS: Record<string, string> = {
  messages_sent: '#60A5FA',
  ai_tokens: '#A78BFA',
  api_calls: '#34D399',
  storage_mb: '#FBBF24',
};

interface UsageTableProps {
  usage: BillingUsage[];
}

export function UsageTable({ usage }: UsageTableProps) {
  if (usage.length === 0) {
    return (
      <div className="text-[#7D7D8A] text-sm py-8 text-center">
        No usage data for this period.
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[#2A2A3A]">
          <th className="text-left py-3 px-4 text-[#7D7D8A] font-medium">Metric</th>
          <th className="text-right py-3 px-4 text-[#7D7D8A] font-medium">Quantity</th>
          <th className="text-left py-3 px-4 text-[#7D7D8A] font-medium">Period</th>
        </tr>
      </thead>
      <tbody>
        {usage.map((row, idx) => (
          <tr
            key={row.id}
            className={idx % 2 === 0 ? 'bg-transparent' : 'bg-[#1A1A2E]/50'}
          >
            <td className="py-3 px-4">
              <span
                className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${METRIC_COLORS[row.metric] || '#6B7280'}20`,
                  color: METRIC_COLORS[row.metric] || '#6B7280',
                }}
              >
                {METRIC_LABELS[row.metric] || row.metric}
              </span>
            </td>
            <td className="py-3 px-4 text-right text-white">
              {row.quantity.toLocaleString()}
            </td>
            <td className="py-3 px-4 text-[#7D7D8A]">
              {new Date(row.periodStart).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
