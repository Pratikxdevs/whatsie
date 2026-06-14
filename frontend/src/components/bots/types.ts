// ── Platform ────────────────────────────────────────────────────────────

export type Platform = 'whatsapp';

// ── AI Providers ────────────────────────────────────────────────────────

export type AiEngine = 'openrouter';

export const AI_ENGINE_CONFIG: Record<AiEngine, { label: string; color: string }> = {
  openrouter: { label: 'OpenRouter',  color: '#6366F1' },
};

// ── Bot Status ──────────────────────────────────────────────────────────

export type BotStatus = 'disconnected' | 'starting' | 'pending_qr' | 'scanned' | 'connected' | 'error';

// ── Bot ─────────────────────────────────────────────────────────────────

export interface Bot {
  id: string;
  name: string;
  platform: Platform;
  status: BotStatus;
  identifier: string; // phone, username, or app ID depending on platform
  aiEngine: AiEngine;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  apiKey?: string;
  model?: string;
  activeLeads: number;
  messagesToday: number;
  lastConnected: string | null;
  createdAt: string;
}

// ── Platform Config ─────────────────────────────────────────────────────

export const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; icon: string; supported: boolean }> = {
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: 'MessageCircle', supported: true },
};
