import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;
const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  lost: 'Lost',
};

const SOURCES = [
  'whatsapp', 'website', 'referral', 'manual',
] as const;
const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  website: 'Website',
  referral: 'Referral',
  manual: 'Manual',
};

export interface FilterState {
  statuses: string[];
  sources: string[];
  botId: string | null;
  search: string;
  dateFrom: string;
  dateTo: string;
}

interface LeadFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  botOptions: Array<{ id: string; name: string }>;
}

export function LeadFilters({ filters, onFiltersChange, botOptions }: LeadFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount =
    filters.statuses.length +
    filters.sources.length +
    (filters.botId ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0);

  const updateFilter = (key: keyof FilterState, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleStatus = (status: string) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    updateFilter('statuses', next);
  };

  const toggleSource = (source: string) => {
    const next = filters.sources.includes(source)
      ? filters.sources.filter((s) => s !== source)
      : [...filters.sources, source];
    updateFilter('sources', next);
  };

  const clearAll = () => {
    onFiltersChange({
      statuses: [],
      sources: [],
      botId: null,
      search: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Filter toggle + Clear */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D7D8A]" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search leads..."
            className="w-full bg-[#141415] border border-white/5 rounded-lg pl-9 pr-3 py-2 text-sm text-[#EBEBF0] placeholder:text-[#7D7D8A] focus:outline-none focus:border-white/10"
          />
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            showAdvanced || activeFilterCount > 0
              ? 'bg-[#1f1f22] text-[#EBEBF0]'
              : 'text-[#7D7D8A] hover:text-[#CCCCD4]'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-white/10 text-[#EBEBF0] text-[10px] px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-[#7D7D8A] hover:text-[#CCCCD4] transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Row 2: Status pills (always visible) */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUSES.map((s) => {
          const isActive = filters.statuses.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                isActive
                  ? 'bg-[#1f1f22] text-[#EBEBF0] ring-1 ring-white/10'
                  : 'text-[#7D7D8A] hover:text-[#CCCCD4]'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {/* Row 3: Advanced filters (collapsible) */}
      {showAdvanced && (
        <div className="bg-[#141415] border border-white/5 rounded-lg p-4 space-y-4">
          {/* Source filter */}
          <div>
            <label className="text-xs text-[#7D7D8A] font-medium uppercase tracking-wider mb-2 block">Source</label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => {
                const isActive = filters.sources.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSource(s)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1f1f22] text-[#EBEBF0] ring-1 ring-white/10'
                        : 'text-[#7D7D8A] hover:text-[#CCCCD4]'
                    }`}
                  >
                    {SOURCE_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bot filter */}
          <div>
            <label className="text-xs text-[#7D7D8A] font-medium uppercase tracking-wider mb-2 block">Bot</label>
            <select
              value={filters.botId || ''}
              onChange={(e) => updateFilter('botId', e.target.value || null)}
              className="bg-[#1c1c20] border border-white/5 rounded-lg px-3 py-1.5 text-sm text-[#EBEBF0] focus:outline-none focus:border-white/10"
            >
              <option value="">All bots</option>
              {botOptions.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs text-[#7D7D8A] font-medium uppercase tracking-wider mb-1 block">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="bg-[#1c1c20] border border-white/5 rounded-lg px-3 py-1.5 text-sm text-[#EBEBF0] focus:outline-none focus:border-white/10"
              />
            </div>
            <div>
              <label className="text-xs text-[#7D7D8A] font-medium uppercase tracking-wider mb-1 block">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="bg-[#1c1c20] border border-white/5 rounded-lg px-3 py-1.5 text-sm text-[#EBEBF0] focus:outline-none focus:border-white/10"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
