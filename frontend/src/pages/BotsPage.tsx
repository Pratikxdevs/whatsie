import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { io as ioClient, Socket } from 'socket.io-client';
import type { Bot, Platform, BotStatus } from '../components/bots/types';
import { PLATFORM_CONFIG } from '../components/bots/types';
import { BotGrid } from '../components/bots/BotGrid';
import { BotDetailPanel } from '../components/bots/BotDetailPanel';
import { AddBotModal } from '../components/bots/AddBotModal';
import { BulkActions } from '../components/bots/BulkActions';
import { QRCodeModal } from '../components/bots/QRCodeModal';
import { botApi, getSocketUrl } from '../services/api';
import heroBg from '../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png';

const STATUS_OPTIONS: { value: BotStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'connected', label: 'Connected' },
  { value: 'disconnected', label: 'Disconnected' },
  { value: 'pending_qr', label: 'Pending QR' },
  { value: 'starting', label: 'Starting' },
  { value: 'error', label: 'Error' },
  { value: 'scanned', label: 'Scanned' },
];

function mapWorkspaceToBot(ws: any): Bot {
  return {
    id: ws.id,
    name: ws.name,
    platform: ws.platform || 'whatsapp',
    status: ws.status === 'connected' ? 'connected' : ws.status === 'pending_qr' ? 'pending_qr' : ws.status === 'starting' ? 'starting' : ws.status === 'scanned' ? 'scanned' : ws.status === 'error' ? 'error' : 'disconnected',
    identifier: ws.platform === 'telegram' ? (ws.session_id || 'telegram-bot') : (ws.session_id || ws.id),
    aiEngine: ws.ai_engine || 'groq',
    temperature: ws.temperature || 0.7,
    maxTokens: ws.max_tokens || 1024,
    systemPrompt: ws.system_prompt || '',
    apiKey: ws.api_key || '',
    activeLeads: 0,
    messagesToday: 0,
    lastConnected: ws.status === 'connected' ? ws.updated_at : null,
    createdAt: ws.created_at,
  };
}

export function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<BotStatus | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailBotId, setDetailBotId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [qrModal, setQrModal] = useState<{ botId: string; botName: string; qrCode: string | null; status: 'loading' | 'pending_qr' | 'connected' | 'error'; platform?: string } | null>(null);
  const intervalsRef = useRef<Map<string, number[]>>(new Map());

  const botsRef = useRef(bots);
  useEffect(() => { botsRef.current = bots; }, [bots]);

  useEffect(() => {
    loadBots();
    // Auto-refresh bot statuses every 30 seconds (fallback)
    const refreshInterval = setInterval(loadBots, 30000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Socket.IO — real-time bot status updates
  useEffect(() => {
    const socket: Socket = ioClient(getSocketUrl());
    // Join tenant room (use 'default' for now since auth is mocked)
    socket.emit('join_tenant', 'default');
    socket.on('bot_status_change', ({ botId, status }: { botId: string; status: BotStatus }) => {
      setBots(prev => prev.map(b => b.id === botId ? {
        ...b,
        status,
        lastConnected: status === 'connected' ? new Date().toISOString() : b.lastConnected,
      } : b));
      // Update QR modal if open for this bot
      if (status === 'connected') {
        setQrModal(prev => prev && prev.botId === botId ? { ...prev, status: 'connected' } : prev);
      }
    });
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    return () => { intervalsRef.current.forEach(ids => ids.forEach(id => clearInterval(id))); };
  }, []);

  const loadBots = async () => {
    try {
      const workspaces = await botApi.getWorkspaces();
      setBots(workspaces.map(mapWorkspaceToBot));
    } catch (err) {
      console.error('Failed to load bots:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return bots.filter(b => {
      if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.identifier.toLowerCase().includes(search.toLowerCase())) return false;
      if (platformFilter !== 'all' && b.platform !== platformFilter) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      return true;
    });
  }, [bots, search, platformFilter, statusFilter]);

  const detailBot = detailBotId ? bots.find(b => b.id === detailBotId) || null : null;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bot? This cannot be undone.')) return;
    const removed = bots.find(b => b.id === id);
    // Optimistic: remove from UI immediately
    setBots(prev => prev.filter(b => b.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    try {
      await botApi.deleteWorkspace(id);
    } catch {
      // Rollback if delete failed
      if (removed) setBots(prev => [...prev, removed].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const handleStartStop = async (id: string) => {
    const bot = bots.find(b => b.id === id);
    if (!bot) return;

    // Cancel if bot is in pending/starting state
    if (bot.status === 'starting' || bot.status === 'pending_qr') {
      // Clear polling intervals for this bot only
      const botIntervals = intervalsRef.current.get(id) || [];
      botIntervals.forEach(clearInterval);
      intervalsRef.current.delete(id);
      setQrModal(null);
      setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'disconnected' } : b));
      try { await botApi.stopWorkspace(id); } catch { /* ignore */ }
      return;
    }

    if (bot.status === 'connected') {
      // Stop the bot
      setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'disconnected' } : b));
      try {
        await botApi.stopWorkspace(id);
      } catch (err) {
        console.error('Failed to stop bot:', err);
        // Revert on failure
        setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'connected' } : b));
      }
    } else {
      // Start the bot
      setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'starting' } : b));

      // Telegram and Discord bots connect instantly — no QR needed
      if (bot.platform === 'telegram' || bot.platform === 'discord') {
        try {
          const res = await botApi.startWorkspace(id);
          const newStatus: BotStatus = res.sessionInfo.status === 'connected' ? 'connected' : 'starting';
          setBots(prev => prev.map(b => b.id === id ? {
            ...b,
            status: newStatus,
            lastConnected: newStatus === 'connected' ? new Date().toISOString() : b.lastConnected,
          } : b));
        } catch (err) {
          console.error('Failed to start Telegram bot:', err);
          setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'error' } : b));
        }
        return;
      }

      // WhatsApp — show QR modal
      setQrModal({ botId: id, botName: bot.name, qrCode: null, status: 'loading', platform: bot.platform });
      try {
        const res = await botApi.startWorkspace(id);
        if (res.screenshotUrl) {
          // QR code received — show it
          setQrModal({ botId: id, botName: bot.name, qrCode: res.screenshotUrl, status: 'pending_qr', platform: bot.platform });
          setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'starting' } : b));

          // Poll for connection status
          let pollFailCount = 0;
          const pollInterval = setInterval(async () => {
            try {
              const statusRes = await botApi.getConnectionStatus(id);
              pollFailCount = 0;
              if (statusRes.sessionInfo.status === 'connected') {
                clearInterval(pollInterval);
                setQrModal(prev => prev ? { ...prev, status: 'connected' } : null);
                setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'connected', lastConnected: new Date().toISOString() } : b));
              }
            } catch {
              pollFailCount++;
              if (pollFailCount >= 5) {
                clearInterval(pollInterval);
                setQrModal(prev => prev ? { ...prev, status: 'error' } : null);
                setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'error' } : b));
              }
            }
          }, 3000);
          const existing = intervalsRef.current.get(id) || [];
          existing.push(pollInterval);
          intervalsRef.current.set(id, existing);

          // Stop polling after 2 minutes
          const timeoutId = window.setTimeout(() => clearInterval(pollInterval), 120000);
          existing.push(timeoutId);
        } else {
          // No QR — might already be connected or warming up
          const rawStatus = res.sessionInfo.status;
          const newStatus: BotStatus =
            rawStatus === 'connected' ? 'connected' :
            rawStatus === 'pending_qr' ? 'pending_qr' :
            rawStatus === 'starting' ? 'starting' :
            rawStatus === 'error' ? 'error' : 'starting';
          setBots(prev => prev.map(b => b.id === id ? {
            ...b,
            status: newStatus,
            lastConnected: newStatus === 'connected' ? new Date().toISOString() : b.lastConnected,
          } : b));
          if (newStatus === 'connected') {
            setQrModal({ botId: id, botName: bot.name, qrCode: null, status: 'connected', platform: bot.platform });
          } else if (newStatus === 'pending_qr' || newStatus === 'starting') {
            // Keep modal open, poll for QR/connection
            let pollFailCount = 0;
            const pollInterval = setInterval(async () => {
              try {
                const statusRes = await botApi.getConnectionStatus(id);
                pollFailCount = 0;
                if (statusRes.screenshotUrl) {
                  setQrModal(prev => prev ? { ...prev, qrCode: statusRes.screenshotUrl, status: 'pending_qr' } : null);
                }
                if (statusRes.sessionInfo.status === 'connected') {
                  clearInterval(pollInterval);
                  setQrModal(prev => prev ? { ...prev, status: 'connected' } : null);
                  setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'connected', lastConnected: new Date().toISOString() } : b));
                }
              } catch {
                pollFailCount++;
                if (pollFailCount >= 5) {
                  clearInterval(pollInterval);
                  setQrModal(prev => prev ? { ...prev, status: 'error' } : null);
                  setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'error' } : b));
                }
              }
            }, 3000);
            const existing2 = intervalsRef.current.get(id) || [];
            existing2.push(pollInterval);
            intervalsRef.current.set(id, existing2);
            const timeoutId = window.setTimeout(() => clearInterval(pollInterval), 120000);
            existing2.push(timeoutId);
          } else {
            setQrModal(null);
          }
        }
      } catch (err) {
        console.error('Failed to start bot:', err);
        setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'error' } : b));
        setQrModal({ botId: id, botName: bot.name, qrCode: null, status: 'error' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200">
      {/* Hero */}
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div
          className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: `url('${heroBg}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative z-20 w-full flex justify-end px-6 md:px-12 lg:px-16 pt-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all"
          >
            <Plus size={18} />
            Add Bot
          </button>
        </div>
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-8">
          <h1 className="text-white font-semibold leading-[0.92] tracking-[-0.02em]" style={{ fontSize: 'clamp(52px, 9vw, 108px)', lineHeight: 0.92 }}>
            BOT<br />MANAGEMENT
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-6 md:px-12 lg:px-16 py-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search bots..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
            />
          </div>
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value as Platform | 'all')}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none"
          >
            <option value="all">All Platforms</option>
            {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as BotStatus | 'all')}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="text-xs text-zinc-500">{filtered.length} bot{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800" />
                  <div className="flex-1">
                    <div className="h-4 bg-zinc-800 rounded w-24 mb-2" />
                    <div className="h-3 bg-zinc-800 rounded w-16" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-zinc-800 rounded w-full" />
                  <div className="h-3 bg-zinc-800 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <BotGrid
            bots={filtered}
            selected={selected}
            onSelect={toggleSelect}
            onEdit={id => setDetailBotId(id)}
            onStartStop={handleStartStop}
            onDelete={handleDelete}
            onClick={id => setDetailBotId(id)}
          />
        )}
      </div>

      {/* Bulk Actions */}
      <BulkActions
        count={selected.size}
        onStartAll={async () => {
          for (const id of selected) {
            const bot = bots.find(b => b.id === id);
            if (bot && bot.status !== 'starting' && bot.status !== 'connected') {
              await handleStartStop(id);
            }
          }
        }}
        onStopAll={async () => {
          for (const id of selected) {
            const bot = bots.find(b => b.id === id);
            if (bot && bot.status === 'connected') {
              setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'disconnected' } : b));
              try {
                await botApi.stopWorkspace(id);
              } catch (err) {
                console.error('Failed to stop bot:', err);
                setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'connected' } : b));
              }
            }
          }
        }}
        onDeleteAll={async () => {
          if (!confirm(`Delete ${selected.size} bots? This cannot be undone.`)) return;
          const selectedIds = Array.from(selected);
          // Save snapshot for rollback
          const snapshot = bots.filter(b => selected.has(b.id));
          // Optimistic: remove from UI immediately
          setBots(prev => prev.filter(b => !selected.has(b.id)));
          setSelected(new Set());
          const failedIds: string[] = [];
          for (const id of selectedIds) {
            try {
              await botApi.deleteWorkspace(id);
            } catch (err) {
              console.error('Failed to delete bot:', id, err);
              failedIds.push(id);
            }
          }
          // Rollback failed deletions
          if (failedIds.length > 0) {
            const failedBots = snapshot.filter(b => failedIds.includes(b.id));
            setBots(prev => [...prev, ...failedBots].sort((a, b) => a.name.localeCompare(b.name)));
          }
        }}
        onDeselect={() => setSelected(new Set())}
      />

      {/* Detail Panel */}
      {detailBot && (
        <BotDetailPanel
          bot={detailBot}
          onClose={() => setDetailBotId(null)}
          onStart={handleStartStop}
          onStop={async (id) => {
            setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'disconnected' } : b));
            try {
              await botApi.stopWorkspace(id);
            } catch (err) {
              console.error('Failed to stop bot:', err);
              setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'connected' } : b));
            }
          }}
          onRestart={async (id) => {
            setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'disconnected' } : b));
            try {
              await botApi.stopWorkspace(id);
              // Poll until the backend confirms the bot is no longer connected
              let disconnected = false;
              for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 500));
                try {
                  const statusRes = await botApi.getConnectionStatus(id);
                  if (statusRes.sessionInfo.status !== 'connected') {
                    disconnected = true;
                    break;
                  }
                } catch {
                  disconnected = true;
                  break;
                }
              }
              // If still connected after retries, proceed anyway
              setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'starting' } : b));
              const bot = botsRef.current.find(b => b.id === id);
              if (!bot) return;

              // Telegram and Discord connect instantly — no QR modal
              if (bot.platform === 'telegram' || bot.platform === 'discord') {
                try {
                  const res = await botApi.startWorkspace(id);
                  const newStatus: BotStatus = res.sessionInfo.status === 'connected' ? 'connected' : 'starting';
                  setBots(prev => prev.map(b => b.id === id ? {
                    ...b,
                    status: newStatus,
                    lastConnected: newStatus === 'connected' ? new Date().toISOString() : b.lastConnected,
                  } : b));
                  if (newStatus === 'connected') loadBots();
                } catch (err) {
                  console.error('Failed to restart:', err);
                  setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'error' } : b));
                }
                return;
              }

              setQrModal({ botId: id, botName: bot.name, qrCode: null, status: 'loading' });
              try {
                const res = await botApi.startWorkspace(id);
                if (res.screenshotUrl) {
                  setQrModal({ botId: id, botName: bot.name, qrCode: res.screenshotUrl, status: 'pending_qr', platform: bot.platform });
                  let pollFailCount = 0;
                  const pollInterval = setInterval(async () => {
                    try {
                      const statusRes = await botApi.getConnectionStatus(id);
                      pollFailCount = 0;
                      if (statusRes.sessionInfo.status === 'connected') {
                        clearInterval(pollInterval);
                        setQrModal(prev => prev ? { ...prev, status: 'connected' } : null);
                        setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'connected', lastConnected: new Date().toISOString() } : b));
                      }
                    } catch {
                      pollFailCount++;
                      if (pollFailCount >= 5) {
                        clearInterval(pollInterval);
                        setQrModal(prev => prev ? { ...prev, status: 'error' } : null);
                        setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'error' } : b));
                      }
                    }
                  }, 3000);
                  const existing3 = intervalsRef.current.get(id) || [];
                  existing3.push(pollInterval);
                  intervalsRef.current.set(id, existing3);
                  const timeoutId = window.setTimeout(() => clearInterval(pollInterval), 120000);
                  existing3.push(timeoutId);
                } else {
                  const rawStatus = res.sessionInfo.status;
                  const newStatus: BotStatus =
                    rawStatus === 'connected' ? 'connected' :
                    rawStatus === 'pending_qr' ? 'pending_qr' :
                    rawStatus === 'starting' ? 'starting' :
                    rawStatus === 'error' ? 'error' : 'starting';
                  setBots(prev => prev.map(b => b.id === id ? { ...b, status: newStatus, lastConnected: newStatus === 'connected' ? new Date().toISOString() : b.lastConnected } : b));
                  if (newStatus === 'connected') {
                    setQrModal({ botId: id, botName: bot.name, qrCode: null, status: 'connected', platform: bot.platform });
                  } else if (newStatus === 'pending_qr' || newStatus === 'starting') {
                    let pollFailCount = 0;
                    const pollInterval = setInterval(async () => {
                      try {
                        const statusRes = await botApi.getConnectionStatus(id);
                        pollFailCount = 0;
                        if (statusRes.screenshotUrl) {
                          setQrModal(prev => prev ? { ...prev, qrCode: statusRes.screenshotUrl, status: 'pending_qr' } : null);
                        }
                        if (statusRes.sessionInfo.status === 'connected') {
                          clearInterval(pollInterval);
                          setQrModal(prev => prev ? { ...prev, status: 'connected' } : null);
                          setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'connected', lastConnected: new Date().toISOString() } : b));
                        }
                      } catch {
                        pollFailCount++;
                        if (pollFailCount >= 5) {
                          clearInterval(pollInterval);
                          setQrModal(prev => prev ? { ...prev, status: 'error' } : null);
                          setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'error' } : b));
                        }
                      }
                    }, 3000);
                    const existing4 = intervalsRef.current.get(id) || [];
                    existing4.push(pollInterval);
                    intervalsRef.current.set(id, existing4);
                    const timeoutId = window.setTimeout(() => clearInterval(pollInterval), 120000);
                    existing4.push(timeoutId);
                  } else {
                    setQrModal(null);
                  }
                }
              } catch (startErr) {
                console.error('Failed to start bot:', startErr);
                setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'error' } : b));
                setQrModal({ botId: id, botName: bot.name, qrCode: null, status: 'error' });
              }
            } catch (err) {
              console.error('Failed to restart bot:', err);
              setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'error' } : b));
              setQrModal(null);
            }
          }}
          onSave={async (id, data) => {
            try {
              await botApi.updateWorkspace(id, data);
              setBots(prev => prev.map(b => b.id === id ? {
                ...b,
                name: data.name,
                systemPrompt: data.system_prompt,
                aiEngine: (data.ai_engine as any) || b.aiEngine,
                ...(data.temperature !== undefined ? { temperature: data.temperature } : {}),
                ...(data.max_tokens !== undefined ? { maxTokens: data.max_tokens } : {}),
                ...(data.api_key ? { apiKey: '***' } : {}),
              } : b));
            } catch (err) {
              console.error('Failed to save bot config:', err);
            }
          }}
          onDelete={handleDelete}
        />
      )}

      {/* Add Bot Modal */}
      <AddBotModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onComplete={() => loadBots()}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={!!qrModal}
        onClose={() => {
          // If bot is still pending/starting, clean up the connection
          if (qrModal && (qrModal.status === 'pending_qr' || qrModal.status === 'loading')) {
            botApi.stopWorkspace(qrModal.botId).catch(() => {});
            setBots(prev => prev.map(b => b.id === qrModal.botId ? { ...b, status: 'disconnected' } : b));
          }
          // Clear polling intervals for this bot only
          if (qrModal) {
            const botIntervals = intervalsRef.current.get(qrModal.botId) || [];
            botIntervals.forEach(clearInterval);
            intervalsRef.current.delete(qrModal.botId);
          }
          setQrModal(null);
        }}
        onConnected={() => { loadBots(); setQrModal(null); }}
        onRetry={qrModal ? () => { setQrModal(null); handleStartStop(qrModal.botId); } : undefined}
        botName={qrModal?.botName || ''}
        qrCode={qrModal?.qrCode}
        status={qrModal?.status || 'loading'}
        platform={qrModal?.platform}
      />
    </div>
  );
}
