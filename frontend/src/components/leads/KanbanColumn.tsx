import { useState } from 'react';
import type { Lead } from './KanbanCard';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  status: string;
  label: string;
  color: string;
  leads: Lead[];
  onSelect: (id: string) => void;
  onDrop: (leadId: string, newStatus: string) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
}

export function KanbanColumn({ status, label, color, leads, onSelect, onDrop, onDragStart }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      onDrop(leadId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col min-w-[240px] w-[240px] flex-shrink-0 rounded-xl transition-colors ${
        isDragOver ? 'bg-[#1a1a1f] ring-1 ring-white/10' : 'bg-transparent'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-sm font-medium text-[#CCCCD4]">{label}</span>
        <span className="text-xs text-[#7D7D8A] bg-[#1f1f22] px-1.5 py-0.5 rounded-full ml-auto">
          {leads.length}
        </span>
      </div>

      {/* Card List */}
      <div className="flex-1 space-y-2 px-1 pb-2 overflow-y-auto max-h-[calc(100vh-320px)]">
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onSelect={onSelect}
            onDragStart={onDragStart}
          />
        ))}
        {leads.length === 0 && (
          <div className="text-center py-8 text-xs text-[#7D7D8A]">
            No leads
          </div>
        )}
      </div>
    </div>
  );
}
