/**
 * ProviderAuth — Reusable AI provider + API key component.
 * Upgraded with Whatsie AI Engine dynamic metadata, Radix popover selector,
 * key vault obfuscation, and live credit health cards.
 */

import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Zap, ChevronDown, Search, Database, Trash2, Key } from 'lucide-react';
import type { AiEngine } from './bots/types';
import { AI_ENGINE_CONFIG } from './bots/types';
import { aiApi, type VerifyResponse } from '../services/api';
import { getVaultEntries, saveVaultEntry, deleteVaultEntry, deobfuscateKey, type VaultEntry } from '../lib/vault';
import { BrandLogo } from './ui/brand-logo';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';


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

const PROVIDER_NAMES: Record<string, string> = {
  "openai": "OpenAI",
  "anthropic": "Anthropic",
  "meta-llama": "Meta Llama",
  "google": "Google",
  "mistralai": "Mistral AI",
  "cohere": "Cohere",
  "perplexity": "Perplexity",
  "deepseek": "DeepSeek",
  "qwen": "Qwen",
  "microsoft": "Microsoft",
};

export function ProviderAuth({
  provider,
  apiKey,
  onProviderChange,
  onKeyChange,
  onValidate: _onValidate,
  botId: _botId,
  compact = false,
  showModels = false,
  selectedModel,
  onModelChange,
}: Props) {
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'no_credits'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // OpenRouter specific states
  const [credits, setCredits] = useState<number>(0);
  const [availableModels, setAvailableModels] = useState<VerifyResponse['availableModels']>([]);
  const [hoveredModel, setHoveredModel] = useState<VerifyResponse['availableModels'][0] | null>(null);
  
  // UI States
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showVaultDropdown, setShowVaultDropdown] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const vaultRef = useRef<HTMLDivElement>(null);

  // Load vault entries & auto-populate key if empty
  const [vaultKeys, setVaultKeys] = useState<VaultEntry[]>([]);

  const refreshVault = () => {
    const entries = getVaultEntries();
    setVaultKeys(entries);
    return entries;
  };

  useEffect(() => {
    const entries = refreshVault();
    // Auto-select latest key if current key is empty and it's openrouter
    if (!apiKey && entries.length > 0 && provider === 'openrouter') {
      const dec = deobfuscateKey(entries[0].obfuscatedKey);
      if (dec) {
        onKeyChange(dec);
        setCredits(entries[0].balance);
        setValidationStatus('valid');
      }
    }
  }, [provider]);

  // Click outside handlers
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProviderDropdown(false);
      }
      if (vaultRef.current && !vaultRef.current.contains(e.target as Node)) {
        setShowVaultDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // When key or provider changes, reset temporary validation states unless matching saved vault
  useEffect(() => {
    const matchingVault = vaultKeys.find(v => deobfuscateKey(v.obfuscatedKey) === apiKey);
    if (matchingVault) {
      setCredits(matchingVault.balance);
      setValidationStatus(matchingVault.balance > 0 ? 'valid' : 'no_credits');
      setValidationError(null);
    } else {
      setValidationStatus('idle');
      setValidationError(null);
    }
  }, [apiKey, provider, vaultKeys]);

  // Load OpenRouter models if key is present
  useEffect(() => {
    const trimmedKey = apiKey?.trim();
    if (provider === 'openrouter' && trimmedKey && availableModels.length === 0 && !validating) {
      setValidating(true);
      aiApi.verifyKey(trimmedKey)
        .then(res => {
          if (res.status === 'valid') {
            setAvailableModels(res.availableModels);
            setCredits(res.credits);
            setValidationStatus('valid');
          } else if (res.status === 'no_credits') {
            setValidationStatus('no_credits');
            setAvailableModels([]);
          } else {
            setValidationStatus('invalid');
            setAvailableModels([]);
          }
        })
        .catch(() => {
          setValidationStatus('invalid');
          setAvailableModels([]);
        })
        .finally(() => {
          setValidating(false);
        });
    }
  }, [apiKey, provider]);

  const handleVerify = async () => {
    const trimmedKey = apiKey?.trim();
    if (!trimmedKey) return;
    setValidating(true);
    setValidationError(null);
    try {
      const res = await aiApi.verifyKey(trimmedKey);
      setCredits(res.credits);
      setAvailableModels(res.availableModels);
      setValidationStatus(res.status);
      if (res.status === 'valid') {
        saveVaultEntry(trimmedKey, res.credits);
        refreshVault();
      } else if (res.status === 'no_credits') {
        saveVaultEntry(trimmedKey, 0);
        refreshVault();
        setValidationError("This key has no remaining OpenRouter credits.");
      } else {
        setValidationError("OpenRouter key validation failed. Please check the key.");
      }
    } catch (err: any) {
      setValidationStatus('invalid');
      setValidationError(err.response?.data?.error || err.message || 'Key validation failed.');
    } finally {
      setValidating(false);
    }
  };

  const handleSelectVaultKey = (entry: VaultEntry) => {
    const raw = deobfuscateKey(entry.obfuscatedKey);
    if (raw) {
      onKeyChange(raw);
      setCredits(entry.balance);
      setValidationStatus(entry.balance > 0 ? 'valid' : 'no_credits');
    }
    setShowVaultDropdown(false);
  };

  const handleDeleteVaultKey = (e: React.MouseEvent, entry: VaultEntry) => {
    e.stopPropagation();
    deleteVaultEntry(entry.keyHash);
    const updated = refreshVault();
    if (updated.length === 0) {
      onKeyChange('');
    } else if (apiKey === deobfuscateKey(entry.obfuscatedKey)) {
      handleSelectVaultKey(updated[0]);
    }
  };

  // Group models by provider slug
  const groupedModels = availableModels.reduce((acc, model) => {
    const slug = model.providerSlug || 'other';
    if (!acc[slug]) acc[slug] = [];
    acc[slug].push(model);
    return acc;
  }, {} as Record<string, typeof availableModels>);

  const currentConfig = AI_ENGINE_CONFIG[provider];
  const activeModel = availableModels.find(m => m.id === selectedModel);

  // Return compact inline view if requested
  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">

          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              autoComplete="new-password"
              value={apiKey}
              onChange={e => onKeyChange(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
              placeholder={'API key...'}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleVerify}
            disabled={validating || !apiKey}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors disabled:opacity-40"
          >
            {validating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          </button>
        </div>
        {validationStatus !== 'idle' && (
          <div className={`flex items-center gap-1.5 text-[11px] ${
            validationStatus === 'valid' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {validationStatus === 'valid' ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {validationStatus === 'valid' ? 'API Key verified' : (validationError || 'Invalid Key')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Provider Selector */}
      <div className="relative">
        <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">AI Provider</label>
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

      {/* API Key Input + Vault Integration */}
      <div>
        <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">
          API Key <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              autoComplete="new-password"
              value={apiKey}
              onChange={e => onKeyChange(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-600"
              placeholder={'sk-or-v1-...'}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Key Vault Button */}
          {provider === 'openrouter' && vaultKeys.length > 0 && (
            <div className="relative" ref={vaultRef}>
              <button
                type="button"
                onClick={() => setShowVaultDropdown(!showVaultDropdown)}
                className="flex items-center justify-center p-2.5 bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Select from Key Vault"
              >
                <Key size={16} />
              </button>
              {showVaultDropdown && (
                <div className="absolute right-0 mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 p-1">
                  <div className="text-[10px] text-zinc-500 font-semibold px-2 py-1 uppercase tracking-wider border-b border-zinc-700 mb-1">
                    Saved OpenRouter Keys
                  </div>
                  {vaultKeys.map(entry => (
                    <div
                      key={entry.keyHash}
                      onClick={() => handleSelectVaultKey(entry)}
                      className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-zinc-300 hover:bg-zinc-700 cursor-pointer transition-colors"
                    >
                      <span className="font-mono truncate mr-2">{entry.keyHash}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-emerald-400 font-semibold">${entry.balance.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteVaultKey(e, entry)}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleVerify}
            disabled={validating || !apiKey}
            className="flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:border-zinc-700 text-white disabled:text-zinc-500 rounded-lg transition-colors text-sm font-medium border border-transparent disabled:border"
          >
            {validating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Verify
          </button>
        </div>
      </div>

      {/* Credit & Heartbeat Health Card */}
      {provider === 'openrouter' && validationStatus !== 'idle' && (
        <div className={`flex flex-col gap-2 rounded-xl p-3 border ${
          validationStatus === 'valid'
            ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
            : 'bg-red-950/20 border-red-500/20 text-red-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  validationStatus === 'valid' ? 'bg-emerald-400' : 'bg-red-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  validationStatus === 'valid' ? 'bg-emerald-500' : 'bg-red-500'
                }`}></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider">
                {validationStatus === 'valid' ? 'Heartbeat OK' : 'Verification Failed'}
              </span>
            </div>
            {validationStatus === 'valid' && (
              <span className="text-xs font-bold text-emerald-400">
                ${credits.toFixed(4)} Credits
              </span>
            )}
          </div>
          {validationError && (
            <p className="text-[11px] text-zinc-400 mt-1">{validationError}</p>
          )}
        </div>
      )}

      {/* Advanced Searchable Model Selector */}
      {showModels && (
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">Model</label>
          {provider === 'openrouter' && validationStatus === 'valid' ? (
            <Popover open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 hover:border-zinc-600 transition-colors"
                >
                  {activeModel ? (
                    <div className="flex items-center gap-2">
                      <BrandLogo providerSlug={activeModel.providerSlug} sizeClassName="w-5 h-5 text-[10px]" />
                      <span className="font-medium text-zinc-200">{activeModel.name}</span>
                    </div>
                  ) : (
                    <span className="text-zinc-500">Select model...</span>
                  )}
                  <ChevronDown size={14} className="text-zinc-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 bg-zinc-900 border-zinc-800 w-[580px] shadow-2xl flex rounded-xl overflow-hidden divide-x divide-zinc-800">
                {/* Search / List Section */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center border-b border-zinc-800 px-3 py-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-zinc-400" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search models..."
                      className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-zinc-600 text-zinc-200"
                    />
                  </div>
                  <div className="max-h-[320px] overflow-y-auto p-1 space-y-3">
                    {Object.entries(groupedModels).map(([slug, models]) => {
                      const filtered = models.filter(m =>
                        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.id.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                      if (filtered.length === 0) return null;
                      
                      return (
                        <div key={slug} className="space-y-1">
                          <div className="text-[10px] text-zinc-500 font-semibold px-2 py-1 uppercase tracking-wider flex items-center gap-1.5">
                            <BrandLogo providerSlug={slug} sizeClassName="w-3.5 h-3.5 text-[8px]" />
                            {PROVIDER_NAMES[slug] || slug}
                          </div>
                          {filtered.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                onModelChange?.(m.id);
                                setModelSelectorOpen(false);
                              }}
                              onMouseEnter={() => setHoveredModel(m)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                                selectedModel === m.id
                                  ? 'bg-zinc-800 text-emerald-400 font-medium'
                                  : 'text-zinc-300 hover:bg-zinc-800/60'
                              }`}
                            >
                              <span className="truncate mr-2">{m.name}</span>
                              <span className="font-mono text-[9px] text-zinc-500 shrink-0">{m.context_length ? `${Math.round(m.context_length / 1000)}k` : ''}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    {availableModels.length === 0 && (
                      <div className="text-center py-6 text-zinc-500 text-xs flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin" size={16} />
                        <span>Fetching available models...</span>
                      </div>
                    )}
                    {availableModels.length > 0 && Object.values(groupedModels).every(models =>
                      models.filter(m =>
                        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        m.id.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length === 0
                    ) && (
                      <div className="text-center py-8 text-zinc-500 text-xs">
                        No models match your search query.
                      </div>
                    )}
                  </div>
                </div>

                {/* Spec Sheet Section */}
                <div className="w-[220px] bg-zinc-950/40 p-4 flex flex-col justify-between shrink-0">
                  {hoveredModel || activeModel ? (
                    (() => {
                      const displayModel = hoveredModel || activeModel!;
                      const providerName = PROVIDER_NAMES[displayModel.providerSlug] || displayModel.providerSlug;
                      const promptPrice = parseFloat(displayModel.pricing.prompt) * 1_000_000;
                      const completionPrice = parseFloat(displayModel.pricing.completion) * 1_000_000;

                      return (
                        <div className="h-full flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <BrandLogo providerSlug={displayModel.providerSlug} sizeClassName="w-8 h-8 text-sm" />
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-zinc-200 truncate">{displayModel.name}</h4>
                                <p className="text-[10px] text-zinc-500 truncate">{providerName}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2.5">
                              <div>
                                <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Context Window</span>
                                <span className="text-xs font-semibold text-zinc-300">
                                  {displayModel.context_length ? `${displayModel.context_length.toLocaleString()} tokens` : 'Unknown'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Prompt Cost</span>
                                <span className="text-xs font-semibold text-zinc-300">
                                  ${promptPrice.toFixed(2)} /M tokens
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Completion Cost</span>
                                <span className="text-xs font-semibold text-zinc-300">
                                  ${completionPrice.toFixed(2)} /M tokens
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-zinc-800/60 mt-4">
                            <span className="text-[9px] text-zinc-500 font-mono break-all select-all block leading-normal">
                              {displayModel.id}
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-zinc-600">
                      <Database size={24} />
                      <span className="text-[11px]">Hover over a model to inspect its technical specifications.</span>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-sm text-zinc-500 text-center italic">
              Please verify your API key to load available models.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
