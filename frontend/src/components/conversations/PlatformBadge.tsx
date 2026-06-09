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
