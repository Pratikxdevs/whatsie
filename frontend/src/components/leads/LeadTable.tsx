import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { Lead } from './KanbanCard';

export type { Lead };

interface LeadTableProps {
  leads: Lead[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: 'bg-zinc-500/15', text: 'text-zinc-400' },
  contacted: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  qualified: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  converted: { bg: 'bg-green-500/15', text: 'text-green-400' },
  lost: { bg: 'bg-red-500/15', text: 'text-red-400' },
};

const SOURCE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  whatsapp: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'WhatsApp' },
  website: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', label: 'Website' },
  referral: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Referral' },
  manual: { bg: 'bg-gray-500/15', text: 'text-gray-400', label: 'Manual' },
};

type SortField = 'name' | 'status' | 'source' | 'createdAt' | 'updatedAt';
type SortDir = 'asc' | 'desc';

export function LeadTable({ leads, selectedIds, onSelect, onToggleSelect, onToggleSelectAll }: LeadTableProps) {
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const sorted = useMemo(() => {
    const copy = [...leads];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'source':
          cmp = a.source.localeCompare(b.source);
          break;
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [leads, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);
  const allSelected = paginated.length > 0 && paginated.every((l) => selectedIds.has(l.id));

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-[#EBEBF0]" />
      : <ChevronDown className="w-3 h-3 text-[#EBEBF0]" />;
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#7D7D8A] border-b border-white/5">
              <th className="text-left font-medium py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-white/20 bg-transparent"
                />
              </th>
              <th className="text-left font-medium py-3 px-4 cursor-pointer group select-none" onClick={() => toggleSort('name')}>
                <div className="flex items-center gap-1">Name <SortIcon field="name" /></div>
              </th>
              <th className="text-left font-medium py-3 px-4">Phone</th>
              <th className="text-left font-medium py-3 px-4 cursor-pointer group select-none" onClick={() => toggleSort('source')}>
                <div className="flex items-center gap-1">Source <SortIcon field="source" /></div>
              </th>
              <th className="text-left font-medium py-3 px-4 cursor-pointer group select-none" onClick={() => toggleSort('status')}>
                <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
              </th>
              <th className="text-left font-medium py-3 px-4">Bot</th>
              <th className="text-left font-medium py-3 px-4 cursor-pointer group select-none" onClick={() => toggleSort('createdAt')}>
                <div className="flex items-center gap-1">Created <SortIcon field="createdAt" /></div>
              </th>
              <th className="text-left font-medium py-3 px-4 cursor-pointer group select-none" onClick={() => toggleSort('updatedAt')}>
                <div className="flex items-center gap-1">Last Activity <SortIcon field="updatedAt" /></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((lead) => {
              const statusColors = STATUS_COLORS[lead.status] || STATUS_COLORS.new;
              const sourceBadge = SOURCE_BADGES[lead.source] || SOURCE_BADGES.manual;
              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelect(lead.id)}
                  className={`cursor-pointer transition-colors border-b border-white/[0.03] ${
                    selectedIds.has(lead.id) ? 'bg-[#1a1a1f]' : 'hover:bg-[#141415]'
                  }`}
                >
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => onToggleSelect(lead.id)}
                      className="rounded border-white/20 bg-transparent"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="text-[#EBEBF0] font-medium">{lead.name}</span>
                      {lead.email && <span className="text-[#7D7D8A] text-xs">{lead.email}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#CCCCD4]">{lead.phone || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${sourceBadge.bg} ${sourceBadge.text}`}>
                      {sourceBadge.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${statusColors.bg} ${statusColors.text}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#CCCCD4] text-xs">{lead.botId || '—'}</td>
                  <td className="py-3 px-4 text-[#7D7D8A] text-xs">
                    {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                  </td>
                  <td className="py-3 px-4 text-[#7D7D8A] text-xs">
                    {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#7D7D8A]">
                  No leads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-[#7D7D8A]">
            <span>Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, sorted.length)} of {sorted.length} leads</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="bg-[#1c1c20] border border-white/5 rounded px-2 py-1 text-xs text-[#EBEBF0] focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  p === page ? 'bg-[#1f1f22] text-[#EBEBF0]' : 'text-[#7D7D8A] hover:text-[#CCCCD4]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
