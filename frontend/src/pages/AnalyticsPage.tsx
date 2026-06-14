import { useState, useEffect } from 'react';
import { DateRangePicker } from '../components/analytics/DateRangePicker';
import { MessagingMetrics } from '../components/analytics/MessagingMetrics';
import { LeadMetrics } from '../components/analytics/LeadMetrics';
import { AIPerformance } from '../components/analytics/AIPerformance';
import { BotPerformance } from '../components/analytics/BotPerformance';
import { Download, Filter, Loader2 } from 'lucide-react';
import heroBg from '../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png';
import { NoBotGate } from '../components/ui/NoBotGate';
import { botApi } from '../services/api';

type DateRange = '7d' | '30d' | '90d' | 'custom';
type Tab = 'messaging' | 'leads' | 'ai' | 'bots';

const tabs: { label: string; value: Tab }[] = [
  { label: 'Messaging', value: 'messaging' },
  { label: 'Leads', value: 'leads' },
  { label: 'AI Performance', value: 'ai' },
  { label: 'Bots', value: 'bots' },
];

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('messaging');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [hasBots, setHasBots] = useState<boolean | null>(null);

  useEffect(() => {
    botApi.getWorkspaces()
      .then((bots: any[]) => setHasBots(Array.isArray(bots) && bots.length > 0))
      .catch(() => setHasBots(false));
  }, []);

  if (hasBots === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (hasBots === false) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200">
        <NoBotGate
          title="Connect a bot to view analytics"
          description="Analytics are generated from your WhatsApp bot activity. Connect your first bot to see performance metrics here."
        />
      </div>
    );
  }

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
            ANALYTICS
          </h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">
            Track performance metrics and conversion insights across all your platforms.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="w-full page-padding py-6 md:py-8 space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-zinc-900 border border-white/10 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.value
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <DateRangePicker value={dateRange} onChange={setDateRange} />

            <button className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
              <Filter className="w-4 h-4" />
              Bots
            </button>

            <button className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'messaging' && <MessagingMetrics />}
        {activeTab === 'leads' && <LeadMetrics />}
        {activeTab === 'ai' && <AIPerformance />}
        {activeTab === 'bots' && <BotPerformance />}
      </div>
    </div>
  );
}
