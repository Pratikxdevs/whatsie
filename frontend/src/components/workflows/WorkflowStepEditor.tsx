import { useState } from "react";
import { GripVertical, Trash2, ChevronDown, ChevronUp, ChevronRight, ArrowRight, MessageSquare, Type, Hash, List, Mail, Phone } from "lucide-react";

export interface WorkflowStep {
  key: string;
  prompt: string;
  inputType: "text" | "number" | "choice" | "email" | "phone";
  conditions?: { value: string; nextStep: string }[];
  isBranch?: boolean;
}

interface WorkflowStepEditorProps {
  step: WorkflowStep;
  index: number;
  totalSteps: number;
  onUpdate: (index: number, step: WorkflowStep) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

const inputTypeConfig = {
  text: { icon: Type, label: "Text" },
  number: { icon: Hash, label: "Number" },
  choice: { icon: List, label: "Choice" },
  email: { icon: Mail, label: "Email" },
  phone: { icon: Phone, label: "Phone" },
};

export function WorkflowStepEditor({
  step,
  index,
  totalSteps,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: WorkflowStepEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const InputIcon = inputTypeConfig[step.inputType].icon;

  return (
    <div className="bg-[#0f0f11] border border-white/5 rounded-lg overflow-hidden">
      {/* Step Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#141415] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1 text-zinc-600">
          <GripVertical className="w-4 h-4 cursor-grab" />
        </div>

        <div className="w-7 h-7 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{step.key || "Untitled Step"}</span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400">
              <InputIcon className="w-3 h-3" />
              {inputTypeConfig[step.inputType].label}
            </span>
            {step.isBranch && (
              <span className="px-1.5 py-0.5 bg-yellow-500/10 rounded text-[10px] text-yellow-400">
                Branch
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{step.prompt || "No prompt set"}</p>
        </div>

        <div className="flex items-center gap-1">
          {index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(index); }}
              className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-xs"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
          )}
          {index < totalSteps - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(index); }}
              className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors text-xs"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(index); }}
            className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </div>

      {/* Step Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Step Key */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
              Step Key (variable name)
            </label>
            <input
              type="text"
              value={step.key}
              onChange={(e) => onUpdate(index, { ...step, key: e.target.value })}
              placeholder="e.g. budget, company_name"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50 font-mono"
            />
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
              Bot Prompt
            </label>
            <textarea
              value={step.prompt}
              onChange={(e) => onUpdate(index, { ...step, prompt: e.target.value })}
              placeholder="What should the bot say at this step?"
              rows={3}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50 resize-none"
            />
          </div>

          {/* Input Type */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
              Expected Input
            </label>
            <div className="flex gap-2">
              {Object.entries(inputTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => onUpdate(index, { ...step, inputType: type as WorkflowStep["inputType"] })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      step.inputType === type
                        ? "bg-green-500/15 text-green-400 border border-green-500/20"
                        : "bg-zinc-800 text-zinc-400 border border-transparent hover:text-zinc-300"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Branch Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={step.isBranch || false}
              onChange={(e) => onUpdate(index, { ...step, isBranch: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/50"
            />
            <span className="text-xs text-zinc-400">Enable conditional branching (if/else)</span>
          </label>

          {/* Conditions */}
          {step.isBranch && step.conditions && step.conditions.length > 0 && (
            <div className="space-y-2 pl-4 border-l-2 border-yellow-500/20">
              <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                Conditions
              </label>
              {step.conditions.map((cond, ci) => (
                <div key={ci} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">If value =</span>
                  <input
                    type="text"
                    value={cond.value}
                    onChange={(e) => {
                      const newConditions = [...(step.conditions || [])];
                      newConditions[ci] = { ...cond, value: e.target.value };
                      onUpdate(index, { ...step, conditions: newConditions });
                    }}
                    className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                    placeholder="value"
                  />
                  <span className="text-xs text-zinc-500 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> go to</span>
                  <input
                    type="text"
                    value={cond.nextStep}
                    onChange={(e) => {
                      const newConditions = [...(step.conditions || [])];
                      newConditions[ci] = { ...cond, nextStep: e.target.value };
                      onUpdate(index, { ...step, conditions: newConditions });
                    }}
                    className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                    placeholder="step_key"
                  />
                  <button
                    onClick={() => {
                      const newConditions = (step.conditions || []).filter((_, ci2) => ci2 !== ci);
                      onUpdate(index, { ...step, conditions: newConditions });
                    }}
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  onUpdate(index, {
                    ...step,
                    conditions: [...(step.conditions || []), { value: "", nextStep: "" }],
                  });
                }}
                className="text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                + Add condition
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
