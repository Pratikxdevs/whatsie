import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { MessageSquare, ArrowUpRight, ArrowDownLeft, GitBranch, StickyNote, ChevronRight, Plus, Trash2, Brain, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { leadApi } from '../../services/api';
import { PhoneInput } from '../ui/PhoneInput';
import type { Lead } from './KanbanCard';

interface LeadDetailTabsProps {
  lead: Lead;
  onStatusChange: (id: string, status: string) => void;
  onLeadUpdated?: (lead: Lead) => void;
}

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: 'bg-zinc-500/15', text: 'text-zinc-400' },
  contacted: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  qualified: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  converted: { bg: 'bg-green-500/15', text: 'text-green-400' },
  lost: { bg: 'bg-red-500/15', text: 'text-red-400' },
};

const TIMELINE_ICONS: Record<string, { icon: typeof MessageSquare; color: string }> = {
  message_received: { icon: ArrowDownLeft, color: 'text-blue-400' },
  message_sent: { icon: ArrowUpRight, color: 'text-green-400' },
  status_change: { icon: GitBranch, color: 'text-yellow-400' },
  workflow_event: { icon: Sparkles, color: 'text-purple-400' },
  note_added: { icon: StickyNote, color: 'text-zinc-400' },
};

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', telegram: 'Telegram', discord: 'Discord',
  messenger: 'Messenger', instagram: 'Instagram', facebook: 'Facebook',
  ms_teams: 'Teams', twitter: 'Twitter', website: 'Website',
  referral: 'Referral', manual: 'Manual',
};

export function LeadDetailTabs({ lead, onStatusChange, onLeadUpdated }: LeadDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'notes' | 'ai-score'>('overview');
  const [newNote, setNewNote] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editedLead, setEditedLead] = useState({ name: lead.name, phone: lead.phone || '', email: lead.email || '' });
  const [saving, setSaving] = useState(false);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [attributes, setAttributes] = useState<Record<string, unknown>>({ ...(lead.attributes || {}) });
  const [notes, setNotes] = useState<{ id: string; author: string; content: string; timestamp: string }[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<string | null>(null);

  const timeline: any[] = [];
  const aiScore = null;
  const bot = null;
  const conversation = null;
  const colors = STATUS_COLORS[lead.status] || STATUS_COLORS.new;

  const filteredTimeline = timelineFilter
    ? timeline.filter((e) => e.type === timelineFilter)
    : timeline;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: `note-${Date.now()}`,
      author: 'You',
      content: newNote.trim(),
      timestamp: new Date().toISOString(),
    };
    setNotes([note, ...notes]);
    setNewNote('');
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter((n) => n.id !== noteId));
  };

  const handleAddAttribute = () => {
    if (!newAttrKey.trim()) return;
    setAttributes({ ...attributes, [newAttrKey.trim()]: newAttrValue });
    setNewAttrKey('');
    setNewAttrValue('');
  };

  const handleDeleteAttribute = (key: string) => {
    const next = { ...attributes };
    delete next[key];
    setAttributes(next);
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'notes', label: `Notes (${notes.length})` },
    { key: 'ai-score', label: 'AI Score' },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 px-6 border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-white text-[#EBEBF0]'
                : 'border-transparent text-[#7D7D8A] hover:text-[#CCCCD4]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status */}
            <div>
              <h3 className="text-xs text-[#7D7D8A] font-medium uppercase tracking-wider mb-2">Status</h3>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${colors.bg} ${colors.text}`}>
                  {lead.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(lead.id, s)}
                    disabled={s === lead.status}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                      s === lead.status ? 'bg-[#1f1f22] text-[#EBEBF0] cursor-default' : 'text-[#7D7D8A] hover:text-[#CCCCD4]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs text-[#7D7D8A] font-medium uppercase tracking-wider">Contact Info</h3>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="text-xs text-[#7D7D8A] hover:text-[#CCCCD4] transition-colors"
                >
                  {editMode ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {editMode ? (
                <div className="space-y-2">
                  <input value={editedLead.name} onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })} className="w-full bg-[#1c1c20] border border-white/5 rounded-lg px-3 py-2 text-sm text-[#EBEBF0] focus:outline-none focus:border-white/10" placeholder="Name" />
                  <PhoneInput value={editedLead.phone || ''} onChange={(v) => setEditedLead({ ...editedLead, phone: v })} placeholder="Phone" />
                  <input value={editedLead.email} onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })} className="w-full bg-[#1c1c20] border border-white/5 rounded-lg px-3 py-2 text-sm text-[#EBEBF0] focus:outline-none focus:border-white/10" placeholder="Email" />
                  <button onClick={async () => {
                    try {
                      await leadApi.updateLead(lead.id, editedLead);
                      onLeadUpdated?.({ ...lead, ...editedLead });
                      setEditMode(false);
                      toast.success('Lead updated');
                    } catch {
                      toast.error('Failed to update lead');
                    }
                  }} className="bg-white text-[#09090b] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors">Save</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {lead.phone && <div className="flex justify-between"><span className="text-xs text-[#7D7D8A]">Phone</span><span className="text-sm text-[#CCCCD4]">{lead.phone}</span></div>}
                  {lead.email && <div className="flex justify-between"><span className="text-xs text-[#7D7D8A]">Email</span><span className="text-sm text-[#CCCCD4]">{lead.email}</span></div>}
                  <div className="flex justify-between"><span className="text-xs text-[#7D7D8A]">Source</span><span className="text-sm text-[#CCCCD4]">{SOURCE_LABELS[lead.source] || lead.source}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-[#7D7D8A]">Created</span><span className="text-sm text-[#CCCCD4]">{format(new Date(lead.createdAt), 'MMM d, yyyy')}</span></div>
                </div>
              )}
            </div>

            {/* Linked Bot */}
            {bot && (
              <div>
                <h3 className="text-xs text-[#7D7D8A] font-medium uppercase tracking-wider mb-2">Linked Bot</h3>
                <div className="bg-[#1c1c20] rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#EBEBF0]">{bot.name}</p>
                    <p className="text-xs text-[#7D7D8A]">WhatsApp</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#7D7D8A]" />
                </div>
              </div>
            )}

            {/* Conversation */}
            {conversation && (
              <div>
                <h3 className="text-xs text-[#7D7D8A] font-medium uppercase tracking-wider mb-2">Conversation</h3>
                <div className="bg-[#1c1c20] rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#7D7D8A]" />
                    <span className="text-sm text-[#CCCCD4] capitalize">{conversation.platform}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${conversation.status === 'open' ? 'bg-green-500/15 text-green-400' : 'bg-zinc-500/15 text-zinc-400'}`}>
                      {conversation.status}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#7D7D8A]" />
                </div>
              </div>
            )}

            {/* Attributes */}
            <div>
              <h3 className="text-xs text-[#7D7D8A] font-medium uppercase tracking-wider mb-2">Attributes</h3>
              <div className="space-y-1.5">
                {Object.entries(attributes).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between group">
                    <span className="text-xs text-[#7D7D8A] capitalize">{key}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#CCCCD4]">{String(value)}</span>
                      <button onClick={() => handleDeleteAttribute(key)} className="opacity-0 group-hover:opacity-100 text-[#7D7D8A] hover:text-red-400 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input value={newAttrKey} onChange={(e) => setNewAttrKey(e.target.value)} placeholder="Key" className="flex-1 bg-[#1c1c20] border border-white/5 rounded px-2 py-1 text-xs text-[#EBEBF0] focus:outline-none focus:border-white/10" />
                <input value={newAttrValue} onChange={(e) => setNewAttrValue(e.target.value)} placeholder="Value" className="flex-1 bg-[#1c1c20] border border-white/5 rounded px-2 py-1 text-xs text-[#EBEBF0] focus:outline-none focus:border-white/10" />
                <button onClick={handleAddAttribute} className="text-xs text-[#7D7D8A] hover:text-[#CCCCD4] transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setTimelineFilter(null)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  !timelineFilter ? 'bg-[#1f1f22] text-[#EBEBF0]' : 'text-[#7D7D8A] hover:text-[#CCCCD4]'
                }`}
              >
                All
              </button>
              {Object.entries(TIMELINE_ICONS).map(([type, { icon: Icon }]) => (
                <button
                  key={type}
                  onClick={() => setTimelineFilter(type === timelineFilter ? null : type)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    timelineFilter === type ? 'bg-[#1f1f22] text-[#EBEBF0]' : 'text-[#7D7D8A] hover:text-[#CCCCD4]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Timeline */}
            {filteredTimeline.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5" />
                <div className="space-y-4">
                  {filteredTimeline.map((event) => {
                    const { icon: Icon, color } = TIMELINE_ICONS[event.type] || TIMELINE_ICONS.note_added;
                    return (
                      <div key={event.id} className="flex items-start gap-3 relative">
                        <div className={`w-8 h-8 rounded-full bg-[#1c1c20] flex items-center justify-center z-10 ${color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#CCCCD4]">{event.description}</p>
                          <p className="text-xs text-[#7D7D8A] mt-0.5">
                            {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[#7D7D8A]">No timeline events</div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Add note */}
            <div className="space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={3}
                className="w-full bg-[#1c1c20] border border-white/5 rounded-lg px-3 py-2 text-sm text-[#EBEBF0] placeholder:text-[#7D7D8A] focus:outline-none focus:border-white/10 resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="bg-white text-[#09090b] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
            </div>

            {/* Notes list */}
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="bg-[#1c1c20] rounded-lg p-3 group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#CCCCD4]">{note.author}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#7D7D8A]">
                          {formatDistanceToNow(new Date(note.timestamp), { addSuffix: true })}
                        </span>
                        <button onClick={() => handleDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 text-[#7D7D8A] hover:text-red-400 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-[#CCCCD4]">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[#7D7D8A]">No notes yet</div>
            )}
          </div>
        )}

        {activeTab === 'ai-score' && (
          <div className="space-y-6">
            {aiScore ? (
              <>
                {/* Score */}
                <div className="text-center py-4">
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${
                    aiScore.score >= 8 ? 'bg-green-500/15' : aiScore.score >= 5 ? 'bg-yellow-500/15' : 'bg-red-500/15'
                  }`}>
                    <span className={`text-4xl font-bold ${
                      aiScore.score >= 8 ? 'text-green-400' : aiScore.score >= 5 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {aiScore.score}
                    </span>
                  </div>
                  <p className="text-xs text-[#7D7D8A] mt-2">Lead Score (1-10)</p>
                </div>

                {/* Reasoning */}
                <div>
                  <h3 className="text-xs text-[#7D7D8A] font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> Reasoning
                  </h3>
                  <p className="text-sm text-[#CCCCD4] leading-relaxed">{aiScore.reasoning}</p>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-xs text-[#7D7D8A] font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {aiScore.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7D7D8A] mt-1.5 flex-shrink-0" />
                        <span className="text-sm text-[#CCCCD4]">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Brain className="w-8 h-8 text-[#7D7D8A] mx-auto mb-3" />
                <p className="text-sm text-[#7D7D8A]">No AI score available</p>
                <p className="text-xs text-[#7D7D8A] mt-1">Score will appear after the lead qualification bot runs</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
