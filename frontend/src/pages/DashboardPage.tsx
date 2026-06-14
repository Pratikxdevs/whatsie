import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, MessageSquare, Users, TrendingUp, MessageCircle } from "lucide-react";
import { StatsCard } from "../components/ui/stats-card";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { LeadPipelineFunnel } from "../components/dashboard/LeadPipelineFunnel";
import { BotHealthGrid } from "../components/dashboard/BotHealthGrid";
import { MessagesOverTimeChart } from "../components/dashboard/MessagesOverTimeChart";
import { analyticsApi } from "../services/api";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";

interface DashboardStats {
  activeBots: number;
  totalLeads: number;
  openConversations: number;
  conversionRate: number;
  messagesThisMonth: number;
}

function StatsCardSkeleton() {
  return (
    <div className="flex flex-col justify-between gap-2 p-5 rounded-xl bg-zinc-900 border border-white/5 min-h-[160px] animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-24 bg-zinc-800 rounded" />
        <div className="h-5 w-5 bg-zinc-800 rounded-full" />
      </div>
      <div className="flex items-end justify-between mt-4">
        <div className="h-8 w-16 bg-zinc-800 rounded" />
        <div className="h-3 w-16 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsApi.getDashboardStats()
      .then((data) => setStats(data))
      .catch((err) => console.error("Failed to load dashboard stats:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      {/* Hero */}
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div
          className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: `url('${heroBg}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative z-10 w-full page-padding flex-1 flex flex-col justify-end pb-5">
          <h1
            className="text-white font-semibold leading-[0.92] tracking-[-0.02em]"
            style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}
          >
            DASHBOARD
          </h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">
            Real-time overview of your WhatsApp CRM performance.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="w-full page-padding py-5 space-y-5">
        {/* Primary Stats */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatsCard label="Active Bots" value={stats?.activeBots ?? 0} change="Online" trend="up" icon={<Bot size={20} />} className="!min-h-[160px] !p-5 cursor-pointer" onClick={() => navigate("/bots")} />
            <StatsCard label="Open Conversations" value={stats?.openConversations ?? 0} change="Live Chats" trend="up" icon={<MessageSquare size={20} />} className="!min-h-[160px] !p-5 cursor-pointer" onClick={() => navigate("/conversations")} />
            <StatsCard label="Total Leads" value={stats?.totalLeads ?? 0} change="WhatsApp Leads" trend="up" icon={<Users size={20} />} className="!min-h-[160px] !p-5 cursor-pointer" onClick={() => navigate("/leads")} />
            <StatsCard label="Messages (MTD)" value={stats?.messagesThisMonth ?? 0} change="Volume" trend="up" icon={<MessageCircle size={20} />} className="!min-h-[160px] !p-5" />
            <StatsCard label="Conversion Rate" value={`${stats?.conversionRate ?? 0}%`} change="Leads Converted" trend="up" icon={<TrendingUp size={20} />} className="!min-h-[160px] !p-5" />
          </div>
        )}

        {/* Activity + Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActivityFeed />
          <LeadPipelineFunnel />
        </div>

        {/* Bot Health + Messages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BotHealthGrid />
          <MessagesOverTimeChart />
        </div>
      </div>
    </div>
  );
}
