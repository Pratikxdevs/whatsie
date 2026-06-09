import { useState } from "react";
import { X, Edit3, Save, ExternalLink, MessageCircle, Plus, Trash2, StickyNote } from "lucide-react";
import { TagBadge } from "./TagBadge";
import { formatDistanceToNow } from "date-fns";
import { contactApi } from "../../services/api";
import { toast } from "sonner";
import { PhoneInput } from "../ui/PhoneInput";

interface ContactDetailProps {
  contact: {
    id: string;
    name: string;
    phone: string;
    email: string;
    company: string;
    tags: string[];
    leadStatus: string;
    leadId?: string;
    platforms: string[];
    customFields: Record<string, string>;
    notes: { id: string; text: string; author: string; createdAt: string }[];
    conversations: { id: string; platform: string; lastMessage: string; lastMessageAt: string; botName: string }[];
  };
  onClose: () => void;
  onNavigateToLead: (leadId: string) => void;
  onNavigateToConversation: (convId: string) => void;
}

export function ContactDetail({ contact, onClose, onNavigateToLead, onNavigateToConversation }: ContactDetailProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone);
  const [email, setEmail] = useState(contact.email);
  const [company, setCompany] = useState(contact.company);
  const [newNote, setNewNote] = useState("");
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  const handleSave = async () => {
    try {
      await contactApi.update(contact.id, { name, phone, email, company });
      toast.success("Contact updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update contact");
    }
  };

  const handleAddNote = async () => {
    if (newNote.trim()) {
      try {
        await contactApi.update(contact.id, { notes: [...(contact.notes || []), { text: newNote }] });
        toast.success("Note added");
        setNewNote("");
      } catch {
        toast.error("Failed to add note");
      }
    }
  };

  return (
    <div className="w-[420px] flex-shrink-0 bg-[#0f0f11] border border-white/5 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Contact Details</h3>
        <div className="flex items-center gap-1">
          {editing ? (
            <button
              onClick={handleSave}
              className="p-1.5 rounded-md text-green-400 hover:bg-green-500/10 transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact Info */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-300">
              {contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              {editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-sm text-white w-full"
                />
              ) : (
                <h4 className="text-base font-semibold text-white">{contact.name}</h4>
              )}
              <p className="text-xs text-zinc-500">{contact.company}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Phone</span>
              {editing ? (
                <div className="w-48"><PhoneInput value={phone} onChange={setPhone} className="text-xs" /></div>
              ) : (
                <span className="text-zinc-200 font-mono text-xs">{contact.phone}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Email</span>
              {editing ? (
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 w-48 text-right" />
              ) : (
                <span className="text-zinc-200 text-xs">{contact.email}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Company</span>
              {editing ? (
                <input value={company} onChange={(e) => setCompany(e.target.value)} className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 w-48 text-right" />
              ) : (
                <span className="text-zinc-200 text-xs">{contact.company}</span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="mt-4">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          </div>
        </div>

        {/* Lead Link */}
        {contact.leadId && (
          <div className="px-5 py-3 border-b border-white/5">
            <button
              onClick={() => onNavigateToLead(contact.leadId!)}
              className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Lead Record
            </button>
          </div>
        )}

        {/* Custom Fields */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Custom Fields</p>
            <button
              onClick={() => setShowAddField(!showAddField)}
              className="text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              Add
            </button>
          </div>

          {showAddField && (
            <div className="flex gap-2 mb-3">
              <input
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                placeholder="Key"
                className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200"
              />
              <input
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
                placeholder="Value"
                className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200"
              />
              <button className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">Add</button>
            </div>
          )}

          <div className="space-y-2">
            {Object.entries(contact.customFields).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between group">
                <span className="text-xs text-zinc-500 font-mono">{key}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-200">{value}</span>
                  <button className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {Object.keys(contact.customFields).length === 0 && !showAddField && (
              <p className="text-xs text-zinc-600">No custom fields</p>
            )}
          </div>
        </div>

        {/* Conversation History */}
        <div className="p-5 border-b border-white/5">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">
            Conversations ({contact.conversations.length})
          </p>
          <div className="space-y-2">
            {contact.conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onNavigateToConversation(conv.id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors text-left"
              >
                <MessageCircle className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-300 capitalize">{conv.platform}</span>
                    <span className="text-[10px] text-zinc-600">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">{conv.lastMessage}</p>
                  <p className="text-[10px] text-zinc-600">{conv.botName}</p>
                </div>
              </button>
            ))}
            {contact.conversations.length === 0 && (
              <p className="text-xs text-zinc-600">No conversations yet</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="p-5">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">
            Notes ({contact.notes.length})
          </p>

          {/* Add Note */}
          <div className="flex gap-2 mb-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50 resize-none"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="self-end px-3 py-2 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 disabled:opacity-30 transition-colors"
            >
              <StickyNote className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Notes List */}
          <div className="space-y-3">
            {contact.notes.map((note) => (
              <div key={note.id} className="bg-zinc-900 rounded-lg p-3">
                <p className="text-xs text-zinc-200 mb-1">{note.text}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">{note.author}</span>
                  <span className="text-[10px] text-zinc-600">
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
            {contact.notes.length === 0 && (
              <p className="text-xs text-zinc-600">No notes yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
