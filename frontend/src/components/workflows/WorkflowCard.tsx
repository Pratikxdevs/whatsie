import { useState } from "react";
import { GitBranch, MoreVertical, Copy, Trash2, Play, FileText, Zap, MessageSquare, Hand } from "lucide-react";

interface WorkflowCardProps {
  id: string;
  name: string;
  triggerType: "keyword" | "intent" | "manual";
  keywords?: string[];
  stepCount: number;
  activeExecutions: number;
  totalExecutions: number;
  botName?: string;
  createdAt: string;
  updatedAt: string;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onViewExecutions: (id: string) => void;
}

const triggerConfig = {
  keyword: { label: "Keyword", icon: Zap, color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  intent: { label: "Intent", icon: MessageSquare, color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  manual: { label: "Manual", icon: Hand, color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
};

export function WorkflowCard({
  id,
  name,
  triggerType,
  keywords,
  stepCount,
  activeExecutions,
  totalExecutions,
  botName,
  createdAt,
  updatedAt,
  onEdit,
  onDuplicate,
  onDelete,
  onViewExecutions,
}: WorkflowCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const trigger = triggerConfig[triggerType];
  const TriggerIcon = trigger.icon;

  return (
    <div className="bg-[#0f0f11] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all group relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{name}</h3>
            <p className="text-xs text-zinc-500">{botName || "Unassigned"}</p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-10 py-1 min-w-[160px]">
              <button
                onClick={() => { onEdit(id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <FileText className="w-4 h-4" /> Edit Workflow
              </button>
              <button
                onClick={() => { onDuplicate(id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <Copy className="w-4 h-4" /> Duplicate
              </button>
              <button
                onClick={() => { onViewExecutions(id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <Play className="w-4 h-4" /> View Runs
              </button>
              <div className="border-t border-white/5 my-1" />
              <button
                onClick={() => { onDelete(id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trigger Badge */}
      <div className="mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${trigger.color}`}>
          <TriggerIcon className="w-3 h-3" />
          {trigger.label} Trigger
        </span>
        {keywords && keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {keywords.slice(0, 3).map((kw) => (
              <span key={kw} className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 font-mono">
                {kw}
              </span>
            ))}
            {keywords.length > 3 && (
              <span className="px-1.5 py-0.5 text-[10px] text-zinc-500">+{keywords.length - 3} more</span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span>{stepCount} steps</span>
        <span className="w-1 h-1 rounded-full bg-zinc-700" />
        <span className={activeExecutions > 0 ? "text-green-400" : ""}>
          {activeExecutions} active
        </span>
        <span className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>{totalExecutions} total runs</span>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-600">
        <span>Updated {new Date(updatedAt).toLocaleDateString()}</span>
        <span>Created {new Date(createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
