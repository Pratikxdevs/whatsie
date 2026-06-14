/**
 * Frontend API Service
 *
 * All calls go to the real backend via Vite proxy.
 * Errors propagate to callers with structured error codes.
 */
import axios from 'axios';
import { errorLog } from './errorLog';
import { clerkBridge } from '../lib/clerk-bridge';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Clerk session token to every request when available
const authInterceptor = async (config: any) => {
  const token = await clerkBridge.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};
api.interceptors.request.use(authInterceptor);

// Log all API errors automatically
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const endpoint = error?.config?.url || '';

    if (!error.response) {
      // Network error — backend unreachable
      import('sonner').then(({ toast }) => {
        toast.error('Cannot reach the server. Check your connection.');
      });
    } else if ((status === 401 || status === 403) && !endpoint.includes('/ai/verify')) {
      // Session expired or permission denied — sign out via bridge and redirect
      await clerkBridge.signOut();
      import('sonner').then(({ toast }) => {
        toast.info('Session expired or invalid — please sign in again');
      });
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (status && status >= 500) {
      // Server error — inform, don't redirect
      import('sonner').then(({ toast }) => {
        toast.error('Server error — please try again in a moment.');
      });
    }

    errorLog.logApiError(error, endpoint);
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Workspace {
  id: string;
  name: string;
  session_id: string;
  bot_active: boolean;
  whatsapp_status: string;
  system_prompt: string;
  groq_api_key?: string | null;
  platform?: string;
  ai_engine?: string;
  temperature?: number;
  max_tokens?: number;
  created_at: string;
  updated_at: string;
}

export interface ConnectionStatus {
  sessionInfo: { status: string };
  screenshotUrl: string | null;
}

// ---------------------------------------------------------------------------
// Workspace API
// ---------------------------------------------------------------------------
export const botApi = {
  getWorkspaces: async (): Promise<Workspace[]> => {
    const res = await api.get('/workspaces');
    return res.data.workspaces ?? [];
  },

  createWorkspace: async (name: string, opts?: { system_prompt?: string; ai_engine?: string; platform?: string; api_key?: string; bot_token?: string; username?: string; email?: string; password?: string; totp_secret?: string; temperature?: number; max_tokens?: number; model?: string }): Promise<Workspace> => {
    const res = await api.post('/workspaces', { name, ...opts });
    return res.data.workspace;
  },

  updateWorkspace: async (id: string, data: Partial<Workspace>): Promise<Workspace> => {
    const res = await api.put(`/workspaces/${id}`, data);
    return res.data.workspace;
  },

  deleteWorkspace: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${id}`);
  },

  getConnectionStatus: async (id: string): Promise<ConnectionStatus> => {
    const res = await api.get(`/workspaces/${id}/connection-status`);
    return res.data;
  },

  startWorkspace: async (id: string): Promise<ConnectionStatus> => {
    const res = await api.post(`/workspaces/${id}/start`);
    return res.data;
  },

  stopWorkspace: async (id: string): Promise<void> => {
    await api.post(`/workspaces/${id}/stop`);
  },

  validateKey: async (id: string, params?: { provider?: string; key?: string; model?: string }): Promise<{ valid: boolean; error?: string; provider?: string; model?: string }> => {
    const res = await api.post(`/workspaces/${id}/validate-key`, params);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// AI Provider API
// ---------------------------------------------------------------------------
export interface AIProviderInfo {
  provider: string;
  label: string;
  baseURL: string;
  defaultModel: string;
  models: string[];
  keyPrefixes: string[];
  envKey: string;
}

export const providerApi = {
  list: async (): Promise<AIProviderInfo[]> => {
    const res = await api.get('/providers');
    return res.data.providers ?? [];
  },
};

// ---------------------------------------------------------------------------
// Lead API
// ---------------------------------------------------------------------------
export const leadApi = {
  getLeads: async (params?: Record<string, unknown>) => {
    const res = await api.get('/leads', { params });
    return res.data.leads ?? res.data ?? [];
  },

  getLead: async (id: string) => {
    const res = await api.get(`/leads/${id}`);
    return res.data.lead ?? res.data;
  },

  updateLead: async (id: string, data: Record<string, unknown>) => {
    const res = await api.patch(`/leads/${id}`, data);
    return res.data.lead ?? res.data;
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post('/leads', data);
    return res.data.lead;
  },

  delete: async (id: string) => {
    await api.delete(`/leads/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Conversation API
// ---------------------------------------------------------------------------
export const conversationApi = {
  getConversations: async (params?: Record<string, unknown>) => {
    const res = await api.get('/conversations', { params });
    return res.data.conversations ?? res.data ?? [];
  },

  getMessages: async (conversationId: string, params?: Record<string, unknown>) => {
    const res = await api.get(`/conversations/${conversationId}/messages`, { params });
    return res.data.messages ?? res.data ?? [];
  },

  sendMessage: async (conversationId: string, content: string) => {
    const res = await api.post(`/conversations/${conversationId}/messages`, { content });
    return res.data.message ?? res.data;
  },

  updateStatus: async (conversationId: string, status: 'open' | 'closed') => {
    const res = await api.patch(`/conversations/${conversationId}/status`, { status });
    return res.data.conversation ?? res.data;
  },

  deleteConversation: async (conversationId: string) => {
    await api.delete(`/conversations/${conversationId}`);
  },

  sendMedia: async (conversationId: string, file: File, messageType: string) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1] || result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await api.post(`/conversations/${conversationId}/media`, {
      base64,
      messageType,
      fileName: file.name,
      mimeType: file.type,
    });
    return res.data.message ?? res.data;
  },

  // --- Evolution API (WhatsApp) ---

  getChats: async (): Promise<any[]> => {
    const res = await api.get('/whatsapp/chats');
    return res.data ?? [];
  },

  searchContacts: async (query?: string): Promise<any[]> => {
    const params = query ? { q: query } : {};
    const res = await api.get('/whatsapp/contacts', { params });
    return res.data ?? [];
  },

  getChatMessages: async (jid: string, sessionName: string, page?: number, offset?: number): Promise<any[]> => {
    const params: any = { sessionName };
    if (page) params.page = page;
    if (offset) params.offset = offset;
    const res = await api.get(`/whatsapp/messages/${encodeURIComponent(jid)}`, { params });
    return res.data.messages ?? [];
  },

  sendWhatsAppMessage: async (jid: string, sessionName: string, text: string): Promise<any> => {
    const res = await api.post('/whatsapp/send', { sessionName, number: jid, text });
    return res.data;
  },

  sendWhatsAppMedia: async (jid: string, sessionName: string, file: File, messageType: string, caption?: string): Promise<any> => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1] || result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await api.post('/whatsapp/media', {
      sessionName,
      number: jid,
      base64,
      mediatype: messageType === 'video' ? 'video' : messageType === 'audio' ? 'audio' : messageType === 'document' ? 'document' : 'image',
      mimetype: file.type || `${messageType}/octet-stream`,
      fileName: file.name,
      caption: caption || '',
    });
    return res.data;
  },

  markAsRead: async (sessionName: string, messages: Array<{ remoteJid: string; fromMe: boolean; id: string }>): Promise<void> => {
    await api.post('/whatsapp/read', { sessionName, messages });
  },

  sendTyping: async (sessionName: string, number: string, presence: 'composing' | 'recording' | 'paused' = 'composing'): Promise<void> => {
    await api.post('/whatsapp/typing', { sessionName, number, presence });
  },

  getProfilePicture: async (jid: string, sessionName: string): Promise<string | null> => {
    const res = await api.get(`/whatsapp/profile/${encodeURIComponent(jid)}`, { params: { sessionName } });
    return res.data.pictureUrl ?? null;
  },

  blockContact: async (sessionName: string, number: string, status: 'block' | 'unblock'): Promise<void> => {
    await api.post('/whatsapp/block', { sessionName, number, status });
  },

  archiveChat: async (sessionName: string, lastMessage: any, chat: string, archive: boolean): Promise<void> => {
    await api.post('/whatsapp/archive', { sessionName, lastMessage, chat, archive });
  },

  deleteMessage: async (sessionName: string, id: string, remoteJid: string, fromMe: boolean): Promise<void> => {
    await api.delete('/whatsapp/message', { data: { sessionName, id, remoteJid, fromMe } });
  },
};

// ---------------------------------------------------------------------------
// Analytics API
// ---------------------------------------------------------------------------
export const analyticsApi = {
  getMessageVolume: async (days?: number) => {
    const res = await api.get('/analytics/message-volume', { params: { days } });
    return res.data.data ?? res.data ?? [];
  },

  getConversionFunnel: async () => {
    const res = await api.get('/analytics/conversion-funnel');
    return res.data.funnel ?? res.data ?? [];
  },

  getDashboardStats: async () => {
    const res = await api.get('/analytics/dashboard-stats');
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Billing API
// ---------------------------------------------------------------------------
export const billingApi = {
  getUsage: async (month?: string) => {
    const res = await api.get('/billing/usage', { params: { month } });
    return res.data.usage ?? res.data ?? [];
  },

  getUsageHistory: async () => {
    const res = await api.get('/billing/usage/history');
    return res.data.usage ?? res.data ?? [];
  },

  getAiLogs: async (params?: Record<string, unknown>) => {
    const res = await api.get('/billing/ai-logs', { params });
    return res.data.logs ?? res.data ?? [];
  },
};

// ---------------------------------------------------------------------------
// Credentials API (per-user API keys for AI providers)
// ---------------------------------------------------------------------------
export interface Credential {
  id: string;
  provider: string;
  keyName: string;
  keyValue: string;
  isDefault: boolean;
  createdAt: string;
}

export const credentialApi = {
  list: async (): Promise<Credential[]> => {
    const res = await api.get('/credentials');
    return res.data.credentials ?? [];
  },
  create: async (data: { provider: string; keyName: string; keyValue: string; isDefault?: boolean }): Promise<Credential> => {
    const res = await api.post('/credentials', data);
    return res.data.credential;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/credentials/${id}`);
  },
  setDefault: async (id: string): Promise<void> => {
    await api.put(`/credentials/${id}/default`);
  },
};

// ---------------------------------------------------------------------------
// AI API
// ---------------------------------------------------------------------------
export interface VerifyResponse {
  status: 'valid' | 'invalid' | 'no_credits';
  credits: number;
  availableModels: Array<{
    id: string;
    name: string;
    context_length: number;
    pricing: {
      prompt: string;
      completion: string;
    };
    providerSlug: string;
  }>;
}

export const aiApi = {
  verifyKey: async (apiKey: string): Promise<VerifyResponse> => {
    const res = await api.post('/ai/verify', { apiKey });
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Socket.IO helper
// ---------------------------------------------------------------------------
export function getSocketUrl(): string {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return base;
}

export async function getSocketAuthToken(): Promise<string | null> {
  return clerkBridge.getToken();
}

// ---------------------------------------------------------------------------
// Team API
// ---------------------------------------------------------------------------
export const teamApi = {
  list: async () => { const res = await api.get('/team'); return res.data.members; },
  invite: async (email: string, role: string) => { const res = await api.post('/team/invite', { email, role }); return res.data; },
  updateRole: async (userId: string, role: string) => { const res = await api.put('/team/' + userId + '/role', { role }); return res.data; },
  remove: async (userId: string) => { await api.delete('/team/' + userId); },
};

// ---------------------------------------------------------------------------
// Settings API
// ---------------------------------------------------------------------------
export const settingsApi = {
  getGeneral: async () => { const res = await api.get('/settings/general'); return res.data; },
  updateGeneral: async (data: any) => { const res = await api.put('/settings/general', data); return res.data; },
  getWorkspace: async () => { const res = await api.get('/settings/workspace'); return res.data; },
  exportData: async () => { const res = await api.get('/settings/export', { responseType: 'blob' }); return res.data; },
  deleteWorkspace: async () => { await api.delete('/settings/workspace'); },
};
