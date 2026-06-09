import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, MessageSquare, Bot, BarChart3 } from "lucide-react";

export function CompleteStep() {
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">You're All Set!</h2>
      <p className="text-zinc-400 mb-8">Your workspace is configured and your bot is ready to start handling conversations.</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: Bot, label: "Bot Connected", desc: "Your AI assistant is ready" },
          { icon: MessageSquare, label: "Channels Active", desc: "Ready to receive messages" },
          { icon: BarChart3, label: "Analytics On", desc: "Tracking all metrics" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="p-4 bg-zinc-900 border border-white/5 rounded-xl">
              <Icon className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-white">{item.label}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</p>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => navigate("/dashboard")}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-xl transition-all"
      >
        Go to Dashboard
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
