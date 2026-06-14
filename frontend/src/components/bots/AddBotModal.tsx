import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import type { AiEngine } from './types';
import { ProviderAuth } from '../ProviderAuth';
import { botApi } from '../../services/api';
import { socketManager } from '../../services/socketManager';
import { useAuth } from '../../contexts/AuthContext';

type Step = 'config' | 'connect';

export function AddBotModal({ isOpen, onClose, onComplete }: {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('config');
  const [name, setName] = useState('');
  const [aiEngine, setAiEngine] = useState<AiEngine>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [connectStatus, setConnectStatus] = useState<'idle' | 'creating' | 'loading' | 'pending_qr' | 'connected' | 'error'>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const cleanupTimers = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  // Socket.IO — listen for real-time bot_status_change events (singleton)
  useEffect(() => {
    if (!createdBotId || !user?.tenantId || connectStatus === 'idle' || connectStatus === 'connected' || connectStatus === 'error') return;

    socketManager.connect(user.tenantId);

    const handleStatusChange = ({ botId, status }: { botId: string; status: string }) => {
      if (botId === createdBotId && status === 'connected') {
        cleanupTimers();
        setConnectStatus('connected');
        onComplete();
      }
    };

    socketManager.on('bot_status_change', handleStatusChange);
    return () => { socketManager.off('bot_status_change', handleStatusChange); };
  }, [createdBotId, connectStatus, onComplete, user?.tenantId]);

  if (!isOpen) return null;

  const steps: Step[] = ['config', 'connect'];
  const currentIdx = steps.indexOf(step);

  const canNext = step === 'config' ? name.trim().length > 0 && apiKey.trim().length > 0 : true;

  const handleNext = async () => {
    cancelledRef.current = false;
    if (step === 'config') {
      setStep('connect');
      setConnectStatus('creating');
      setError(null);
      try {
        const workspace = await botApi.createWorkspace(name, {
          platform: 'whatsapp',
          ai_engine: aiEngine,
          api_key: apiKey,
          system_prompt: systemPrompt || undefined,
          temperature,
          max_tokens: maxTokens,
          model: model || undefined,
        });
        if (cancelledRef.current) return;
        setCreatedBotId(workspace.id);

        setConnectStatus('loading');

        const res = await botApi.startWorkspace(workspace.id);
        if (cancelledRef.current) return;
        if (res.screenshotUrl) {
          setQrCode(res.screenshotUrl);
          setConnectStatus('pending_qr');
          startPolling(workspace.id);
        } else {
          const raw = res.sessionInfo.status;
          if (raw === 'connected') {
            setConnectStatus('connected');
            onComplete();
          } else {
            setConnectStatus('pending_qr');
            startPolling(workspace.id);
          }
        }
      } catch (err: any) {
        console.error('Failed to create/connect bot:', err);
        setConnectStatus('error');
        setError(err.response?.data?.error || err.message || 'Failed to create bot');
      }
      return;
    }
    setStep(steps[currentIdx + 1]);
  };

  const startPolling = (botId: string) => {
    cleanupTimers();
    let failCount = 0;
    pollRef.current = window.setInterval(async () => {
      try {
        const statusRes = await botApi.getConnectionStatus(botId);
        failCount = 0;
        if (statusRes.screenshotUrl) {
          setQrCode(statusRes.screenshotUrl);
          setConnectStatus('pending_qr');
        }
        if (statusRes.sessionInfo.status === 'connected') {
          cleanupTimers();
          setConnectStatus('connected');
          onComplete();
        }
      } catch {
        failCount++;
        if (failCount >= 5) {
          cleanupTimers();
          setConnectStatus('error');
          setError('Connection timed out. Please try again.');
        }
      }
    }, 3000);
    timeoutRef.current = window.setTimeout(() => {
      cleanupTimers();
      setConnectStatus('error');
      setError('QR code expired. Please try again.');
    }, 120000);
  };

  const handleBack = () => {
    if (currentIdx > 0) setStep(steps[currentIdx - 1]);
  };

  const resetAndClose = () => {
    cleanupTimers();
    cancelledRef.current = true;
    if (createdBotId) {
      onComplete();
    }
    setStep('config');
    setName('');
    setAiEngine('openrouter');
    setApiKey('');
    setSystemPrompt('');
    setTemperature(0.7);
    setMaxTokens(1024);
    setConnectStatus('idle');
    setQrCode(null);
    setCreatedBotId(null);
    setError(null);
    onClose();
  };

  const handleRetry = async () => {
    if (!createdBotId) return;
    setConnectStatus('loading');
    setQrCode(null);
    setError(null);
    try {
      const res = await botApi.startWorkspace(createdBotId);
      if (res.screenshotUrl) {
        setQrCode(res.screenshotUrl);
        setConnectStatus('pending_qr');
        startPolling(createdBotId);
      } else {
        const raw = res.sessionInfo.status;
        if (raw === 'connected') {
          setConnectStatus('connected');
          onComplete();
        } else {
          setConnectStatus('pending_qr');
          startPolling(createdBotId);
        }
      }
    } catch (err: any) {
      console.error('Retry failed:', err);
      setConnectStatus('error');
      setError(err.response?.data?.error || 'Connection failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={resetAndClose}>
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-[640px] max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Add New Bot</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Step {currentIdx + 1} of {steps.length}</p>
          </div>
          <button onClick={resetAndClose} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 px-6 pt-3">
          {steps.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i <= currentIdx ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto max-h-[55vh]">
          {step === 'config' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-1">Bot Configuration</h3>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1 block">Bot Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={100}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                  placeholder="My Sales Bot"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1 block">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 min-h-[80px] resize-y"
                  placeholder="You are a helpful sales assistant..."
                />
              </div>
              <ProviderAuth
                provider={aiEngine}
                apiKey={apiKey}
                onProviderChange={setAiEngine}
                onKeyChange={setApiKey}
                showModels
                selectedModel={model}
                onModelChange={setModel}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1 block">Temperature: {temperature}</label>
                  <input
                    type="range" min="0" max="2" step="0.1"
                    value={temperature}
                    onChange={e => setTemperature(parseFloat(e.target.value))}
                    className="w-full mt-2 accent-emerald-400"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1 block">Max Tokens</label>
                  <input
                    type="number"
                    value={maxTokens}
                    min={1}
                    max={128000}
                    onChange={e => { const val = parseInt(e.target.value); setMaxTokens(isNaN(val) ? 1024 : val); }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'connect' && (
            <div className="flex flex-col items-center gap-4 py-4">
              {/* WhatsApp QR code area */}
              <div className="relative w-[300px] h-[300px] bg-white rounded-xl flex items-center justify-center overflow-hidden">
                {connectStatus === 'pending_qr' && qrCode && (
                  <img src={qrCode} alt="QR Code" className="w-[280px] h-[280px] object-contain" />
                )}
                {connectStatus === 'pending_qr' && !qrCode && (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-zinc-400 animate-spin" />
                    <span className="text-sm text-zinc-500">Waiting for QR code...</span>
                  </div>
                )}
                {(connectStatus === 'creating' || connectStatus === 'loading') && (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-zinc-400 animate-spin" />
                    <span className="text-sm text-zinc-500">
                      {connectStatus === 'creating' ? 'Creating bot...' : 'Generating QR code...'}
                    </span>
                  </div>
                )}
                {connectStatus === 'connected' && (
                  <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-white/70">
                    <div className="flex flex-col items-center gap-3 text-emerald-600">
                      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-base font-medium">Connected!</span>
                    </div>
                  </div>
                )}
                {connectStatus === 'error' && (
                  <div className="flex flex-col items-center gap-2 text-red-500">
                    <span className="text-sm">Connection failed. Try again.</span>
                  </div>
                )}
              </div>

              {/* Status indicator */}
              {connectStatus === 'pending_qr' && qrCode && (
                <div className="flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-zinc-400 font-medium">Connecting...</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <div className={`w-2 h-2 rounded-full ${
                  connectStatus === 'connected' ? 'bg-emerald-400' :
                  connectStatus === 'error' ? 'bg-red-400' :
                  'bg-zinc-500 animate-pulse'
                }`} />
                {connectStatus === 'pending_qr' && 'Open WhatsApp > Settings > Linked Devices > Link a Device'}
                {connectStatus === 'connected' && 'Bot is connected and ready'}
                {connectStatus === 'error' && (error || 'Failed to connect')}
              </div>

              {error && (
                <div className="flex flex-col items-center gap-2 text-red-400 mt-2">
                  <X size={20} />
                  <span className="text-sm text-center">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
          <button
            onClick={currentIdx > 0 && connectStatus !== 'creating' ? handleBack : resetAndClose}
            disabled={connectStatus === 'creating'}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40"
          >
            <ArrowLeft size={14} />
            {currentIdx > 0 && connectStatus !== 'creating' ? 'Back' : 'Cancel'}
          </button>
          <div className="flex items-center gap-2">
            {connectStatus === 'error' && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
              >
                Retry
              </button>
            )}
            {connectStatus === 'connected' ? (
              <button
                onClick={resetAndClose}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            ) : connectStatus === 'error' ? (
              <button
                onClick={resetAndClose}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
            ) : step === 'connect' ? (
              <button
                onClick={() => {
                  if (connectStatus === 'pending_qr' || connectStatus === 'loading') {
                    cleanupTimers();
                  }
                  resetAndClose();
                }}
                disabled={connectStatus === 'creating'}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canNext || connectStatus === 'creating'}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
