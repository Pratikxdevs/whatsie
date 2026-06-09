import {
  MessageSquare,
  Send,
  MessageCircle,
  AtSign,
  Camera,
  Users,
  Hash,
} from 'lucide-react';

const platformConfig: Record<string, { icon: typeof MessageSquare; color: string; bg: string; label: string }> = {
  whatsapp: { icon: MessageCircle, color: 'text-[#25D366]', bg: 'bg-[#25D366]/15', label: 'WhatsApp' },
  telegram: { icon: Send, color: 'text-[#0088cc]', bg: 'bg-[#0088cc]/15', label: 'Telegram' },
  discord: { icon: Hash, color: 'text-[#5865F2]', bg: 'bg-[#5865F2]/15', label: 'Discord' },
  messenger: { icon: MessageSquare, color: 'text-[#0078FF]', bg: 'bg-[#0078FF]/15', label: 'Messenger' },
  instagram: { icon: Camera, color: 'text-[#E4405F]', bg: 'bg-[#E4405F]/15', label: 'Instagram' },
  teams: { icon: Users, color: 'text-[#6264A7]', bg: 'bg-[#6264A7]/15', label: 'MS Teams' },
  twitter: { icon: AtSign, color: 'text-[#1DA1F2]', bg: 'bg-[#1DA1F2]/15', label: 'Twitter/X' },
};

interface PlatformBadgeProps {
  platform: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function PlatformBadge({ platform, size = 'sm', showLabel = false }: PlatformBadgeProps) {
  const config = platformConfig[platform] || platformConfig.whatsapp;
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span
      className={`inline-flex items-center gap-1 ${config.bg} ${config.color} rounded px-1.5 py-0.5 ${
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      } font-semibold uppercase tracking-wide`}
      title={config.label}
    >
      <Icon className={iconSize} />
      {showLabel && config.label}
    </span>
  );
}
