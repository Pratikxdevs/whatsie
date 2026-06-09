import { useState } from "react";
import { AlertTriangle, Download, Trash2, Loader2 } from "lucide-react";
import { settingsApi } from "../../services/api";
import { toast } from "sonner";

export function DangerZoneTab() {
  const [confirmText, setConfirmText] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = confirmText === "DELETE";

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await settingsApi.exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "workspace-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await settingsApi.deleteWorkspace();
      toast.success("Workspace deleted");
      window.location.href = "/";
    } catch {
      toast.error("Failed to delete workspace");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-red-400 mb-1">Danger Zone</h2>
        <p className="text-sm text-zinc-500">Irreversible actions. Proceed with caution.</p>
      </div>

      {/* Export Data */}
      <div className="p-5 bg-zinc-900 border border-white/5 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white">Export All Data</h3>
            <p className="text-xs text-zinc-500 mt-1">Download a complete export of your workspace data including leads, conversations, and configurations.</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-zinc-300 text-sm rounded-xl transition-all"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export
          </button>
        </div>
      </div>

      {/* Delete Tenant */}
      <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-400">Delete Workspace</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Permanently delete this workspace and all associated data. This action cannot be undone.
              All bots, conversations, leads, and team members will be removed.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Type <span className="font-mono text-red-400">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-zinc-900 border border-red-500/30 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
            />
          </div>
          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-600/30 disabled:text-red-400/50 text-white font-semibold text-sm rounded-xl transition-all"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
