import { useState } from 'react';
import { Search, X } from 'lucide-react';

const quickReplies = [
  { id: 'qr-1', label: 'Thanks', text: 'Thanks for reaching out! How can I help you today?' },
  { id: 'qr-2', label: 'Connect Agent', text: 'Let me connect you with a human agent. One moment please.' },
  { id: 'qr-3', label: 'More Details', text: 'Can you share more details about what you are looking for?' },
  { id: 'qr-4', label: 'Schedule Demo', text: 'I would love to schedule a demo for you. What time works best?' },
  { id: 'qr-5', label: 'Pricing Info', text: 'Our pricing starts at $49/month. Would you like to see a full comparison?' },
  { id: 'qr-6', label: 'Follow Up', text: 'I will follow up with you shortly. Is there anything else you need?' },
  { id: 'qr-7', label: 'Not Available', text: 'Our team is currently unavailable. We will get back to you within 24 hours.' },
  { id: 'qr-8', label: 'Thank You', text: 'Thank you for your patience! Is there anything else I can assist with?' },
];

interface QuickReplyPickerProps {
  onSelect: (text: string) => void;
  onClose: () => void;
}

export function QuickReplyPicker({ onSelect, onClose }: QuickReplyPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = quickReplies.filter(
    (r) =>
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#1c1c20] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-xs font-medium text-[#7D7D8A]">Quick Replies</span>
        <button onClick={onClose} className="text-[#7D7D8A] hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 bg-[#141415] rounded px-2 py-1.5">
          <Search className="w-3.5 h-3.5 text-[#7D7D8A]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="flex-1 bg-transparent text-xs text-[#EBEBF0] placeholder-[#7D7D8A] outline-none"
            autoFocus
          />
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {filtered.map((reply) => (
          <button
            key={reply.id}
            onClick={() => {
              onSelect(reply.text);
              onClose();
            }}
            className="w-full text-left px-3 py-2 hover:bg-[#141415] transition-colors border-b border-white/5 last:border-0"
          >
            <p className="text-xs font-medium text-[#EBEBF0]">{reply.label}</p>
            <p className="text-[11px] text-[#7D7D8A] truncate mt-0.5">{reply.text}</p>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-xs text-[#7D7D8A] text-center">No templates found</p>
        )}
      </div>
    </div>
  );
}
