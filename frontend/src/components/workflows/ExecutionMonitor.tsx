import { useState } from "react";
import { RotateCcw, XCircle, RefreshCw, ChevronDown, ChevronRight, Clock, CheckCircle2, AlertCircle, XCircle as XIcon } from "lucide-react";

interface Execution {
  id: string;
  workflowName: string;
  leadName: string;
  leadPhone: string;
  currentStep: string;
  currentStepIndex: number;
  totalSteps: number;
  status: "active" | "completed" | "failed" | "cancelled";
  collectedData: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  duration?: string;
}

interface ExecutionMonitorProps {
  executions: Execution[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onReset: (id: string) => void;
}

const statusConfig = {
  active: { icon: Clock, color: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: "Active" },
  completed: { icon: CheckCircle2, color: "bg-green-500/15 text-green-400 border-green-500/20", label: "Completed" },
  failed: { icon: AlertCircle, color: "bg-red-500/15 text-red-400 border-red-500/20", label: "Failed" },
  cancelled: { icon: XIcon, color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20", label: "Cancelled" },
};

export function ExecutionMonitor({ executions, onRetry, onCancel, onReset }: ExecutionMonitorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filtered = statusFilter
    ? executions.filter((e) => e.status === statusFilter)
    : executions;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        {[null, "active", "completed", "failed", "cancelled"].map((status) => (
          <button
            key={status || "all"}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === status
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-zinc-800 text-zinc-400 border border-transparent hover:text-zinc-300"
            }`}
          >
            {status ? statusConfig[status as keyof typeof statusConfig].label : "All"}
            <span className="ml-1 text-[10px] opacity-60">
              ({status ? executions.filter((e) => e.status === status).length : executions.length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0f0f11] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold w-8" />
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Lead</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Workflow</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Step</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Status</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Started</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Duration</th>
              <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((exec) => {
              const statusCfg = statusConfig[exec.status];
              const StatusIcon = statusCfg.icon;
              const isExpanded = expandedId === exec.id;

              return (
                <>
                  <tr
                    key={exec.id}
                    className="border-b border-white/5 hover:bg-[#141415] cursor-pointer transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : exec.id)}
                  >
                    <td className="py-3 px-4">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium">{exec.leadName}</p>
                        <p className="text-[11px] text-zinc-500">{exec.leadPhone}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{exec.workflowName}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-300 font-mono text-xs">{exec.currentStep}</span>
                        <span className="text-[10px] text-zinc-500">
                          ({exec.currentStepIndex}/{exec.totalSteps})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-500 text-xs">
                      {new Date(exec.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 text-xs">{exec.duration || "—"}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {exec.status === "failed" && (
                          <button
                            onClick={() => onRetry(exec.id)}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Retry"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {exec.status === "active" && (
                          <button
                            onClick={() => onCancel(exec.id)}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Cancel"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(exec.status === "completed" || exec.status === "cancelled") && (
                          <button
                            onClick={() => onReset(exec.id)}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                            title="Reset"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {isExpanded && (
                    <tr key={`${exec.id}-detail`} className="bg-[#0c0c0e]">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="pl-8">
                          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Collected Data
                          </h4>
                          {Object.keys(exec.collectedData).length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {Object.entries(exec.collectedData).map(([key, value]) => (
                                <div key={key} className="bg-zinc-900 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-zinc-500 font-mono">{key}</p>
                                  <p className="text-sm text-zinc-200">{value}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500">No data collected yet</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500 text-sm">
                  No executions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
