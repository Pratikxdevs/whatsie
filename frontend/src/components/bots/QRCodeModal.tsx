import { memo, useEffect } from 'react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
  onRetry?: () => void;
  botName: string;
  qrCode?: string | null;
  status?: 'loading' | 'pending_qr' | 'scanned' | 'connected' | 'error';
  platform?: string;
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
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-1">Connect {botName}</h3>
          <p className="text-sm text-zinc-400">Scan the QR code with WhatsApp</p>
        </div>

        {/* Phone Frame Mockup */}
        <div className="relative mx-auto w-[240px] h-[480px] bg-[#111] rounded-[40px] border-[8px] border-zinc-800 shadow-2xl overflow-hidden flex flex-col mb-6">
          {/* Hardware Details */}
          <div className="absolute top-0 inset-x-0 flex justify-center z-20">
            <div className="w-24 h-6 bg-zinc-800 rounded-b-xl flex justify-center items-end pb-1">
              <div className="w-12 h-1 bg-zinc-900 rounded-full" />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col relative z-10 pt-10 px-4 pb-4">
            {/* WhatsApp App Mockup Header */}
            <div className="flex items-center gap-2 mb-8 mt-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.082 21.083c-1.458 0-2.841-.39-4.067-1.11l-4.611 1.21 1.228-4.496c-.82-1.27-1.258-2.73-1.258-4.254 0-4.384 3.568-7.953 7.953-7.953 4.385 0 7.954 3.569 7.954 7.954 0 4.383-3.569 7.953-7.953 7.953z"/></svg>
              </div>
              <span className="text-white text-sm font-semibold tracking-wide">WhatsApp Web</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              {status === 'loading' && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
                  <span className="text-xs text-zinc-500">Generating code...</span>
                </div>
              )}
              {status === 'pending_qr' && qrCode && (
                <div className="bg-white p-3 rounded-2xl shadow-xl transform transition-all animate-in zoom-in duration-300">
                  <img src={qrCode} alt="QR Code" className="w-40 h-40 object-contain rounded-xl" />
                </div>
              )}
              {status === 'pending_qr' && !qrCode && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
                  <span className="text-xs text-zinc-500">Waiting for QR...</span>
                </div>
              )}
              {status === 'scanned' && (
                <div className="flex flex-col items-center gap-3 text-amber-500 animate-in fade-in">
                  <div className="w-8 h-8 border-2 border-amber-900 border-t-amber-500 rounded-full animate-spin" />
                  <span className="text-xs font-medium">Confirming...</span>
                </div>
              )}
              {status === 'connected' && (
                <div className="flex flex-col items-center gap-3 text-emerald-500 animate-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-sm font-semibold">Device Linked!</span>
                </div>
              )}
              {status === 'error' && (
                <div className="flex flex-col items-center gap-3 text-red-500">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span className="text-xs font-medium text-center">Connection Failed</span>
                </div>
              )}
            </div>
            
            <div className="mt-auto pt-6 text-center">
              <div className="w-1/3 h-1 bg-zinc-800 rounded-full mx-auto" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6 justify-center bg-zinc-950 p-3 rounded-lg border border-zinc-800">
          <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-400' : status === 'scanned' ? 'bg-amber-400' : status === 'error' ? 'bg-red-500' : 'bg-zinc-500 animate-pulse'}`} />
          {status === 'loading' && 'Establishing secure connection...'}
          {status === 'pending_qr' && 'Open WhatsApp > Linked Devices > Link a Device'}
          {status === 'scanned' && 'Phone detected, verifying encryption keys...'}
          {status === 'connected' && 'Session successfully synchronized'}
          {status === 'error' && 'Failed to establish connection'}
        </div>

        <div className="flex justify-center gap-3">
          {status === 'connected' ? (
            <button onClick={() => { onConnected?.(); onClose(); }} className="px-6 py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors w-full">
              Finish Setup
            </button>
          ) : status === 'error' ? (
            <>
              {onRetry && (
                <button onClick={onRetry} className="flex-1 px-4 py-2.5 text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg transition-colors">
                  Retry Connection
                </button>
              )}
              <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors w-full">
              Cancel Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
