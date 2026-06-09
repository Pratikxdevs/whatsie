import type { BotStatus } from './types';

const STATUS_CONFIG: Record<BotStatus, { dot: string; text: string; label: string }> = {
  connected: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Connected' },
  disconnected: { dot: 'bg-zinc-500', text: 'text-zinc-500', label: 'Disconnected' },
  error: { dot: 'bg-red-400', text: 'text-red-400', label: 'Error' },
  starting: { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400', label: 'Starting...' },
  pending_qr: { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400', label: 'Pending QR' },
  scanned: { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400', label: 'Scanned' },
};

export function BotConnectionStatus({ status, lastConnected }: { status: BotStatus; lastConnected: string | null }) {
  const config = STATUS_CONFIG[status];
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className={`text-xs font-semibold uppercase tracking-wider ${config.text}`}>{config.label}</span>
      {lastConnected && status === 'connected' && (
        <span className="text-xs text-zinc-500 ml-2">
          since {new Date(lastConnected).toLocaleString()}
        </span>
      )}
      {status === 'error' && (
        <span className="text-xs text-red-400/70 ml-2">Connection failed</span>
      )}
    </div>
  );
}
