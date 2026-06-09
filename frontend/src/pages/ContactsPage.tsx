import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ContactTable } from "../components/contacts/ContactTable";
import { ContactDetail } from "../components/contacts/ContactDetail";
import { AddContactModal } from "../components/contacts/AddContactModal";
import { ContactImportModal } from "../components/contacts/ContactImportModal";
import { contactApi } from "../services/api";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Upload, Search, Filter } from "lucide-react";
import { toast } from "sonner";

const allPlatforms = ["whatsapp", "telegram", "discord", "messenger", "instagram", "teams", "twitter"];

export function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const perPage = 10;

  const fetchContacts = useCallback(async () => {
    try {
      const data = await contactApi.list();
      setContacts(Array.isArray(data) ? data : data?.contacts ?? []);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const allTags = useMemo(() => [...new Set(contacts.flatMap((c: any) => c.tags ?? []))].sort(), [contacts]);

  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c: any) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
      );
    }

    if (tagFilter) {
      result = result.filter((c: any) => c.tags?.includes(tagFilter));
    }

    if (platformFilter) {
      result = result.filter((c: any) => c.platforms?.includes(platformFilter));
    }

    if (statusFilter) {
      result = result.filter((c: any) => c.leadStatus === statusFilter);
    }

    return result;
  }, [contacts, searchQuery, tagFilter, platformFilter, statusFilter]);

  const paginatedContacts = filteredContacts.slice((page - 1) * perPage, page * perPage);
  const selectedContact = contacts.find((c: any) => c.id === selectedId) || null;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div
          className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: `url('${heroBg}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />

        <div className="relative z-20 w-full flex justify-end px-6 md:px-12 lg:px-16 pt-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all"
          >
            <PlusIcon strokeWidth={1.5} className="w-5 h-5" />
            Add Contact
          </button>
        </div>

        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-8">
          <h1
            className="text-white font-semibold leading-[0.92] tracking-[-0.02em] drop-shadow-xl"
            style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}
          >
            CONTACTS
          </h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">
            Manage your contact database and customer relationships.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-6 md:px-12 lg:px-16 py-6 md:py-8 space-y-6">
        {/* Search + Actions Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search contacts by name, email, phone, or company..."
              className="w-full bg-[#0f0f11] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              showFilters || tagFilter || platformFilter || statusFilter
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-[#0f0f11] text-zinc-400 border border-white/10 hover:text-zinc-300"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(tagFilter || platformFilter || statusFilter) && (
              <span className="w-5 h-5 rounded-full bg-green-500 text-black text-[10px] font-bold flex items-center justify-center">
                {[tagFilter, platformFilter, statusFilter].filter(Boolean).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0f0f11] border border-white/10 rounded-xl text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-[#0f0f11] border border-white/5 rounded-xl">
            {/* Tag Filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Tag</label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => { setTagFilter(null); setPage(1); }}
                  className={`px-2 py-1 rounded-md text-xs transition-colors ${
                    !tagFilter ? "bg-green-500/10 text-green-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { setTagFilter(tag); setPage(1); }}
                    className={`px-2 py-1 rounded-md text-xs transition-colors ${
                      tagFilter === tag ? "bg-green-500/10 text-green-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Platform</label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => { setPlatformFilter(null); setPage(1); }}
                  className={`px-2 py-1 rounded-md text-xs transition-colors ${
                    !platformFilter ? "bg-green-500/10 text-green-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  All
                </button>
                {allPlatforms.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPlatformFilter(p); setPage(1); }}
                    className={`px-2 py-1 rounded-md text-xs capitalize transition-colors ${
                      platformFilter === p ? "bg-green-500/10 text-green-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Lead Status</label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => { setStatusFilter(null); setPage(1); }}
                  className={`px-2 py-1 rounded-md text-xs transition-colors ${
                    !statusFilter ? "bg-green-500/10 text-green-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  All
                </button>
                {["new", "contacted", "qualified", "converted", "lost"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setPage(1); }}
                    className={`px-2 py-1 rounded-md text-xs capitalize transition-colors ${
                      statusFilter === s ? "bg-green-500/10 text-green-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content: Table + Detail */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            Loading contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            No contacts
          </div>
        ) : (
          <div className="flex gap-4">
            <div className={selectedId ? "flex-1" : "w-full"}>
              <ContactTable
                contacts={paginatedContacts.map((c) => ({
                  ...c,
                  avatar: undefined,
                }))}
                selectedId={selectedId}
                onSelect={setSelectedId}
                page={page}
                perPage={perPage}
                total={filteredContacts.length}
                onPageChange={setPage}
              />
            </div>

            {selectedContact && (
              <ContactDetail
                contact={selectedContact}
                onClose={() => setSelectedId(null)}
                onNavigateToLead={(leadId) => navigate("/leads", { state: { leadId } })}
                onNavigateToConversation={(convId) => navigate("/conversations", { state: { conversationId: convId } })}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onSave={async (contact) => {
            try {
              await contactApi.create(contact);
              toast.success("Contact created");
              fetchContacts();
            } catch {
              toast.error("Failed to create contact");
            }
            setShowAddModal(false);
          }}
        />
      )}
      {showImportModal && (
        <ContactImportModal
          onClose={() => setShowImportModal(false)}
          onImport={async (data) => {
            try {
              await contactApi.import(data);
              toast.success("Contacts imported");
              fetchContacts();
            } catch {
              toast.error("Failed to import contacts");
            }
            setShowImportModal(false);
          }}
        />
      )}
    </div>
  );
}
