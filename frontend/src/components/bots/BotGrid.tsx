import type { Bot } from './types';
import { BotCard } from './BotCard';

export function BotGrid({ bots, selected, onSelect, onEdit, onStartStop, onDelete, onClick }: {
  bots: Bot[];
  selected: Set<string>;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onStartStop: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}) {
  if (bots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <svg className="w-12 h-12 mb-3 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.591.659H9.061a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2.25 2.25 0 01-2.25 2.25H7.25A2.25 2.25 0 015 17v-2.5" />
        </svg>
        <p className="text-sm">No bots found</p>
        <p className="text-xs text-zinc-600 mt-1">Click "Add Bot" to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bots.map(bot => (
        <BotCard
          key={bot.id}
          bot={bot}
          selected={selected.has(bot.id)}
          onSelect={onSelect}
          onEdit={onEdit}
          onStartStop={onStartStop}
          onDelete={onDelete}
          onClick={onClick}
        />
      ))}
    </div>
  );
}
