import { PlatformCard } from "../components/integrations/PlatformCard";
import { Settings, Wifi, WifiOff } from "lucide-react";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";

const platforms = [
  { id: "whatsapp", name: "WhatsApp", color: "text-[#25D366]", bgColor: "bg-[#25D366]/10", status: "connected" as const },
];

const aiProviders = [
  { id: "groq", name: "Groq", model: "Llama 3.1 70B", status: "active" },
  { id: "openai", name: "OpenAI", model: "GPT-4o", status: "active" },
  { id: "gemini", name: "Google Gemini", model: "Gemini 2.0 Flash", status: "inactive" },
];

export function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen" style={{ backgroundImage: `url('${heroBg}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-8">
          <h1 className="text-white font-semibold leading-[0.92] tracking-[-0.02em]" style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}>INTEGRATIONS</h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">Connect your messaging platforms and AI providers.</p>
        </div>
      </div>

      <div className="w-full px-6 md:px-12 lg:px-16 py-6 md:py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-[#0f0f11] border border-white/5 rounded-xl">
            <p className="text-2xl font-bold text-white">{platforms.filter((p) => p.status === "connected").length}</p>
            <p className="text-xs text-zinc-500 mt-1">Platforms Connected</p>
          </div>
          <div className="p-4 bg-[#0f0f11] border border-white/5 rounded-xl">
            <p className="text-2xl font-bold text-white">{platforms.length}</p>
            <p className="text-xs text-zinc-500 mt-1">Available Platforms</p>
          </div>
          <div className="p-4 bg-[#0f0f11] border border-white/5 rounded-xl">
            <p className="text-2xl font-bold text-white">{aiProviders.filter((a) => a.status === "active").length}</p>
            <p className="text-xs text-zinc-500 mt-1">AI Providers Active</p>
          </div>
        </div>

        {/* Platform Integrations */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Messaging Platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {platforms.map((p) => <PlatformCard key={p.id} platform={p} />)}
          </div>
        </section>

        {/* AI Providers */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">AI Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiProviders.map((ai) => (
              <div key={ai.id} className="p-5 bg-zinc-900 border border-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">{ai.name}</h3>
                  {ai.status === "active" ? (
                    <Wifi className="w-4 h-4 text-green-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
                <p className="text-xs text-zinc-500 mb-4">{ai.model}</p>
                <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors">
                  <Settings className="w-3 h-3" />
                  Configure
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
