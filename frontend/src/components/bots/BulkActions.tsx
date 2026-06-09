import { Play, Square, Trash2, X } from 'lucide-react';

export function BulkActions({ count, onStartAll, onStopAll, onDeleteAll, onDeselect }: {
  count: number;
  onStartAll: () => void;
  onStopAll: () => void;
  onDeleteAll: () => void;
  onDeselect: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-zinc-900 border border-zinc-700 rounded-xl px-5 py-3 shadow-2xl">
      <span className="text-sm text-zinc-300 font-medium">{count} bot{count > 1 ? 's' : ''} selected</span>
      <div className="w-px h-5 bg-zinc-700" />
      <button onClick={onStartAll} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
        <Play size={14} /> Start All
      </button>
      <button onClick={onStopAll} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
        <Square size={14} /> Stop All
      </button>
      <button onClick={onDeleteAll} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
        <Trash2 size={14} /> Delete All
      </button>
      <div className="w-px h-5 bg-zinc-700" />
      <button onClick={onDeselect} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}
