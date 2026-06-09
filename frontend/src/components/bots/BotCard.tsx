import { Play, Square, Pencil, Trash2, Loader2, RotateCcw, X } from 'lucide-react';
import type { Bot } from './types';
import { PLATFORM_CONFIG, AI_ENGINE_CONFIG } from './types';
import { PlatformIcon } from './PlatformIcon';
import { BotConnectionStatus } from './BotConnectionStatus';

interface Props {
  bot: Bot;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onEdit?: (id: string) => void;
  onStartStop?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (id: string) => void;
}

export function BotCard({ bot, selected, onSelect, onEdit, onStartStop, onDelete, onClick }: Props) {
  const platformCfg = PLATFORM_CONFIG[bot.platform] || { label: bot.platform, color: '#71717a', icon: 'HelpCircle', supported: false };
  const engineCfg = AI_ENGINE_CONFIG[bot.aiEngine] || { label: bot.aiEngine, color: '#71717a' };
  const isConnected = bot.status === 'connected';
  const isDisconnected = bot.status === 'disconnected';
  const isPending = bot.status === 'pending_qr' || bot.status === 'starting';
  const isError = bot.status === 'error';

  return (
    <div
      className={`group relative flex flex-col bg-zinc-900 border rounded-xl overflow-hidden transition-all cursor-pointer ${
        selected ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-zinc-800 hover:border-zinc-700'
      }`}
      onClick={() => onClick?.(bot.id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={e => { e.stopPropagation(); onSelect?.(bot.id); }}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30"
          />
          <PlatformIcon platform={bot.platform} size={18} />
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 leading-tight">{bot.name}</h3>
            <span className="text-xs text-zinc-500">{platformCfg.label}</span>
          </div>
        </div>
        <BotConnectionStatus status={bot.status} lastConnected={bot.lastConnected} />
      </div>

      {/* Identifier */}
      <div className="px-4 pb-2">
        <span className="text-xs text-zinc-400 font-mono">{bot.identifier}</span>
      </div>

      {/* Metrics */}
      <div className="flex border-t border-zinc-800">
        <div className="flex-1 flex flex-col items-center py-3 border-r border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">AI Engine</span>
          <span className="text-xs font-medium mt-0.5" style={{ color: engineCfg.color }}>{engineCfg.label}</span>
        </div>
        <div className="flex-1 flex flex-col items-center py-3 border-r border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Active Leads</span>
          <span className={`text-xs font-medium mt-0.5 ${isDisconnected ? 'text-zinc-600' : 'text-zinc-200'}`}>
            {isDisconnected ? '—' : bot.activeLeads}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center py-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Today</span>
          <span className={`text-xs font-medium mt-0.5 ${isDisconnected ? 'text-zinc-600' : 'text-zinc-200'}`}>
            {isDisconnected ? '—' : bot.messagesToday}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 px-3 py-2 bg-zinc-950/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onEdit?.(bot.id); }}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
        {isPending ? (
          <>
            <button
              disabled
              className="p-1.5 rounded-md text-amber-400 opacity-70 cursor-not-allowed"
              title={bot.status === 'pending_qr' ? 'Waiting for QR scan' : 'Starting...'}
            >
              <Loader2 size={14} className="animate-spin" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onStartStop?.(bot.id); }}
              className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </>
        ) : isConnected ? (
          <button
            onClick={e => { e.stopPropagation(); onStartStop?.(bot.id); }}
            className="p-1.5 rounded-md text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
            title="Stop"
          >
            <Square size={14} />
          </button>
        ) : isError ? (
          <button
            onClick={e => { e.stopPropagation(); onStartStop?.(bot.id); }}
            className="p-1.5 rounded-md text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
            title="Restart"
          >
            <RotateCcw size={14} />
          </button>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onStartStop?.(bot.id); }}
            className="p-1.5 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
            title="Start"
          >
            <Play size={14} />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete?.(bot.id); }}
          className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
