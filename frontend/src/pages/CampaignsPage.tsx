import { useState, useEffect } from "react";
import { CampaignCard } from "../components/campaigns/CampaignCard";
import { CampaignBuilder } from "../components/campaigns/CampaignBuilder";
import { campaignApi } from "../services/api";
import { Plus, Filter } from "lucide-react";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";
import { toast } from "sonner";

const filterTabs = ["All", "Active", "Scheduled", "Draft", "Completed", "Paused"];

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    campaignApi.list()
      .then((data) => { if (!cancelled) setCampaigns(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) toast.error("Failed to load campaigns"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = activeFilter === "All"
    ? campaigns
    : campaigns.filter((c) => c.status === activeFilter.toLowerCase());

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen" style={{ backgroundImage: `url('${heroBg}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-white font-semibold leading-[0.92] tracking-[-0.02em]" style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}>CAMPAIGNS</h1>
              <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">Create and manage messaging campaigns across platforms.</p>
            </div>
            <button onClick={() => setShowBuilder(true)} className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all">
              <Plus className="w-4 h-4" /> New Campaign
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-6 md:px-12 lg:px-16 py-6 md:py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Campaigns", value: campaigns.length },
            { label: "Active", value: campaigns.filter((c) => c.status === "active").length },
            { label: "Total Sent", value: campaigns.reduce((s, c) => s + c.sentCount, 0).toLocaleString() },
            { label: "Avg Open Rate", value: "64%" },
          ].map((s) => (
            <div key={s.label} className="p-4 bg-[#0f0f11] border border-white/5 rounded-xl">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeFilter === tab
                  ? "bg-green-500/10 text-green-400"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Campaign Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            Loading campaigns...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            No campaigns yet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        )}
      </div>

      {showBuilder && <CampaignBuilder onClose={() => setShowBuilder(false)} />}
    </div>
  );
}
