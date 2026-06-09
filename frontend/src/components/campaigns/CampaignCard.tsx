import { Calendar, Users, Send, MoreHorizontal, Pause, Play, Trash2 } from "lucide-react";
import { useState } from "react";

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "active" | "completed" | "paused";
  platform: string;
  targetAudience: string;
  scheduledDate?: string;
  sentCount: number;
  totalCount: number;
  openRate?: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-500/10 text-zinc-400",
  scheduled: "bg-blue-500/10 text-blue-400",
  active: "bg-green-500/10 text-green-400",
  completed: "bg-purple-500/10 text-purple-400",
  paused: "bg-yellow-500/10 text-yellow-400",
};

const platformColors: Record<string, string> = {
  whatsapp: "text-[#25D366]",
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [showMenu, setShowMenu] = useState(false);
  const pct = campaign.totalCount > 0 ? Math.round((campaign.sentCount / campaign.totalCount) * 100) : 0;

  return (
    <div className="p-5 bg-zinc-900 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">{campaign.name}</h3>
            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${statusColors[campaign.status]}`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-xs text-zinc-500">{campaign.targetAudience}</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-zinc-500 hover:text-white transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-zinc-800 border border-white/10 rounded-lg py-1 w-36 z-10">
              {campaign.status === "active" && (
                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700">
                  <Pause className="w-3 h-3" /> Pause
                </button>
              )}
              {campaign.status === "paused" && (
                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700">
                  <Play className="w-3 h-3" /> Resume
                </button>
              )}
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-zinc-700">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
        <div className="flex items-center gap-1">
          <Send className={`w-3 h-3 ${platformColors[campaign.platform] || "text-zinc-400"}`} />
          <span className="capitalize">{campaign.platform}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{campaign.targetAudience}</span>
        </div>
        {campaign.scheduledDate && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{campaign.scheduledDate}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-zinc-400">{campaign.sentCount.toLocaleString()} / {campaign.totalCount.toLocaleString()} sent</span>
          <span className="text-zinc-500">{pct}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {campaign.openRate !== undefined && (
        <p className="text-xs text-zinc-500">Open rate: <span className="text-white font-medium">{campaign.openRate}%</span></p>
      )}
    </div>
  );
}
