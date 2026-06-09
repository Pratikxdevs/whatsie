import { X, Download, Trash2, ArrowRightLeft, UserPlus } from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onDeselectAll: () => void;
  onExport: () => void;
  onDelete: () => void;
  onChangeStatus: () => void;
  onAssignAgent: () => void;
}

export function BulkActions({
  selectedCount,
  onDeselectAll,
  onExport,
  onDelete,
  onChangeStatus,
  onAssignAgent,
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1c20] border border-white/10 rounded-xl px-5 py-3 flex items-center gap-4 shadow-2xl z-40">
      <span className="text-sm text-[#EBEBF0] font-medium">
        {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected
      </span>

      <div className="w-px h-5 bg-white/10" />

      <button onClick={onExport} className="flex items-center gap-1.5 text-xs text-[#7D7D8A] hover:text-[#CCCCD4] transition-colors">
        <Download className="w-3.5 h-3.5" />
        Export
      </button>

      <button onClick={onChangeStatus} className="flex items-center gap-1.5 text-xs text-[#7D7D8A] hover:text-[#CCCCD4] transition-colors">
        <ArrowRightLeft className="w-3.5 h-3.5" />
        Change Status
      </button>

      <button onClick={onAssignAgent} className="flex items-center gap-1.5 text-xs text-[#7D7D8A] hover:text-[#CCCCD4] transition-colors">
        <UserPlus className="w-3.5 h-3.5" />
        Assign Agent
      </button>

      <button onClick={onDelete} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>

      <div className="w-px h-5 bg-white/10" />

      <button onClick={onDeselectAll} className="text-[#7D7D8A] hover:text-[#CCCCD4] transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
