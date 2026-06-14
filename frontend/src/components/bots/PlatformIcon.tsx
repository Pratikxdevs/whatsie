import { MessageCircle } from 'lucide-react';
import type { Platform } from './types';
import { PLATFORM_CONFIG } from './types';

const ICONS: Record<Platform, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  whatsapp: MessageCircle,
};

export function PlatformIcon({ platform, size = 20 }: { platform: Platform; size?: number }) {
  const Icon = ICONS[platform];
  const config = PLATFORM_CONFIG[platform];
  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{ width: size + 12, height: size + 12, backgroundColor: config.color + '20' }}
    >
      <Icon size={size} style={{ color: config.color }} />
    </div>
  );
}
