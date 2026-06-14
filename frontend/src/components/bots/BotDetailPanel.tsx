import { useState, useEffect } from 'react';
import { X, Play, Square, RotateCcw, Loader2, Trash2, Settings, Bot as BotIcon, Activity, MessageSquare } from 'lucide-react';
import type { Bot } from './types';
import { PLATFORM_CONFIG, AI_ENGINE_CONFIG } from './types';
import { PlatformIcon } from './PlatformIcon';
import { BotConnectionStatus } from './BotConnectionStatus';
import { BotConfigForm } from './BotConfigForm';
import { botApi, analyticsApi, conversationApi, leadApi } from '../../services/api';

const TABS = ['Overview', 'Configuration', 'Analytics', 'Conversations', 'Leads'] as const;
type Tab = typeof TABS[number];

interface BotDetailPanelProps {
  bot: Bot;
  onClose: () => void;
  onStart?: (id: string) => void;
  onStop?: (id: string) => void;
  onRestart?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSave?: (id: string, data: any) => void;
}

export function BotDetailPanel({ bot, onClose, onStart, onStop, onRestart, onDelete, onSave }: BotDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // Handoff state
  const platformCfg = PLATFORM_CONFIG[bot.platform];
  const engineCfg = AI_ENGINE_CONFIG[bot.aiEngine] || { label: bot.aiEngine, color: '#71717a' };

  // Sync paused state on load (mock for now until backend supports config.paused)
  useEffect(() => setIsPaused(false), [bot.id]);

  const togglePause = () => {
    setIsPaused(!isPaused);
    // In a real implementation: botApi.updateWorkspace(bot.id, { config: { paused: !isPaused } })
  };

  useEffect(() => {
    if (activeTab === 'Analytics') {
      setLoadingData(true);
      analyticsApi.getDashboardStats().then(data => setAnalytics(data)).catch(() => setAnalytics(null)).finally(() => setLoadingData(false));
    }
    if (activeTab === 'Conversations') {
      setLoadingData(true);
      conversationApi.getConversations({ botId: bot.id }).then(data => setConversations(data)).catch(() => setConversations([])).finally(() => setLoadingData(false));
    }
    if (activeTab === 'Leads') {
      setLoadingData(true);
      leadApi.getLeads({ botId: bot.id }).then(data => setLeads(data)).catch(() => setLeads([])).finally(() => setLoadingData(false));
    }
  }, [activeTab, bot.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[640px] bg-zinc-950 border-l border-zinc-800 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <PlatformIcon platform={bot.platform} size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{bot.name}</h2>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  <span className="uppercase tracking-wider font-semibold">{platformCfg.label}</span>
                  <span>&bull;</span>
                  <span className="font-mono">{bot.identifier}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button onClick={() => onDelete?.(bot.id)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors" title="Delete">
                <Trash2 size={16} />
              </button>
              <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <BotConnectionStatus status={bot.status} lastConnected={bot.lastConnected} />
            <div className="flex gap-2">
              <button
                onClick={() => onStart?.(bot.id)}
                disabled={bot.status === 'starting' || bot.status === 'connected' || bot.status === 'pending_qr'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play size={14} /> Start
              </button>
              <button
                onClick={() => onStop?.(bot.id)}
                disabled={bot.status === 'disconnected' || bot.status === 'error'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 hover:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Square size={14} /> {bot.status === 'connected' ? 'Stop' : 'Cancel'}
              </button>
              <button
                onClick={() => onRestart?.(bot.id)}
                disabled={bot.status !== 'connected' && bot.status !== 'error'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw size={14} /> Restart
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 px-6 gap-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3.5 text-xs font-semibold tracking-wide transition-colors border-b-2 relative -mb-px ${
                activeTab === tab ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'Overview' && (
            <div className="flex flex-col gap-4">
              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Main Focus: Connection & Identity Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <Activity size={14} className="text-emerald-400" /> Platform Status
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
                          <PlatformIcon platform={bot.platform} size={24} />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-white">
                            {bot.status === 'connected' ? 'Connected via Evolution' : 'Disconnected'}
                          </p>
                          <p className="text-sm text-zinc-500 font-mono mt-0.5">{bot.identifier || 'Waiting for connection...'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Human Handoff Toggle */}
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-2">Human Handoff</span>
                      <button
                        onClick={togglePause}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isPaused ? 'bg-amber-500' : 'bg-zinc-700'}`}
                        title={isPaused ? "Bot is paused. Human is handling." : "Bot is active."}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPaused ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className={`text-[10px] mt-1 font-medium ${isPaused ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {isPaused ? 'PAUSED' : 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Secondary: AI Settings */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <BotIcon size={14} className="text-blue-400" /> Intelligence
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-zinc-500">Engine</span>
                      <span className="text-sm font-semibold" style={{ color: engineCfg.color }}>{engineCfg.label}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-zinc-500">Temperature</span>
                      <span className="text-sm font-mono text-white">{bot.temperature}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-zinc-500">Max Tokens</span>
                      <span className="text-sm font-mono text-white">{bot.maxTokens}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Secondary: Usage Stats */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <MessageSquare size={14} className="text-purple-400" /> Today's Usage
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-950 rounded-xl border border-zinc-800/50 p-3">
                      <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Messages</span>
                      <span className="text-2xl font-bold text-white">{bot.messagesToday}</span>
                    </div>
                    <div className="bg-zinc-950 rounded-xl border border-zinc-800/50 p-3">
                      <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Active Leads</span>
                      <span className="text-2xl font-bold text-white">{bot.activeLeads}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* System Prompt Block */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm mt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Settings size={14} /> System Prompt
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">{bot.systemPrompt?.length || 0} chars</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800/50 rounded-xl p-4 max-h-[160px] overflow-y-auto">
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono text-xs">
                    {bot.systemPrompt || 'No system prompt configured.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Configuration' && (
            <BotConfigForm
              botId={bot.id}
              name={bot.name}
              systemPrompt={bot.systemPrompt}
              aiEngine={bot.aiEngine}
              temperature={bot.temperature}
              maxTokens={bot.maxTokens}
              apiKey={bot.apiKey}
              model={bot.model}
              onSave={async (data) => {
                const updateData = {
                  name: data.name,
                  system_prompt: data.systemPrompt,
                  ai_engine: data.aiEngine,
                  temperature: data.temperature,
                  max_tokens: data.maxTokens,
                  model: data.model,
                  ...(data.apiKey ? { api_key: data.apiKey } : {}),
                };
                if (onSave) {
                  await onSave(bot.id, updateData);
                } else {
                  await botApi.updateWorkspace(bot.id, updateData);
                }
              }}
              onCancel={() => setActiveTab('Overview')}
            />
          )}

          {activeTab === 'Analytics' && (
             <div className="space-y-4">
             {loadingData ? (
               <div className="flex items-center justify-center py-10">
                 <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
               </div>
             ) : analytics ? (
               <div className="grid grid-cols-2 gap-3">
                 <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
                   <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Messages Today</span>
                   <span className="text-xl font-bold text-white">{analytics.messagesToday ?? bot.messagesToday}</span>
                 </div>
                 <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
                   <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Active Leads</span>
                   <span className="text-xl font-bold text-white">{analytics.activeLeads ?? bot.activeLeads}</span>
                 </div>
                 <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
                   <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Total Messages</span>
                   <span className="text-xl font-bold text-white">{analytics.totalMessages ?? 0}</span>
                 </div>
                 <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
                   <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Active Bots</span>
                   <span className="text-xl font-bold text-white">{analytics.activeBots ?? 0}</span>
                 </div>
               </div>
             ) : (
               <div className="text-center py-10 text-zinc-500 text-sm">No analytics data yet</div>
             )}
           </div>
          )}

          {activeTab === 'Conversations' && (
            <div className="space-y-2">
              {loadingData ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                </div>
              ) : conversations.length > 0 ? (
                conversations.map((conv: any) => (
                  <div key={conv.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-300">{(conv.lead?.name || conv.contact_name || '?')[0]}</div>
                      <div>
                        <span className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{conv.lead?.name || conv.contact_name || 'Unknown'}</span>
                        <p className="text-xs text-zinc-500 truncate max-w-[200px]">{conv.lastMessage || 'No messages yet'}</p>
                      </div>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${conv.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'}`} />
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                  <MessageSquare size={32} className="mb-3 text-zinc-800" />
                  <p className="text-sm">No conversations found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Leads' && (
            <div className="space-y-2">
              {loadingData ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                </div>
              ) : leads.length > 0 ? (
                leads.map((lead: any) => (
                  <div key={lead.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-300">{(lead.name || '?')[0]}</div>
                      <span className="text-sm font-medium text-white">{lead.name || 'Unknown'}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                      lead.status === 'converted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      lead.status === 'qualified' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      lead.status === 'contacted' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}>{lead.status?.toUpperCase() || 'NEW'}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-zinc-500 text-sm">No leads captured yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
