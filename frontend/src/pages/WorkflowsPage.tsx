import { useState, useEffect } from "react";
import { WorkflowCard } from "../components/workflows/WorkflowCard";
import { WorkflowBuilder } from "../components/workflows/WorkflowBuilder";
import { ExecutionMonitor } from "../components/workflows/ExecutionMonitor";
import { workflowApi } from "../services/api";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";
import { PlusIcon } from "@heroicons/react/24/outline";
import { GitBranch, Activity } from "lucide-react";
import { toast } from "sonner";

type TabType = "workflows" | "executions";

export function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("workflows");
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([workflowApi.list(), workflowApi.getExecutions()])
      .then(([wf, ex]) => {
        if (cancelled) return;
        setWorkflows(Array.isArray(wf) ? wf : []);
        setExecutions(Array.isArray(ex) ? ex : []);
      })
      .catch(() => { if (!cancelled) toast.error("Failed to load workflows"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleCreateNew = () => {
    setEditingWorkflow(null);
    setShowBuilder(true);
  };

  const handleEdit = (id: string) => {
    const wf = workflows.find((w) => w.id === id);
    if (wf) {
      setEditingWorkflow(wf);
      setShowBuilder(true);
    }
  };

  const handleSave = async (workflow: any) => {
    try {
      if (editingWorkflow?.id) {
        await workflowApi.update(editingWorkflow.id, workflow);
        toast.success("Workflow updated");
      } else {
        await workflowApi.create(workflow);
        toast.success("Workflow created");
      }
      const refreshed = await workflowApi.list();
      setWorkflows(Array.isArray(refreshed) ? refreshed : []);
    } catch {
      toast.error("Failed to save workflow");
    }
    setShowBuilder(false);
    setEditingWorkflow(null);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const wf = await workflowApi.get(id);
      await workflowApi.create({ ...wf, name: (wf.name || "Workflow") + " (copy)" });
      toast.success("Workflow duplicated");
      const refreshed = await workflowApi.list();
      setWorkflows(Array.isArray(refreshed) ? refreshed : []);
    } catch {
      toast.error("Failed to duplicate workflow");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await workflowApi.delete(id);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      toast.success("Workflow deleted");
    } catch {
      toast.error("Failed to delete workflow");
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await workflowApi.retryExecution(id);
      toast.success("Execution retried");
      const refreshed = await workflowApi.getExecutions();
      setExecutions(Array.isArray(refreshed) ? refreshed : []);
    } catch {
      toast.error("Failed to retry execution");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await workflowApi.cancelExecution(id);
      toast.success("Execution cancelled");
      const refreshed = await workflowApi.getExecutions();
      setExecutions(Array.isArray(refreshed) ? refreshed : []);
    } catch {
      toast.error("Failed to cancel execution");
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div
          className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: `url('${heroBg}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />

        <div className="relative z-20 w-full flex justify-end px-6 md:px-12 lg:px-16 pt-4">
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all"
          >
            <PlusIcon strokeWidth={1.5} className="w-5 h-5" />
            Create Workflow
          </button>
        </div>

        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-8">
          <h1
            className="text-white font-semibold leading-[0.92] tracking-[-0.02em] drop-shadow-xl"
            style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}
          >
            WORKFLOWS
          </h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">
            Automate lead qualification, onboarding, and support with multi-step workflows.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 md:px-12 lg:px-16 py-6 md:py-8 space-y-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#141415] rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("workflows")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "workflows"
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Workflows
            <span className="ml-1 text-xs text-zinc-500">({workflows.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("executions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "executions"
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Activity className="w-4 h-4" />
            Execution Monitor
            <span className="ml-1 text-xs text-zinc-500">({executions.filter((e) => e.status === "active").length} active)</span>
          </button>
        </div>

        {/* Workflow Builder (inline) */}
        {showBuilder && (
          <WorkflowBuilder
            workflow={editingWorkflow}
            onSave={handleSave}
            onClose={() => { setShowBuilder(false); setEditingWorkflow(null); }}
          />
        )}

        {/* Workflows Tab */}
        {activeTab === "workflows" && !showBuilder && (
          loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
              Loading workflows...
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
              No workflows yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf) => (
                <WorkflowCard
                  key={wf.id}
                  id={wf.id}
                  name={wf.name}
                  triggerType={wf.triggerType}
                  keywords={wf.keywords}
                  stepCount={wf.steps.length}
                  activeExecutions={wf.activeExecutions}
                  totalExecutions={wf.totalExecutions}
                  botName={wf.botName}
                  createdAt={wf.createdAt}
                  updatedAt={wf.updatedAt}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onViewExecutions={() => setActiveTab("executions")}
                />
              ))}

              {/* Create New Card */}
              <button
                onClick={handleCreateNew}
                className="bg-[#0f0f11] border-2 border-dashed border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center gap-3 hover:border-green-500/30 hover:bg-green-500/5 transition-all min-h-[200px]"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <PlusIcon strokeWidth={1.5} className="w-6 h-6 text-zinc-500" />
                </div>
                <span className="text-sm font-medium text-zinc-500">Create New Workflow</span>
              </button>
            </div>
          )
        )}

        {/* Executions Tab */}
        {activeTab === "executions" && (
          loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
              Loading executions...
            </div>
          ) : executions.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
              No executions yet
            </div>
          ) : (
            <ExecutionMonitor
              executions={executions}
              onRetry={handleRetry}
              onCancel={handleCancel}
              onReset={(id) => console.log("Reset", id)}
            />
          )
        )}
      </div>
    </div>
  );
}
