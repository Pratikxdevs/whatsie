import { useState } from "react";
import { Plus, Save, X, Settings } from "lucide-react";
import { WorkflowStepEditor, type WorkflowStep } from "./WorkflowStepEditor";
import { WorkflowTriggerConfig } from "./WorkflowTriggerConfig";

interface WorkflowBuilderProps {
  workflow?: {
    id: string;
    name: string;
    triggerType: "keyword" | "intent" | "manual";
    keywords: string[];
    botId: string;
    fallbackAction: "handoff" | "restart" | "ignore";
    steps: WorkflowStep[];
  };
  onSave: (workflow: any) => void;
  onClose: () => void;
}

export function WorkflowBuilder({ workflow, onSave, onClose }: WorkflowBuilderProps) {
  const [name, setName] = useState(workflow?.name || "");
  const [showTriggerConfig, setShowTriggerConfig] = useState(false);
  const [triggerConfig, setTriggerConfig] = useState({
    triggerType: workflow?.triggerType || "keyword" as const,
    keywords: workflow?.keywords || [],
    botId: workflow?.botId || "",
    fallbackAction: workflow?.fallbackAction || "handoff" as const,
  });
  const [steps, setSteps] = useState<WorkflowStep[]>(
    workflow?.steps || [
      { key: "greeting", prompt: "Hello! How can I help you today?", inputType: "text" },
    ]
  );

  const addStep = () => {
    setSteps([
      ...steps,
      { key: `step_${steps.length + 1}`, prompt: "", inputType: "text" },
    ]);
  };

  const updateStep = (index: number, step: WorkflowStep) => {
    const newSteps = [...steps];
    newSteps[index] = step;
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (from: number, to: number) => {
    const newSteps = [...steps];
    const [moved] = newSteps.splice(from, 1);
    newSteps.splice(to, 0, moved);
    setSteps(newSteps);
  };

  const handleSave = () => {
    onSave({
      id: workflow?.id || `wf-${Date.now()}`,
      name,
      ...triggerConfig,
      steps,
      createdAt: workflow?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-[#0c0c0e] border border-white/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workflow Name"
            className="bg-transparent text-lg font-semibold text-white placeholder:text-zinc-600 focus:outline-none border-b border-transparent focus:border-green-500/50 pb-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTriggerConfig(!showTriggerConfig)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showTriggerConfig
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-300 border border-transparent"
            }`}
          >
            <Settings className="w-4 h-4" />
            Trigger
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-medium text-sm rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Trigger Config Sidebar */}
        {showTriggerConfig && (
          <div className="w-72 border-r border-white/5 p-4 flex-shrink-0">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Trigger Configuration
            </h3>
            <WorkflowTriggerConfig
              triggerType={triggerConfig.triggerType}
              keywords={triggerConfig.keywords}
              botId={triggerConfig.botId}
              fallbackAction={triggerConfig.fallbackAction}
              onUpdate={setTriggerConfig}
            />
          </div>
        )}

        {/* Steps Editor */}
        <div className="flex-1 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Workflow Steps ({steps.length})
            </h3>
          </div>

          {/* Vertical Timeline */}
          <div className="space-y-3 relative">
            {/* Timeline Line */}
            {steps.length > 1 && (
              <div className="absolute left-[19px] top-10 bottom-10 w-0.5 bg-zinc-800" />
            )}

            {steps.map((step, index) => (
              <div key={index} className="relative">
                <WorkflowStepEditor
                  step={step}
                  index={index}
                  totalSteps={steps.length}
                  onUpdate={updateStep}
                  onRemove={removeStep}
                  onMoveUp={(i) => moveStep(i, i - 1)}
                  onMoveDown={(i) => moveStep(i, i + 1)}
                />
              </div>
            ))}
          </div>

          {/* Add Step Button */}
          <button
            onClick={addStep}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-800 rounded-lg text-zinc-500 hover:text-green-400 hover:border-green-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Step</span>
          </button>
        </div>
      </div>
    </div>
  );
}
