import type { Lead } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';

const STATUSES = [
  { key: 'new', label: 'New', color: 'bg-zinc-400' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-400' },
  { key: 'qualified', label: 'Qualified', color: 'bg-yellow-400' },
  { key: 'converted', label: 'Converted', color: 'bg-green-400' },
  { key: 'lost', label: 'Lost', color: 'bg-red-400' },
];

interface LeadKanbanProps {
  leads: Lead[];
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function LeadKanban({ leads, onSelect, onStatusChange }: LeadKanbanProps) {
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (leadId: string, newStatus: string) => {
    onStatusChange(leadId, newStatus);
  };

  const leadsByStatus = STATUSES.map((s) => ({
    ...s,
    leads: leads.filter((l) => l.status === s.key),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {leadsByStatus.map((col) => (
        <KanbanColumn
          key={col.key}
          status={col.key}
          label={col.label}
          color={col.color}
          leads={col.leads}
          onSelect={onSelect}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
      ))}
    </div>
  );
}
