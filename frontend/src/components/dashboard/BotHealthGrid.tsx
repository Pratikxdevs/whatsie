import { useState, useEffect } from "react";
import { botApi, type Workspace } from "../../services/api";

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
};

export function BotHealthGrid() {
  const [bots, setBots] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    botApi.getWorkspaces()
      .then((data) => setBots(data))
      .catch((err) => console.error("Bot health load failed:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 animate-pulse">
        <div className="h-4 w-24 bg-zinc-800 rounded mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-850">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-zinc-800" />
                <div className="space-y-1">
                  <div className="h-3 w-20 bg-zinc-800 rounded" />
                  <div className="h-2 w-12 bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="h-3 w-8 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center min-h-[150px]">
        <h3 className="text-[13px] font-semibold text-zinc-200 mb-2 align-self-start self-start">Bot Health</h3>
        <span className="text-zinc-500 text-xs font-sans mt-4">No bots registered.</span>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
      <h3 className="text-[13px] font-semibold text-zinc-200 mb-4">Bot Health</h3>
      <div className="space-y-2">
        {bots.map((bot) => (
          <div
            key={bot.id}
            className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: bot.whatsapp_status === "connected" ? "#4ADE80" : "#F87171" }}
              />
              <div>
                <div className="text-[12px] font-medium text-zinc-300">{bot.name}</div>
                <div className="text-[10px] text-zinc-600 capitalize">{bot.platform || "whatsapp"}</div>
              </div>
            </div>
            <div className="text-right">
              <div
                className="w-2 h-2 rounded-full ml-auto"
                style={{ backgroundColor: PLATFORM_COLORS[bot.platform || "whatsapp"] || "#71717a" }}
              />
              <div className="text-[9px] text-zinc-600 mt-0.5">{bot.whatsapp_status?.toLowerCase() || "unknown"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
