import { memo, useEffect } from 'react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
  onRetry?: () => void;
  botName: string;
  qrCode?: string | null;
  status?: 'loading' | 'pending_qr' | 'scanned' | 'connected' | 'error';
}

export const QRCodeModal = memo(function QRCodeModal({ isOpen, onClose, onConnected, onRetry, botName, qrCode, status = 'loading' }: QRCodeModalProps) {
  // Auto-close after connection success with a brief delay for the animation
  useEffect(() => {
    if (status === 'connected' && isOpen) {
      const timer = setTimeout(() => {
        onConnected?.();
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, isOpen, onConnected, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 w-[360px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-zinc-100 mb-1">Connect {botName}</h3>
        <p className="text-sm text-zinc-400 mb-4">Scan the QR code with WhatsApp</p>

        <div className="relative flex items-center justify-center bg-white rounded-xl p-4 mb-2 min-h-[200px] overflow-hidden">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-zinc-300 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-sm text-zinc-500">Generating QR code...</span>
            </div>
          )}
          {status === 'pending_qr' && qrCode && (
            <img src={qrCode} alt="QR Code" className="w-48 h-48 object-contain" />
          )}
          {status === 'pending_qr' && !qrCode && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-zinc-300 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-sm text-zinc-500">Waiting for QR code...</span>
            </div>
          )}
          {status === 'scanned' && (
            <div className="flex flex-col items-center gap-2 text-amber-600">
              <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
              <span className="text-sm">QR scanned! Confirming...</span>
            </div>
          )}
          {status === 'connected' && (
            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-white/70">
              <div className="flex flex-col items-center gap-2 text-emerald-600">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-sm font-medium">Connected!</span>
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-2 text-red-500">
              <span className="text-sm">Connection failed. Try again.</span>
            </div>
          )}
        </div>

        {status === 'pending_qr' && qrCode && (
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-700">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-zinc-400 font-medium">Connecting...</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
          <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-400' : status === 'scanned' ? 'bg-amber-400' : 'bg-zinc-500 animate-pulse'}`} />
          {status === 'loading' && 'Waiting for QR code...'}
          {status === 'pending_qr' && 'Open WhatsApp > Settings > Linked Devices > Link a Device'}
          {status === 'scanned' && 'Phone detected, waiting for confirmation...'}
          {status === 'connected' && 'Bot is now connected and ready to receive messages'}
          {status === 'error' && 'Failed to connect'}
        </div>

        <div className="flex justify-end gap-2">
          {status === 'connected' ? (
            <button onClick={() => { onConnected?.(); onClose(); }} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
              Done
            </button>
          ) : status === 'error' ? (
            <>
              {onRetry && (
                <button onClick={onRetry} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
                  Retry
                </button>
              )}
              <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
