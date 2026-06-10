import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { LayoutGrid, List, Plus, Upload } from 'lucide-react';
import { LeadFilters, type FilterState } from '../components/leads/LeadFilters';
import { LeadTable } from '../components/leads/LeadTable';
import { LeadKanban } from '../components/leads/LeadKanban';
import { LeadDetail } from '../components/leads/LeadDetail';
import { AddLeadModal } from '../components/leads/AddLeadModal';
import { LeadImportModal } from '../components/leads/LeadImportModal';
import { LeadExportButton } from '../components/leads/LeadExportButton';
import { BulkActions } from '../components/leads/BulkActions';
import { leadApi, botApi } from '../services/api';
import heroBg from '../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png';

export type ViewMode = 'table' | 'kanban';

export function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadDetail, setSelectedLeadDetail] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    statuses: [],
    sources: [],
    botId: null,
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [botOptions, setBotOptions] = useState<{ id: string; name: string }[]>([]);

  // Load leads and bot options on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [leadsData, botsData] = await Promise.all([
          leadApi.getLeads(),
          botApi.getWorkspaces(),
        ]);
        if (!cancelled) {
          setLeads(leadsData);
          setBotOptions(botsData.map((b: any) => ({ id: b.id, name: b.name })));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load leads');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Client-side filtering
  const filteredLeads = useMemo(() => {
    let result = leads;

    if (filters.statuses.length > 0) {
      result = result.filter((l) => filters.statuses.includes(l.status));
    }
    if (filters.sources.length > 0) {
      result = result.filter((l) => filters.sources.includes(l.source));
    }
    if (filters.botId) {
      result = result.filter((l) => l.botId === filters.botId);
    }
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q))
      );
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((l) => new Date(l.createdAt) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setDate(to.getDate() + 1);
      result = result.filter((l) => new Date(l.createdAt) < to);
    }

    return result;
  }, [leads, filters]);

  const selectedLead = selectedLeadDetail || leads.find((l) => l.id === selectedLeadId) || null;

  // Fetch full lead detail (with conversations) when a lead is selected
  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLeadDetail(null);
      return;
    }
    let cancelled = false;
    leadApi.getLead(selectedLeadId)
      .then((detail) => {
        if (!cancelled) setSelectedLeadDetail(detail);
      })
      .catch(() => {
        // Fall back to the list data already in state
      });
    return () => { cancelled = true; };
  }, [selectedLeadId]);

  // Handlers
  const handleSelect = useCallback((id: string) => {
    setSelectedLeadId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedLeadId(null);
  }, []);

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l))
    );
    try {
      await leadApi.updateLead(id, { status });
      toast.success(`Lead status changed to ${status}`);
    } catch (err: any) {
      // Revert on failure by refetching
      const freshLeads = await leadApi.getLeads();
      setLeads(freshLeads);
      toast.error(err?.message || 'Failed to update lead status');
    }
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const pageIds = filteredLeads.slice(0, 10).map((l) => l.id);
      const allSelected = pageIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...pageIds]);
    });
  }, [filteredLeads]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleAddLead = useCallback(async (data: { name: string; phone: string; email: string; source: string; status: string; botId: string; attributes: Record<string, string> }) => {
    try {
      const created = await leadApi.create(data);
      setLeads((prev) => [created, ...prev]);
      toast.success('Lead added');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create lead');
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    // Optimistic: remove from UI immediately
    setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)));
    try {
      await Promise.all(ids.map((id) => leadApi.delete(id)));
      toast.success(`${ids.length} leads deleted`);
    } catch (err: any) {
      // Rollback: refetch fresh list
      const freshLeads = await leadApi.getLeads();
      setLeads(freshLeads);
      toast.error(err?.message || 'Failed to delete leads');
    }
  }, [selectedIds]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div
          className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen transition-opacity duration-1000"
          style={{ backgroundImage: `url('${heroBg}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />

        <div className="relative z-20 w-full flex justify-end px-6 md:px-12 lg:px-16 pt-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all"
          >
            <Plus strokeWidth={1.5} className="w-5 h-5" />
            Add Lead
          </button>
        </div>

        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-8">
          <h1
            className="text-white font-semibold leading-[0.92] tracking-[-0.02em] drop-shadow-xl"
            style={{ fontSize: 'clamp(52px, 9vw, 108px)', lineHeight: 0.92 }}
          >
            LEADS
          </h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">
            Manage and track your leads across all platforms. Filter, search, and update lead status in real-time.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 md:px-12 lg:px-16 py-6 md:py-8 space-y-6">
        {/* Toolbar: View toggle + Filters + Export + Import */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <LeadFilters
            filters={filters}
            onFiltersChange={setFilters}
            botOptions={botOptions}
          />
          <div className="flex items-center gap-2">
            <LeadExportButton leads={filteredLeads} />
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 border border-white/5 hover:border-white/10 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-white/5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-[#1f1f22] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-[#1f1f22] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Count */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
          </span>
          {filters.statuses.length > 0 || filters.sources.length > 0 || filters.botId ? (
            <span className="text-xs text-zinc-500">(filtered)</span>
          ) : null}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-200 rounded-full animate-spin" />
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
            <LeadTable
              leads={filteredLeads}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
            />
          </div>
        ) : (
          <LeadKanban
            leads={filteredLeads}
            onSelect={handleSelect}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Lead Detail Slide-over */}
      <LeadDetail
        lead={selectedLead}
        onClose={handleCloseDetail}
        onStatusChange={handleStatusChange}
      />

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={selectedIds.size}
        onDeselectAll={handleDeselectAll}
        onExport={() => toast.info('Export coming soon')}
        onDelete={handleBulkDelete}
        onChangeStatus={() => toast.info('Bulk status change coming soon')}
        onAssignAgent={() => toast.info('Agent assignment coming soon')}
      />

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddLead}
        botOptions={botOptions}
      />

      {/* Import Modal */}
      <LeadImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={() => toast.success('Leads imported')}
      />
    </div>
  );
}
