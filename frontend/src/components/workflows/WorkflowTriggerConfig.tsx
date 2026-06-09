import { Zap, MessageSquare, Hand } from "lucide-react";

interface WorkflowTriggerConfigProps {
  triggerType: "keyword" | "intent" | "manual";
  keywords: string[];
  botId: string;
  fallbackAction: "handoff" | "restart" | "ignore";
  onUpdate: (config: {
    triggerType: "keyword" | "intent" | "manual";
    keywords: string[];
    botId: string;
    fallbackAction: "handoff" | "restart" | "ignore";
  }) => void;
}

const triggerOptions = [
  { value: "keyword", label: "Keyword", icon: Zap, description: "Trigger when message contains specific words" },
  { value: "intent", label: "Intent", icon: MessageSquare, description: "Trigger when AI detects a specific intent" },
  { value: "manual", label: "Manual", icon: Hand, description: "Trigger manually or via API" },
] as const;

const fallbackOptions = [
  { value: "handoff", label: "Hand off to agent" },
  { value: "restart", label: "Restart workflow" },
  { value: "ignore", label: "Ignore message" },
] as const;

export function WorkflowTriggerConfig({
  triggerType,
  keywords,
  botId,
  fallbackAction,
  onUpdate,
}: WorkflowTriggerConfigProps) {
  return (
    <div className="space-y-4">
      {/* Trigger Type */}
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
          Trigger Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {triggerOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => onUpdate({ triggerType: opt.value, keywords, botId, fallbackAction })}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                  triggerType === opt.value
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-300"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-zinc-500 mt-1.5">
          {triggerOptions.find((o) => o.value === triggerType)?.description}
        </p>
      </div>

      {/* Keywords (only for keyword trigger) */}
      {triggerType === "keyword" && (
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
            Trigger Keywords
          </label>
          <input
            type="text"
            value={keywords.join(", ")}
            onChange={(e) =>
              onUpdate({
                triggerType,
                keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
                botId,
                fallbackAction,
              })
            }
            placeholder="price, quote, how much, cost (comma-separated)"
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50"
          />
          <p className="text-[10px] text-zinc-600 mt-1">Separate multiple keywords with commas</p>
        </div>
      )}

      {/* Bot Assignment */}
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
          Assigned Bot
        </label>
        <select
          value={botId}
          onChange={(e) => onUpdate({ triggerType, keywords, botId: e.target.value, fallbackAction })}
          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-green-500/50"
        >
          <option value="">Select a bot...</option>
          <option value="bot-001">Sales Assistant (WhatsApp)</option>
          <option value="bot-002">Support Bot (Telegram)</option>
          <option value="bot-003">Lead Qualifier (Discord)</option>
          <option value="bot-004">Scheduler Bot (Messenger)</option>
          <option value="bot-005">Instagram Responder</option>
          <option value="bot-006">Teams Helper</option>
        </select>
      </div>

      {/* Fallback Action */}
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
          Fallback Action
        </label>
        <select
          value={fallbackAction}
          onChange={(e) =>
            onUpdate({
              triggerType,
              keywords,
              botId,
              fallbackAction: e.target.value as "handoff" | "restart" | "ignore",
            })
          }
          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-green-500/50"
        >
          {fallbackOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
