import { Bot, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NoBotGateProps {
  title?: string;
  description?: string;
}

export function NoBotGate({
  title = "Connect a bot to get started",
  description = "This page shows data from your WhatsApp bots. Connect your first bot to see content here.",
}: NoBotGateProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
        <Bot className="w-8 h-8 text-green-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
      <p className="text-zinc-400 text-sm max-w-md mb-8">{description}</p>
      <button
        onClick={() => navigate("/bots")}
        className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-xl transition-all text-sm"
      >
        Add Bot <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
