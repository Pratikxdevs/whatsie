import { formatDistanceToNow } from 'date-fns';

export interface Conversation {
  id: string;
  leadId: string;
  platform: string;
  status: string;
  lastMessageAt: string;
  lead?: { name: string | null; phone: string | null };
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="w-80 h-full border-r border-white/5 overflow-y-auto bg-[#09090b] flex items-center justify-center">
        <p className="text-[#7D7D8A] text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="w-80 h-full border-r border-white/5 overflow-y-auto bg-[#09090b]">
      {conversations.map((conv) => {
        const isSelected = conv.id === selectedId;
        const displayName = conv.lead?.name || conv.lead?.phone || 'Unknown';
        const isOpen = conv.status === 'open';

        return (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`px-4 py-3 border-b border-white/5 hover:bg-[#141415] cursor-pointer transition-colors ${
              isSelected ? 'bg-[#1f1f22]' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#EBEBF0] text-sm font-medium truncate">
                {displayName}
              </span>
              <span className="text-[#7D7D8A] text-xs shrink-0 ml-2">
                {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded ${
                  conv.platform === 'whatsapp'
                    ? 'bg-[#25D366]/15 text-[#25D366]'
                    : conv.platform === 'telegram'
                    ? 'bg-[#0088cc]/15 text-[#0088cc]'
                    : 'bg-white/10 text-[#909099]'
                }`}
              >
                {conv.platform}
              </span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isOpen ? 'bg-[#4ADE80]' : 'bg-[#606068]'
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
