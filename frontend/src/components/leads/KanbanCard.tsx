import { formatDistanceToNow } from 'date-fns';
import { MoreVertical } from 'lucide-react';

export interface Lead {
  id: string;
  tenantId: string;
  botId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  _count?: { conversations: number };
}

interface KanbanCardProps {
  lead: Lead;
  onSelect: (id: string) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
}

const SOURCE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  whatsapp: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'WhatsApp' },
  telegram: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Telegram' },
  discord: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', label: 'Discord' },
  messenger: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Messenger' },
  instagram: { bg: 'bg-pink-500/15', text: 'text-pink-400', label: 'Instagram' },
  facebook: { bg: 'bg-blue-600/15', text: 'text-blue-400', label: 'Facebook' },
  ms_teams: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', label: 'Teams' },
  twitter: { bg: 'bg-sky-500/15', text: 'text-sky-400', label: 'Twitter' },
  website: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', label: 'Website' },
  referral: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Referral' },
  manual: { bg: 'bg-gray-500/15', text: 'text-gray-400', label: 'Manual' },
};

export function KanbanCard({ lead, onSelect, onDragStart }: KanbanCardProps) {
  const badge = SOURCE_BADGES[lead.source] || SOURCE_BADGES.manual;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={() => onSelect(lead.id)}
      className="bg-[#1c1c20] border border-white/5 rounded-lg p-3 cursor-pointer hover:border-white/10 transition-colors group"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-[#EBEBF0] truncate">{lead.name}</span>
        <MoreVertical className="w-3 h-3 text-[#7D7D8A] group-hover:text-[#CCCCD4] transition-colors" />
      </div>
      {lead.phone && (
        <p className="text-xs text-[#7D7D8A] mb-2">{lead.phone}</p>
      )}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
        <span className="text-[10px] text-[#7D7D8A]">
          {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
