import { useState } from 'react';
import { ChevronDown, UserPlus, XCircle, Ban, StickyNote, ExternalLink, Plus, Trash2, Check } from 'lucide-react';
import { PlatformBadge } from './PlatformBadge';

interface ContactSidebarProps {
  conversation: {
    id: string;
    platform: string;
    status: string;
    createdAt: string;
    botName?: string;
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    source?: string;
    leadStatus?: string;
    attributes?: Record<string, string>;
    workflow?: { name: string; currentStep: number; totalSteps: number };
    notes?: { id: string; text: string; createdAt: string }[];
    messageCount?: number;
  };
}

const statusColors: Record<string, string> = {
  new: 'bg-[#606068] text-[#EBEBF0]',
  contacted: 'bg-[#2563eb]/20 text-[#5b9cf6]',
  qualified: 'bg-[#f59e0b]/20 text-[#f59e0b]',
  converted: 'bg-[#25D366]/20 text-[#25D366]',
  lost: 'bg-[#ef4444]/20 text-[#ef4444]',
};

const statusOptions = ['new', 'contacted', 'qualified', 'converted', 'lost'];

export function ContactSidebar({ conversation }: ContactSidebarProps) {
  const [leadStatus, setLeadStatus] = useState(conversation.leadStatus || 'new');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, string>>(
    conversation.attributes || {}
  );
  const [showAddAttr, setShowAddAttr] = useState(false);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [notes, setNotes] = useState(conversation.notes || []);
  const [newNote, setNewNote] = useState('');

  const handleAddAttribute = () => {
    if (newAttrKey.trim() && newAttrValue.trim()) {
      setAttributes({ ...attributes, [newAttrKey.trim()]: newAttrValue.trim() });
      setNewAttrKey('');
      setNewAttrValue('');
      setShowAddAttr(false);
    }
  };

  const handleDeleteAttribute = (key: string) => {
    const next = { ...attributes };
    delete next[key];
    setAttributes(next);
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      setNotes([
        { id: `note-${Date.now()}`, text: newNote.trim(), createdAt: new Date().toISOString() },
        ...notes,
      ]);
      setNewNote('');
    }
  };

  return (
    <div className="w-72 h-full border-l border-white/5 bg-[#09090b] overflow-y-auto">
      {/* Lead Info */}
      <div className="p-4 border-b border-white/5">
        <h3 className="text-xs font-semibold text-[#7D7D8A] uppercase tracking-wide mb-3">Lead Info</h3>
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-[#EBEBF0]">{conversation.contactName}</p>
            <p className="text-xs text-[#7D7D8A]">{conversation.contactPhone}</p>
            {conversation.contactEmail && (
              <p className="text-xs text-[#7D7D8A]">{conversation.contactEmail}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <PlatformBadge platform={conversation.platform} size="sm" />
            {conversation.source && (
              <span className="text-[10px] text-[#7D7D8A] bg-[#1f1f22] px-1.5 py-0.5 rounded">
                {conversation.source}
              </span>
            )}
          </div>
          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                statusColors[leadStatus] || statusColors.new
              }`}
            >
              {leadStatus.charAt(0).toUpperCase() + leadStatus.slice(1)}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-[#1c1c20] border border-white/10 rounded-lg shadow-xl z-50 min-w-[140px]">
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setLeadStatus(s);
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#141415] ${
                      s === leadStatus ? 'text-white' : 'text-[#a1a1aa]'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#7D7D8A] uppercase tracking-wide">Attributes</h3>
          <button
            onClick={() => setShowAddAttr(!showAddAttr)}
            className="text-[#2563eb] hover:text-[#3b82f6] text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {showAddAttr && (
          <div className="flex gap-1.5 mb-2">
            <input
              type="text"
              value={newAttrKey}
              onChange={(e) => setNewAttrKey(e.target.value)}
              placeholder="Key"
              className="flex-1 bg-[#1f1f22] text-xs text-[#EBEBF0] px-2 py-1 rounded border border-white/5 outline-none"
            />
            <input
              type="text"
              value={newAttrValue}
              onChange={(e) => setNewAttrValue(e.target.value)}
              placeholder="Value"
              className="flex-1 bg-[#1f1f22] text-xs text-[#EBEBF0] px-2 py-1 rounded border border-white/5 outline-none"
            />
            <button
              onClick={handleAddAttribute}
              className="text-[#25D366] text-xs px-1.5"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="space-y-1.5">
          {Object.entries(attributes).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#7D7D8A]">{key}:</span>
                <span className="text-xs text-[#EBEBF0]">{value}</span>
              </div>
              <button
                onClick={() => handleDeleteAttribute(key)}
                className="opacity-0 group-hover:opacity-100 text-[#7D7D8A] hover:text-[#ef4444] transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {Object.keys(attributes).length === 0 && !showAddAttr && (
            <p className="text-xs text-[#7D7D8A]">No attributes</p>
          )}
        </div>
      </div>

      {/* Workflow */}
      {conversation.workflow && (
        <div className="p-4 border-b border-white/5">
          <h3 className="text-xs font-semibold text-[#7D7D8A] uppercase tracking-wide mb-3">Workflow</h3>
          <div className="bg-[#1f1f22] rounded-lg p-3">
            <p className="text-xs font-medium text-[#EBEBF0]">{conversation.workflow.name}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 bg-[#2a2a2d] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563eb] rounded-full"
                  style={{ width: `${(conversation.workflow.currentStep / conversation.workflow.totalSteps) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-[#7D7D8A]">
                {conversation.workflow.currentStep}/{conversation.workflow.totalSteps}
              </span>
            </div>
            <button className="flex items-center gap-1 mt-2 text-[10px] text-[#2563eb] hover:text-[#3b82f6]">
              <ExternalLink className="w-3 h-3" /> View Workflow
            </button>
          </div>
        </div>
      )}

      {/* Conversation Info */}
      <div className="p-4 border-b border-white/5">
        <h3 className="text-xs font-semibold text-[#7D7D8A] uppercase tracking-wide mb-3">Conversation</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[#7D7D8A]">Platform</span>
            <span className="text-[#EBEBF0] capitalize">{conversation.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7D7D8A]">Created</span>
            <span className="text-[#EBEBF0]">{new Date(conversation.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7D7D8A]">Messages</span>
            <span className="text-[#EBEBF0]">{conversation.messageCount || 0}</span>
          </div>
          {conversation.botName && (
            <div className="flex justify-between">
              <span className="text-[#7D7D8A]">Bot</span>
              <span className="text-[#EBEBF0]">{conversation.botName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-white/5">
        <h3 className="text-xs font-semibold text-[#7D7D8A] uppercase tracking-wide mb-3">Actions</h3>
        <div className="space-y-1.5">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#EBEBF0] bg-[#1f1f22] rounded-lg hover:bg-[#2a2a2d] transition-colors">
            <UserPlus className="w-3.5 h-3.5 text-[#7D7D8A]" />
            Assign to Agent
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#EBEBF0] bg-[#1f1f22] rounded-lg hover:bg-[#2a2a2d] transition-colors">
            <XCircle className="w-3.5 h-3.5 text-[#7D7D8A]" />
            Close Conversation
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#ef4444] bg-[#1f1f22] rounded-lg hover:bg-[#2a2a2d] transition-colors">
            <Ban className="w-3.5 h-3.5" />
            Block Contact
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#7D7D8A] uppercase tracking-wide">Notes</h3>
          <StickyNote className="w-3.5 h-3.5 text-[#7D7D8A]" />
        </div>
        <div className="mb-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="w-full bg-[#1f1f22] text-xs text-[#EBEBF0] placeholder-[#7D7D8A] px-2.5 py-2 rounded-lg border border-white/5 outline-none resize-none h-16"
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="mt-1 text-xs text-[#2563eb] hover:text-[#3b82f6] disabled:text-[#606068] disabled:cursor-not-allowed"
          >
            Add Note
          </button>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="bg-[#1f1f22] rounded-lg p-2.5">
              <p className="text-xs text-[#EBEBF0]">{note.text}</p>
              <p className="text-[10px] text-[#7D7D8A] mt-1">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-xs text-[#7D7D8A] text-center">No notes yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
