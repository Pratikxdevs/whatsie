/**
 * ProviderAuth — Reusable AI provider + API key component.
 *
 * Works anywhere a user needs to configure an AI provider:
 *   - Bot creation (AddBotModal)
 *   - Bot configuration (BotConfigForm)
 *   - Settings page (global key management)
 *   - Credential management
 *
 * Props:
 *   - provider: current provider selection
 *   - apiKey: current key value
 *   - onProviderChange: called when user picks a new provider
 *   - onKeyChange: called when user types a new key
 *   - onValidate: optional — called with { provider, key } to test the key
 *   - botId: optional — if provided, uses the bot-scoped validation endpoint
 *   - compact: optional — smaller layout for inline use
 *   - showModels: optional — show model selector dropdown
 *   - selectedModel: optional — current model selection
 *   - onModelChange: optional — called when user picks a new model
 */

import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Zap, ChevronDown } from 'lucide-react';
import type { AiEngine } from './bots/types';
import { AI_ENGINE_CONFIG } from './bots/types';
import { providerApi, botApi, type AIProviderInfo } from '../services/api';

interface Props {
  provider: AiEngine;
  apiKey: string;
  onProviderChange: (provider: AiEngine) => void;
  onKeyChange: (key: string) => void;
  onValidate?: (provider: string, key: string) => Promise<{ valid: boolean; error?: string; provider?: string; model?: string }>;
  botId?: string;
  compact?: boolean;
  showModels?: boolean;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export function ProviderAuth({
  provider,
  apiKey,
  onProviderChange,
  onKeyChange,
  onValidate,
  botId,
  compact = false,
  showModels = false,
  selectedModel,
  onModelChange,
}: Props) {
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; error?: string; provider?: string; model?: string } | null>(null);
  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    providerApi.list().then(setProviders).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showProviderDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProviderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProviderDropdown]);

  // Reset validation result when provider or key changes
  useEffect(() => {
    setResult(null);
  }, [provider, apiKey]);

  const handleValidate = async () => {
    if (!apiKey && provider !== 'ollama') return;
    setValidating(true);
    setResult(null);
    try {
      if (onValidate) {
        const r = await onValidate(provider, apiKey);
        setResult(r);
      } else if (botId) {
        const r = await botApi.validateKey(botId, { provider, key: apiKey, model: selectedModel });
        setResult(r);
      }
    } catch (err: any) {
      setResult({ valid: false, error: err.message || 'Validation failed' });
    } finally {
      setValidating(false);
    }
  };

  const currentProvider = providers.find(p => p.provider === provider);
  const currentConfig = AI_ENGINE_CONFIG[provider];

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={provider}
            onChange={e => onProviderChange(e.target.value as AiEngine)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          >
            {Object.entries(AI_ENGINE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => onKeyChange(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
              placeholder={provider === 'ollama' ? 'No key needed' : 'API key...'}
              disabled={provider === 'ollama'}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {botId && (
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating || (!apiKey && provider !== 'ollama')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Test Key"
            >
              {validating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            </button>
          )}
        </div>
        {result && (
          <div className={`flex items-center gap-1.5 text-[11px] ${result.valid ? 'text-emerald-400' : 'text-red-400'}`}>
            {result.valid ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {result.valid
              ? `Key valid — ${result.provider} / ${result.model}`
              : result.error
            }
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Provider Selector */}
      <div>
        <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">AI Provider</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProviderDropdown(!showProviderDropdown)}
            className="w-full flex items-center justify-between gap-3 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentConfig?.color || '#71717a' }} />
              <span>{currentConfig?.label || provider}</span>
            </div>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${showProviderDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showProviderDropdown && (
            <div ref={dropdownRef} className="absolute z-10 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
              {Object.entries(AI_ENGINE_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onProviderChange(key as AiEngine);
                    setShowProviderDropdown(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors ${
                    key === provider ? 'bg-zinc-700/50' : ''
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <span>{cfg.label}</span>
                  {key === provider && <CheckCircle size={14} className="ml-auto text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* API Key */}
      <div>
        <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">
          API Key {provider !== 'ollama' && <span className="text-red-400">*</span>}
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => onKeyChange(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            placeholder={
              provider === 'ollama'
                ? 'No key needed — local server'
                : currentProvider?.keyPrefixes.length
                ? `Starts with ${currentProvider.keyPrefixes[0]}...`
                : `Enter ${currentConfig?.label || ''} API key`
            }
            disabled={provider === 'ollama'}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {provider === 'ollama' && (
          <p className="text-[10px] text-zinc-500 mt-1">Ollama runs locally — no API key required. Make sure Ollama is running on port 11434.</p>
        )}
      </div>

      {/* Model Selector */}
      {showModels && currentProvider && (
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">Model</label>
          <select
            value={selectedModel || currentProvider.defaultModel}
            onChange={e => onModelChange?.(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          >
            {currentProvider.models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      {/* Test Key Button */}
      {(botId || onValidate) && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-zinc-500">
            {currentProvider
              ? `Required for AI responses. Used by: ${currentConfig?.label}`
              : 'Required for AI responses'
            }
          </p>
          <button
            type="button"
            onClick={handleValidate}
            disabled={validating || (!apiKey && provider !== 'ollama')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {validating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Zap size={12} />
            )}
            Test Key
          </button>
        </div>
      )}

      {/* Validation Result */}
      {result && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
          result.valid
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {result.valid ? <CheckCircle size={14} /> : <XCircle size={14} />}
          <span>
            {result.valid
              ? `Key valid — ${result.provider} / ${result.model}`
              : result.error
            }
          </span>
        </div>
      )}
    </div>
  );
}
