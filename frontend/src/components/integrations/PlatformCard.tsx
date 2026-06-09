import { Settings, Wifi, WifiOff, AlertCircle } from "lucide-react";

interface Platform {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  status: "connected" | "disconnected" | "error";
}

const statusIcon = (status: string) => {
  if (status === "connected") return <Wifi className="w-4 h-4 text-green-400" />;
  if (status === "error") return <AlertCircle className="w-4 h-4 text-red-400" />;
  return <WifiOff className="w-4 h-4 text-zinc-500" />;
};

const statusLabel: Record<string, string> = {
  connected: "Connected",
  disconnected: "Not Connected",
  error: "Connection Error",
};

export function PlatformCard({ platform }: { platform: Platform }) {
  return (
    <div className="p-5 bg-zinc-900 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${platform.bgColor} flex items-center justify-center`}>
          <span className={`text-xl font-bold ${platform.color}`}>{platform.name[0]}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {statusIcon(platform.status)}
          <span className="text-xs text-zinc-500">{statusLabel[platform.status]}</span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-white mb-3">{platform.name}</h3>
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors">
          <Settings className="w-3 h-3" />
          Configure
        </button>
        <button className={`px-3 py-2 text-xs rounded-lg transition-colors ${
          platform.status === "connected"
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
        }`}>
          {platform.status === "connected" ? "Disconnect" : "Connect"}
        </button>
      </div>
    </div>
  );
}
