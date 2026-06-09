// ── Platform ────────────────────────────────────────────────────────────

export type Platform = 'whatsapp';

// ── AI Providers ────────────────────────────────────────────────────────

export type AiEngine =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'mistral'
  | 'cohere'
  | 'xai'
  | 'together'
  | 'fireworks'
  | 'bedrock'
  | 'ollama'
  | 'openrouter'
  | 'cerebras'
  | 'deepseek';

export const AI_ENGINE_CONFIG: Record<AiEngine, { label: string; color: string }> = {
  groq:       { label: 'Groq',        color: '#F55036' },
  openai:     { label: 'OpenAI',      color: '#10A37F' },
  anthropic:  { label: 'Anthropic',   color: '#D97706' },
  gemini:     { label: 'Google Gemini', color: '#4285F4' },
  mistral:    { label: 'Mistral AI',  color: '#FF7000' },
  cohere:     { label: 'Cohere',      color: '#39594D' },
  xai:        { label: 'xAI (Grok)',  color: '#FFFFFF' },
  together:   { label: 'Together AI', color: '#6366F1' },
  fireworks:  { label: 'Fireworks AI', color: '#FF4D00' },
  bedrock:    { label: 'AWS Bedrock', color: '#FF9900' },
  ollama:     { label: 'Ollama (Local)', color: '#22C55E' },
  openrouter: { label: 'OpenRouter',  color: '#6366F1' },
  cerebras:   { label: 'Cerebras',    color: '#00B4D8' },
  deepseek:   { label: 'DeepSeek',    color: '#0066FF' },
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
  activeLeads: number;
  messagesToday: number;
  lastConnected: string | null;
  createdAt: string;
}

// ── Platform Config ─────────────────────────────────────────────────────

export const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; icon: string; supported: boolean }> = {
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: 'MessageCircle', supported: true },
};
