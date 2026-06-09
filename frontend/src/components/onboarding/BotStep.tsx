import { useState } from "react";
import { ArrowRight, ArrowLeft, Bot } from "lucide-react";

interface BotStepProps {
  onNext: (data: { botName: string; systemPrompt: string; aiModel: string }) => void;
  onBack: () => void;
}

export function BotStep({ onNext, onBack }: BotStepProps) {
  const [botName, setBotName] = useState("Sales Assistant");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful sales assistant. Qualify leads by asking about budget, timeline, and team size. Be professional and friendly."
  );
  const [aiModel, setAiModel] = useState("groq");
  const [temperature, setTemperature] = useState(0.7);

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
          <Bot className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Configure Your Bot</h2>
        <p className="text-zinc-400">Set up your AI assistant's behavior and personality.</p>
      </div>

      <div className="space-y-5 text-left">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Bot Name</label>
          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">AI Model</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            >
              <option value="groq">Groq (Llama 3.1 70B)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="gemini">Google (Gemini 2.0 Flash)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
              Temperature: {temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full mt-2 accent-green-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => onNext({ botName, systemPrompt, aiModel })}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-xl transition-all"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
