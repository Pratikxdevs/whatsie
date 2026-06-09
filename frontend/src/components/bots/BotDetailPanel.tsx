import { useState, useEffect } from 'react';
import { X, Play, Square, RotateCcw, Loader2, Trash2 } from 'lucide-react';
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
  onSave?: (id: string, data: { name: string; system_prompt: string; ai_engine: string; temperature?: number; max_tokens?: number; api_key?: string }) => void;
}

export function BotDetailPanel({ bot, onClose, onStart, onStop, onRestart, onDelete, onSave }: BotDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const platformCfg = PLATFORM_CONFIG[bot.platform];
  const engineCfg = AI_ENGINE_CONFIG[bot.aiEngine];

  useEffect(() => {
    if (activeTab === 'Analytics') {
      setLoadingData(true);
      analyticsApi.getDashboardStats().then(data => setAnalytics(data)).catch(() => setAnalytics(null)).finally(() => setLoadingData(false));
    }
  }, [activeTab, bot.id]);

  useEffect(() => {
    if (activeTab === 'Conversations') {
      setLoadingData(true);
      conversationApi.getConversations({ botId: bot.id }).then(data => setConversations(data)).catch(() => setConversations([])).finally(() => setLoadingData(false));
    }
  }, [activeTab, bot.id]);

  useEffect(() => {
    if (activeTab === 'Leads') {
      setLoadingData(true);
      leadApi.getLeads({ botId: bot.id }).then(data => setLeads(data)).catch(() => setLeads([])).finally(() => setLoadingData(false));
    }
  }, [activeTab, bot.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[500px] bg-zinc-950 border-l border-zinc-800 h-full overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <PlatformIcon platform={bot.platform} size={20} />
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">{bot.name}</h2>
                <span className="text-xs text-zinc-500">{platformCfg.label} · {bot.identifier}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onDelete?.(bot.id)} className="p-2 text-zinc-500 hover:text-red-400 transition-colors" title="Delete">
                <Trash2 size={16} />
              </button>
              <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <BotConnectionStatus status={bot.status} lastConnected={bot.lastConnected} />
            <div className="flex gap-1">
              <button
                onClick={() => onStart?.(bot.id)}
                disabled={bot.status === 'starting' || bot.status === 'connected' || bot.status === 'pending_qr'}
                className="p-1.5 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Start"
              >
                <Play size={14} />
              </button>
              <button
                onClick={() => onStop?.(bot.id)}
                disabled={bot.status === 'disconnected' || bot.status === 'error'}
                className="p-1.5 rounded-md text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={bot.status === 'connected' ? 'Stop' : 'Cancel'}
              >
                <Square size={14} />
              </button>
              <button
                onClick={() => onRestart?.(bot.id)}
                disabled={bot.status !== 'connected' && bot.status !== 'error'}
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Restart"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 px-5">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === 'Overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoCard label="Platform" value={platformCfg.label} />
                <InfoCard label="AI Engine" value={engineCfg.label} color={engineCfg.color} />
                <InfoCard label="Temperature" value={String(bot.temperature)} />
                <InfoCard label="Max Tokens" value={String(bot.maxTokens)} />
                <InfoCard label="Active Leads" value={String(bot.activeLeads)} />
                <InfoCard label="Messages Today" value={String(bot.messagesToday)} />
              </div>
              <div>
                <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">System Prompt</h4>
                <p className="text-sm text-zinc-300 bg-zinc-900 rounded-lg p-3 border border-zinc-800">{bot.systemPrompt}</p>
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
              apiKey={''}
              onSave={async (data) => {
                const updateData = {
                  name: data.name,
                  system_prompt: data.systemPrompt,
                  ai_engine: data.aiEngine,
                  temperature: data.temperature,
                  max_tokens: data.maxTokens,
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
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard label="Messages Today" value={String(analytics.messagesToday ?? bot.messagesToday)} />
                    <InfoCard label="Active Leads" value={String(analytics.activeLeads ?? bot.activeLeads)} />
                    <InfoCard label="Total Messages" value={String(analytics.totalMessages ?? 0)} />
                    <InfoCard label="Active Bots" value={String(analytics.activeBots ?? 0)} />
                  </div>
                </>
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
                  <div key={conv.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">{(conv.lead?.name || conv.contact_name || '?')[0]}</div>
                      <div>
                        <span className="text-sm text-zinc-200">{conv.lead?.name || conv.contact_name || 'Unknown'}</span>
                        <p className="text-xs text-zinc-500">{conv.lastMessage || 'No messages yet'}</p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${conv.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-zinc-500 text-sm">No conversations yet</div>
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
                  <div key={lead.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">{(lead.name || '?')[0]}</div>
                      <span className="text-sm text-zinc-200">{lead.name || 'Unknown'}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      lead.status === 'converted' ? 'bg-emerald-500/20 text-emerald-400' :
                      lead.status === 'qualified' ? 'bg-blue-500/20 text-blue-400' :
                      lead.status === 'contacted' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>{lead.status || 'new'}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-zinc-500 text-sm">No leads yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3">
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">{label}</span>
      <span className="text-sm font-medium" style={{ color: color || '#e4e4e7' }}>{value}</span>
    </div>
  );
}
