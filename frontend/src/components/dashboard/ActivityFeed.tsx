import { MessageSquare, UserPlus, GitBranch, Bot, Calendar } from "lucide-react";

interface Activity {
  id: string;
  type: "message" | "lead" | "workflow" | "bot" | "appointment";
  title: string;
  description: string;
  time: string;
  platform?: string;
}

const ACTIVITIES: Activity[] = [
  { id: "1", type: "lead", title: "New lead: Carlos Ramirez", description: "Qualified with score 9/10", time: "10:30 AM", platform: "whatsapp" },
  { id: "2", type: "message", title: "Message from Emily Chen", description: "Interested in startup plan", time: "10:15 AM", platform: "whatsapp" },
  { id: "3", type: "workflow", title: "Workflow completed", description: "Lead Qualification — David Kim", time: "9:45 AM" },
  { id: "4", type: "bot", title: 'Bot "Sales Assistant" connected', description: "WhatsApp instance online", time: "9:00 AM", platform: "whatsapp" },
  { id: "5", type: "appointment", title: "Appointment booked", description: "Lisa Park — Wed May 21 10AM", time: "2:15 PM", platform: "whatsapp" },
  { id: "6", type: "lead", title: "Lead converted: Maria Santos", description: "Signed up for Pro plan", time: "Yesterday" },
];

const ICONS = {
  message: MessageSquare,
  lead: UserPlus,
  workflow: GitBranch,
  bot: Bot,
  appointment: Calendar,
};

const COLORS = {
  message: "text-blue-400 bg-blue-400/10",
  lead: "text-emerald-400 bg-emerald-400/10",
  workflow: "text-purple-400 bg-purple-400/10",
  bot: "text-cyan-400 bg-cyan-400/10",
  appointment: "text-yellow-400 bg-yellow-400/10",
};

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
};

export function ActivityFeed() {
  return (
    <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-zinc-200">Activity Feed</h3>
        <button className="text-[11px] text-emerald-400 hover:text-emerald-300">View all</button>
      </div>
      <div className="space-y-3">
        {ACTIVITIES.map((activity) => {
          const Icon = ICONS[activity.type];
          const color = COLORS[activity.type];

          return (
            <div key={activity.id} className="flex items-start gap-3 group cursor-pointer">
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
                {activity.platform && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PLATFORM_COLORS[activity.platform] || "#71717a" }}
                  />
                )}
                <span className="text-[10px] text-zinc-600">{activity.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
