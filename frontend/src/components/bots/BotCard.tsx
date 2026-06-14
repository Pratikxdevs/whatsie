import { Play, Square, Pencil, Trash2, Loader2, RotateCcw, Cpu, Zap, Activity } from 'lucide-react';
import type { Bot } from './types';
import { PlatformIcon } from './PlatformIcon';
import { BotConnectionStatus } from './BotConnectionStatus';
import { resolveProviderLogo } from '../../lib/brand-resolver';

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
  const isConnected = bot.status === 'connected';
  const isPending = bot.status === 'pending_qr' || bot.status === 'starting';
  const isError = bot.status === 'error';
  
  const aiLogo = resolveProviderLogo(bot.aiEngine);

  return (
    <div
      className={`group relative grid grid-cols-1 lg:grid-cols-3 bg-zinc-900 border rounded-2xl overflow-hidden transition-all cursor-pointer ${
        selected ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-zinc-800 hover:border-zinc-700'
      }`}
      onClick={() => onClick?.(bot.id)}
    >
      {/* Primary Block: WhatsApp Connection */}
      <div className="p-5 lg:border-r border-zinc-800 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selected}
              onChange={e => { e.stopPropagation(); onSelect?.(bot.id); }}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30"
            />
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <PlatformIcon platform="whatsapp" size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 leading-tight">{bot.name}</h3>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{bot.identifier || 'Unlinked'}</span>
            </div>
          </div>
        </div>
        <BotConnectionStatus status={bot.status} lastConnected={bot.lastConnected} />
      </div>

      {/* Secondary Block: AI Engine Config */}
      <div className="p-5 lg:border-r border-t lg:border-t-0 border-zinc-800 flex flex-col justify-center items-center bg-zinc-900/50">
        <img src={aiLogo} alt="AI Provider" className="w-10 h-10 rounded shadow-lg mb-3 object-cover bg-zinc-950 p-1" />
        <h4 className="text-xs font-semibold text-zinc-200">{bot.model || 'Default Model'}</h4>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Cpu size={12} />
            <span className="text-[10px] font-mono">{bot.maxTokens} tkns</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Zap size={12} />
            <span className="text-[10px] font-mono">T {bot.temperature}</span>
          </div>
        </div>
      </div>

      {/* Tertiary Block: Usage Analytics & Actions */}
      <div className="p-5 border-t lg:border-t-0 border-zinc-800 flex flex-col justify-between relative">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 text-zinc-400">
            <Activity size={14} className="text-emerald-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Pulse</span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-zinc-100">{bot.activeLeads}</div>
            <div className="text-[10px] text-zinc-500 uppercase">Active Leads</div>
          </div>
        </div>

        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2 mb-4">
          {/* Mock token meter fill */}
          <div className="bg-primary h-full w-[45%]" />
        </div>

        {/* Actions Menu overlay on hover */}
        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button onClick={e => { e.stopPropagation(); onEdit?.(bot.id); }} className="p-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all shadow-xl">
            <Pencil size={16} />
          </button>
          
          {isPending ? (
            <button disabled className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 cursor-wait">
              <Loader2 size={16} className="animate-spin" />
            </button>
          ) : isConnected ? (
            <button onClick={e => { e.stopPropagation(); onStartStop?.(bot.id); }} className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all">
              <Square size={16} />
            </button>
          ) : isError ? (
            <button onClick={e => { e.stopPropagation(); onStartStop?.(bot.id); }} className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all">
              <RotateCcw size={16} />
            </button>
          ) : (
            <button onClick={e => { e.stopPropagation(); onStartStop?.(bot.id); }} className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all">
              <Play size={16} />
            </button>
          )}

          <button onClick={e => { e.stopPropagation(); onDelete?.(bot.id); }} className="p-2.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
