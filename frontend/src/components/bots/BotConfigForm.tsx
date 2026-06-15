import { useState, useEffect, useRef } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import type { AiEngine } from './types';
import { ProviderAuth } from '../ProviderAuth';

interface Props {
  botId?: string;
  name?: string;
  systemPrompt?: string;
  aiEngine?: AiEngine;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  model?: string;
  onSave: (data: { name: string; systemPrompt: string; aiEngine: AiEngine; temperature: number; maxTokens: number; apiKey: string; model?: string }) => void;
  onCancel: () => void;
}

export function BotConfigForm({ botId, name = '', systemPrompt = '', aiEngine = 'openrouter', temperature = 0.7, maxTokens = 1024, apiKey = '', model = '', onSave, onCancel }: Props) {
  const [form, setForm] = useState({ name, systemPrompt, aiEngine, temperature, maxTokens, apiKey, model });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isDirty, setIsDirty] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const initialRef = useRef({ name, systemPrompt, aiEngine, temperature, maxTokens, apiKey, model });

  // Reset form when bot changes (e.g., clicking a different bot card)
  useEffect(() => {
    const initial = { name, systemPrompt, aiEngine, temperature, maxTokens, apiKey, model };
    setForm(initial);
    initialRef.current = initial;
    setIsDirty(false);
    setSaveStatus('idle');
    setKeySaved(false);
  }, [botId, name, systemPrompt, aiEngine, temperature, maxTokens, apiKey, model]);

  // Track dirty state
  const updateForm = (patch: Partial<typeof form>) => {
    setForm(f => {
      const next = { ...f, ...patch };
      const changed = Object.keys(next).some(k => next[k as keyof typeof next] !== initialRef.current[k as keyof typeof initialRef.current]);
      setIsDirty(changed);
      return next;
    });
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      await onSave({ ...form });
      // Update initial ref so dirty state resets
      initialRef.current = { ...form };
      // If key was saved, clear it from form and show saved indicator
      if (form.apiKey) {
        setForm(f => ({ ...f, apiKey: '' }));
        initialRef.current.apiKey = '';
        setKeySaved(true);
      }
      setIsDirty(false);
      setSaveStatus('saved');
      // Clear success indicator after 3s
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1 block">Bot Name</label>
        <input
          type="text"
          value={form.name}
          onChange={e => updateForm({ name: e.target.value })}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          placeholder="My Bot"
        />
      </div>

      <div>
        <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1 block">System Prompt</label>
        <textarea
          value={form.systemPrompt}
          onChange={e => updateForm({ systemPrompt: e.target.value })}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 min-h-[120px] resize-y"
          placeholder="You are a helpful assistant..."
        />
        <p className="text-[10px] text-zinc-500 mt-1">
          Defines your bot's personality and behavior. Be specific about what it should and shouldn't do.
        </p>
      </div>

      <ProviderAuth
        botId={botId}
        provider={form.aiEngine}
        apiKey={form.apiKey}
        onProviderChange={p => updateForm({ aiEngine: p })}
        onKeyChange={k => { setKeySaved(false); updateForm({ apiKey: k }); }}
        showModels
        selectedModel={form.model}
        onModelChange={m => updateForm({ model: m })}
      />
      {keySaved && !form.apiKey && (
        <span className="text-[11px] text-emerald-400/80 -mt-2 ml-1">API key saved</span>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1 block">Temperature: {form.temperature}</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={form.temperature}
            onChange={e => updateForm({ temperature: parseFloat(e.target.value) })}
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
            value={form.maxTokens}
            onChange={e => {
              const val = parseInt(e.target.value);
              updateForm({ maxTokens: isNaN(val) ? 1024 : val });
            }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
          />
          <p className="text-[9px] text-zinc-600 mt-0.5">Maximum length of AI responses</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check size={12} /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle size={12} /> Save failed
            </span>
          )}
          {isDirty && saveStatus === 'idle' && (
            <span className="text-xs text-amber-400">Unsaved changes</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setForm({ ...initialRef.current }); setIsDirty(false); setSaveStatus('idle'); setKeySaved(false); onCancel(); }} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
