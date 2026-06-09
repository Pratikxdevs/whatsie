import { X } from 'lucide-react';
import type { Lead } from './KanbanCard';
import { LeadDetailTabs } from './LeadDetailTabs';

interface LeadDetailProps {
  lead: Lead | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}

export function LeadDetail({ lead, onClose, onStatusChange }: LeadDetailProps) {
  if (!lead) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-[90vw] bg-[#0f0f11] border-l border-white/5 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-semibold text-[#EBEBF0]">{lead.name}</h2>
            {lead.phone && <p className="text-xs text-[#7D7D8A]">{lead.phone}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7D7D8A] hover:text-[#EBEBF0] hover:bg-[#1f1f22] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <LeadDetailTabs lead={lead} onStatusChange={onStatusChange} />
        </div>
      </div>
    </>
  );
}
