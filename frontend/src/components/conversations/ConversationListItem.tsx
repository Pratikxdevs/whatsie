import { formatDistanceToNow } from 'date-fns';
import { PlatformBadge } from './PlatformBadge';

export interface ConversationItem {
  id: string;
  contactName: string;
  contactPhone: string;
  platform: string;
  botName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: 'open' | 'closed';
  leadStatus?: string;
  avatar?: string;
}

interface ConversationListItemProps {
  conversation: ConversationItem;
  isSelected: boolean;
  onClick: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const platformColors: Record<string, string> = {
  whatsapp: 'bg-[#25D366]/20 text-[#25D366]',
  telegram: 'bg-[#0088cc]/20 text-[#0088cc]',
  discord: 'bg-[#5865F2]/20 text-[#5865F2]',
  messenger: 'bg-[#0078FF]/20 text-[#0078FF]',
  instagram: 'bg-[#E4405F]/20 text-[#E4405F]',
  teams: 'bg-[#6264A7]/20 text-[#6264A7]',
  twitter: 'bg-[#1DA1F2]/20 text-[#1DA1F2]',
};

export function ConversationListItem({ conversation, isSelected, onClick }: ConversationListItemProps) {
  const { contactName, platform, lastMessage, lastMessageAt, unreadCount, status } = conversation;
  const colorClass = platformColors[platform] || platformColors.whatsapp;

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 border-b border-white/5 cursor-pointer transition-colors ${
        isSelected ? 'bg-[#1f1f22]' : 'hover:bg-[#141415]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <span className="text-xs font-bold">{getInitials(contactName)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-sm font-medium text-[#EBEBF0] truncate">{contactName}</span>
            <span className="text-[10px] text-[#7D7D8A] shrink-0 ml-2">
              {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <PlatformBadge platform={platform} size="sm" />
              <p className="text-xs text-[#7D7D8A] truncate">{lastMessage}</p>
            </div>
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              {unreadCount > 0 && (
                <span className="w-4.5 h-4.5 bg-[#2563eb] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1.5">
                  {unreadCount}
                </span>
              )}
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'open' ? 'bg-[#4ADE80]' : 'bg-[#606068]'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
