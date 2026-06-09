import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, MessageSquare, Users, TrendingUp, MessageCircle, GitBranch, DollarSign, Clock, ThumbsUp, Zap } from "lucide-react";
import { StatsCard, StatsGrid } from "../components/ui/stats-card";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { LeadPipelineFunnel } from "../components/dashboard/LeadPipelineFunnel";
import { BotHealthGrid } from "../components/dashboard/BotHealthGrid";
import { MessagesOverTimeChart } from "../components/dashboard/MessagesOverTimeChart";
import { PlatformBreakdown } from "../components/dashboard/PlatformBreakdown";
import { analyticsApi } from "../services/api";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";

interface DashboardStats {
  totalBots: number;
  activeBots: number;
  totalLeads: number;
  openConversations: number;
  qualifiedLeads: number;
  conversionRate: number;
  messagesThisMonth: number;
  workflowsActive: number;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getDashboardStats()
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      {/* Hero */}
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div
          className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: `url('${heroBg}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative z-10 w-full px-3 md:px-6 lg:px-8 flex-1 flex flex-col justify-end pb-5">
          <h1
            className="text-white font-semibold leading-[0.92] tracking-[-0.02em]"
            style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}
          >
            DASHBOARD
          </h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">
            Real-time overview of your CRM performance across all platforms.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-3 md:px-6 lg:px-8 py-5 space-y-5">
        {/* Primary Stats */}
        <StatsGrid columns={6}>
          <StatsCard label="Active Bots" value={loading ? "..." : (stats?.activeBots ?? 0)} change="+1 this week" trend="up" icon={<Bot size={20} />} className="!min-h-[160px] !p-5" onClick={() => navigate("/bots")} />
          <StatsCard label="Open Conversations" value={loading ? "..." : (stats?.openConversations ?? 0)} change="+3 today" trend="up" icon={<MessageSquare size={20} />} className="!min-h-[160px] !p-5" onClick={() => navigate("/conversations")} />
          <StatsCard label="Total Leads" value={loading ? "..." : (stats?.totalLeads ?? 0)} change="+2 vs last week" trend="up" icon={<Users size={20} />} className="!min-h-[160px] !p-5" onClick={() => navigate("/leads")} />
          <StatsCard label="Conversion Rate" value={loading ? "..." : `${stats?.conversionRate ?? 0}%`} change="+3% vs last month" trend="up" icon={<TrendingUp size={20} />} className="!min-h-[160px] !p-5" />
          <StatsCard label="Messages This Month" value={loading ? "..." : (stats?.messagesThisMonth ?? 0)} change="+12% vs avg" trend="up" icon={<MessageCircle size={20} />} className="!min-h-[160px] !p-5" />
          <StatsCard label="Active Workflows" value={loading ? "..." : (stats?.workflowsActive ?? 0)} change="No change" trend="neutral" icon={<GitBranch size={20} />} className="!min-h-[160px] !p-5" onClick={() => navigate("/workflows")} />
        </StatsGrid>

        {/* Secondary Stats */}
        {/* TODO: Replace hardcoded values with real API endpoints when backend adds revenue, response time, satisfaction, and AI accuracy metrics */}
        <StatsGrid columns={4}>
          <StatsCard label="Revenue (MTD)" value="$12.4k" change="+8% vs last month" trend="up" icon={<DollarSign size={20} />} className="!min-h-[160px] !p-5" onClick={() => navigate("/billing")} />
          <StatsCard label="Avg Response Time" value="1.2s" change="-0.3s vs avg" trend="up" icon={<Clock size={20} />} className="!min-h-[160px] !p-5" />
          <StatsCard label="Satisfaction Score" value="94%" change="+2% this week" trend="up" icon={<ThumbsUp size={20} />} className="!min-h-[160px] !p-5" />
          <StatsCard label="AI Accuracy" value="91%" change="+1.5% vs last month" trend="up" icon={<Zap size={20} />} className="!min-h-[160px] !p-5" />
        </StatsGrid>

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

        {/* Platform Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PlatformBreakdown />
        </div>
      </div>
    </div>
  );
}
