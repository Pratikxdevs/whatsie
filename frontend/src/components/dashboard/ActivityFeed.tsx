import * as React from "react";
import { MessageSquare, UserPlus, GitBranch, Bot, Calendar, Loader2 } from "lucide-react";
import { leadApi } from "@/services/api";
import { socketManager } from "@/services/socketManager";
import { useAuth } from "@/contexts/AuthContext";

interface Activity {
  id: string;
  type: "message" | "lead" | "workflow" | "bot" | "appointment";
  title: string;
  description: string;
  time: string;
  platform?: string;
}

const ICONS = {
  message: MessageSquare,
  lead: UserPlus,
  workflow: GitBranch,
  bot: Bot,
  appointment: Calendar,
};

const COLORS = {
  message: "text-primary bg-primary/10",
  lead: "text-emerald-400 bg-emerald-400/10",
  workflow: "text-purple-400 bg-purple-400/10",
  bot: "text-cyan-400 bg-cyan-400/10",
  appointment: "text-yellow-400 bg-yellow-400/10",
};

export function ActivityFeed() {
  const { user } = useAuth();
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    leadApi.getLeads({ limit: 5 })
      .then((leads) => {
        const mapped: Activity[] = leads.map((lead: any) => ({
          id: lead.id,
          type: "lead" as const,
          title: `Lead: ${lead.name}`,
          description: `Status: ${lead.status || 'new'} | Source: ${lead.source || 'WhatsApp'}`,
          time: new Date(lead.updatedAt || lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          platform: "whatsapp"
        }));
        setActivities(mapped);
      })
      .catch((err) => console.error("Failed to load initial activities:", err))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!user?.tenantId) return;

    socketManager.connect(user.tenantId);

    const handleNewMessage = (payload: { chat?: any; message?: any }) => {
      const { chat, message } = payload;
      if (!message) return;

      const text = message.message?.conversation || message.message?.extendedTextMessage?.text || "New message received";
      const senderName = message.pushName || chat?.name || "Contact";

      const newAct: Activity = {
        id: message.id || String(Date.now()),
        type: "message",
        title: `Message from ${senderName}`,
        description: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        platform: "whatsapp"
      };

      setActivities((prev) => [newAct, ...prev.slice(0, 4)]);
    };

    socketManager.on('new_message', handleNewMessage);
    return () => { socketManager.off('new_message', handleNewMessage); };
  }, [user?.tenantId]);

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-zinc-200 font-sans tracking-wide">Activity Feed</h3>
        <span className="text-[10px] text-zinc-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
          Live Feed
        </span>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-4">
          <div className="text-zinc-500 text-xs font-sans">
            No recent activity. Active leads and new messages will appear here in real-time.
          </div>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[320px]">
          {activities.map((activity) => {
            const Icon = ICONS[activity.type] || MessageSquare;
            const color = COLORS[activity.type] || "text-primary bg-primary/10";

            return (
              <div key={activity.id} className="flex items-start gap-3 group cursor-pointer animate-fadeIn">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
                    {activity.title}
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate">{activity.description}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {activity.platform === "whatsapp" && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500" title="WhatsApp" />
                  )}
                  <span className="text-[10px] text-zinc-600">{activity.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
