/**
 * Frontend API Service
 *
 * All calls go to the real backend via Vite proxy.
 * Errors propagate to callers with structured error codes.
 */
import axios from 'axios';
import { errorLog } from './errorLog';

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
  try {
    // @ts-expect-error — Clerk is injected globally by ClerkProvider
    const clerk = window.__clerk;
    if (clerk?.session) {
      const token = await clerk.session.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // No Clerk session — fall through
  }
  return config;
};
api.interceptors.request.use(authInterceptor);

// Log all API errors automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      import('sonner').then(({ toast }) => {
        toast.error('Add Bot: You need a connected bot or valid session to perform this action.');
      });
      if (window.location.pathname !== '/bots') {
        window.location.href = '/bots';
      }
    }
    const endpoint = error?.config?.url || 'unknown';
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

  createWorkspace: async (name: string, opts?: { system_prompt?: string; ai_engine?: string; platform?: string; api_key?: string; bot_token?: string; username?: string; email?: string; password?: string; totp_secret?: string; temperature?: number; max_tokens?: number }): Promise<Workspace> => {
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
    return res.data.chats ?? [];
  },

  searchContacts: async (query?: string): Promise<any[]> => {
    const params = query ? { q: query } : {};
    const res = await api.get('/whatsapp/contacts', { params });
    return res.data.contacts ?? [];
  },

  getChatMessages: async (jid: string, page?: number, offset?: number): Promise<any[]> => {
    const params: any = {};
    if (page) params.page = page;
    if (offset) params.offset = offset;
    const res = await api.get(`/whatsapp/messages/${encodeURIComponent(jid)}`, { params });
    return res.data.messages ?? [];
  },

  markAsRead: async (messages: Array<{ remoteJid: string; fromMe: boolean; id: string }>): Promise<void> => {
    await api.post('/whatsapp/read', { messages });
  },

  sendTyping: async (number: string, presence: 'composing' | 'recording' | 'paused' = 'composing'): Promise<void> => {
    await api.post('/whatsapp/typing', { number, presence });
  },

  getProfilePicture: async (jid: string): Promise<string | null> => {
    const res = await api.get(`/whatsapp/profile/${encodeURIComponent(jid)}`);
    return res.data.pictureUrl ?? null;
  },

  blockContact: async (number: string, status: 'block' | 'unblock'): Promise<void> => {
    await api.post('/whatsapp/block', { number, status });
  },

  archiveChat: async (lastMessage: any, chat: string, archive: boolean): Promise<void> => {
    await api.post('/whatsapp/archive', { lastMessage, chat, archive });
  },

  deleteMessage: async (id: string, remoteJid: string, fromMe: boolean): Promise<void> => {
    await api.delete('/whatsapp/message', { data: { id, remoteJid, fromMe } });
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
// Socket.IO helper
// ---------------------------------------------------------------------------
export function getSocketUrl(): string {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return base;
}

/**
 * Get auth token for Socket.IO connection.
 * Returns the Clerk JWT token, or falls back to dev token in bypass mode.
 */
export async function getSocketAuthToken(): Promise<string | null> {
  try {
    // @ts-expect-error — Clerk is injected globally by ClerkProvider
    const clerk = window.__clerk;
    if (clerk?.session) {
      const token = await clerk.session.getToken();
      if (token) return token;
    }
  } catch {
    // No Clerk session — fall through
  }
  // Dev bypass: return a dummy token (backend will accept it in bypass mode)
  return 'dev-bypass-token';
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
