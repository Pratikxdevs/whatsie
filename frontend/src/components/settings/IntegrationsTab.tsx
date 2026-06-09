import { Settings, Wifi, WifiOff, AlertCircle } from "lucide-react";

const platforms = [
  { id: "whatsapp", name: "WhatsApp", color: "text-[#25D366]", bgColor: "bg-[#25D366]/10", status: "connected" },
];

const aiProviders = [
  { id: "groq", name: "Groq", model: "Llama 3.1 70B", status: "active" },
  { id: "openai", name: "OpenAI", model: "GPT-4o", status: "active" },
  { id: "gemini", name: "Google Gemini", model: "Gemini 2.0 Flash", status: "inactive" },
];

const statusIcon = (status: string) => {
  if (status === "connected" || status === "active") return <Wifi className="w-4 h-4 text-green-400" />;
  if (status === "error") return <AlertCircle className="w-4 h-4 text-red-400" />;
  return <WifiOff className="w-4 h-4 text-zinc-500" />;
};

export function IntegrationsTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Integrations</h2>
        <p className="text-sm text-zinc-500">Connect your messaging platforms and AI providers.</p>
      </div>

      {/* Platform Integrations */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Messaging Platforms</h3>
        <div className="grid grid-cols-2 gap-3">
          {platforms.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${p.bgColor} flex items-center justify-center`}>
                  <span className={`text-lg font-bold ${p.color}`}>{p.name[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {statusIcon(p.status)}
                    <span className="text-xs text-zinc-500 capitalize">{p.status}</span>
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors">
                <Settings className="w-3 h-3" />
                Configure
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* AI Providers */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">AI Providers</h3>
        <div className="grid grid-cols-3 gap-3">
          {aiProviders.map((ai) => (
            <div key={ai.id} className="p-4 bg-zinc-900 border border-white/5 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">{ai.name}</p>
                {statusIcon(ai.status)}
              </div>
              <p className="text-xs text-zinc-500 mb-3">{ai.model}</p>
              <button className="w-full px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors">
                Configure
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
