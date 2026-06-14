import { useState, useEffect } from 'react';
import { PlanCard } from '../components/billing/PlanCard';
import { UsageMeter } from '../components/billing/UsageMeter';
import { UsageChart } from '../components/billing/UsageChart';
import { InvoiceTable } from '../components/billing/InvoiceTable';
import { ChartCard } from '../components/analytics/ChartCard';
import { billingApi } from '../services/api';
import heroBg from '../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png';

interface BillingRecord {
  id: string;
  tenantId: string;
  metric: string;
  quantity: number;
  periodStart: string;
  periodEnd: string;
}

const METRIC_META: Record<string, { label: string; unit: string; total: number; divisor?: number }> = {
  messages_sent: { label: 'Messages', unit: 'msgs/day', total: 1000 },
  ai_tokens: { label: 'AI Tokens', unit: 'tokens', total: 100000 },
  storage_mb: { label: 'Storage', unit: 'GB', total: 5, divisor: 1000 },
  api_calls: { label: 'API Calls', unit: 'calls', total: 100000 },
};

// Plans not yet implemented -- no backend model
const plans: any[] = [];

export function BillingPage() {
  const [usageMeters, setUsageMeters] = useState<{ label: string; used: number; total: number; unit: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    billingApi.getUsage()
      .then((data: BillingRecord[]) => {
        if (cancelled) return;
        const latestByMetric = new Map<string, BillingRecord>();
        for (const record of data) {
          const existing = latestByMetric.get(record.metric);
          if (!existing || new Date(record.periodStart) > new Date(existing.periodStart)) {
            latestByMetric.set(record.metric, record);
          }
        }
        const meters = [...latestByMetric.values()].map((r) => {
          const meta = METRIC_META[r.metric] ?? { label: r.metric, unit: 'units', total: r.quantity * 2 };
          const divisor = meta.divisor ?? 1;
          return { label: meta.label, used: r.quantity / divisor, total: meta.total, unit: meta.unit };
        });
        setUsageMeters(meters);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      {/* Hero */}
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen" style={{ backgroundImage: `url('${heroBg}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative z-20 w-full">
        </div>
        <div className="relative z-10 w-full page-padding flex-1 flex flex-col justify-end pb-8">
          <h1 className="text-white font-semibold leading-[0.92] tracking-[-0.02em]" style={{ fontSize: 'clamp(52px, 9vw, 108px)', lineHeight: 0.92 }}>
            BILLING
          </h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">
            Monitor usage and manage your subscription across all platforms.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="w-full page-padding py-6 md:py-8 space-y-8">
        {/* Plans Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Choose Your Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.length > 0 ? (
              plans.map((plan: any) => (
                <PlanCard key={plan.id} {...plan} />
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-zinc-500 text-sm">No plans available</div>
            )}
          </div>
        </section>

        {/* Usage Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            Current Usage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-zinc-900/50 rounded-lg border border-white/5 p-4 h-24 animate-pulse" />
                ))
              : usageMeters.map((meter) => (
                  <UsageMeter key={meter.label} {...meter} />
                ))}
          </div>
          <ChartCard title="Usage Over Time" description="Messages and AI token usage over the current billing period">
            <UsageChart />
          </ChartCard>
        </section>

        {/* Invoices Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full" />
            Invoice History
          </h2>
          <div className="bg-zinc-900/50 rounded-lg border border-white/5 overflow-hidden">
            <InvoiceTable />
          </div>
        </section>
      </div>
    </div>
  );
}
