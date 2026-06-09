/**
 * AI Integration Configuration
 *
 * This module resolves AI settings per bot with this priority:
 *   1. Bot config (stored in DB config JSON field)
 *   2. Environment variables
 *   3. Hardcoded defaults
 *
 * Usage in routes/workers:
 *   import { resolveAiConfig } from '../AiInteg/config';
 *   const config = await resolveAiConfig(tenantId);
 */

import { prisma } from '../db/prisma';

export interface AiConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

const PROVIDER_DEFAULTS: Record<string, { model: string; baseURL?: string }> = {
  groq:       { model: 'llama-3.1-8b-instant', baseURL: 'https://api.groq.com/openai/v1' },
  openai:     { model: 'gpt-4o-mini' },
  openrouter: { model: 'meta-llama/llama-3-8b-instruct', baseURL: 'https://openrouter.ai/api/v1' },
  gemini:     { model: 'gemini-2.0-flash', baseURL: 'https://generativelanguage.googleapis.com/v1beta' },
  anthropic:  { model: 'claude-sonnet-4-20250514', baseURL: 'https://api.anthropic.com/v1' },
  mistral:    { model: 'mistral-small-latest', baseURL: 'https://api.mistral.ai/v1' },
  cohere:     { model: 'command-r', baseURL: 'https://api.cohere.com/v2' },
  xai:        { model: 'grok-2-latest', baseURL: 'https://api.x.ai/v1' },
  together:   { model: 'meta-llama/Llama-3-70b-chat-hf', baseURL: 'https://api.together.xyz/v1' },
  fireworks:  { model: 'accounts/fireworks/models/llama-v3p1-70b-instruct', baseURL: 'https://api.fireworks.ai/inference/v1' },
  bedrock:    { model: 'anthropic.claude-3-5-sonnet-20241022-v2:0' },
  ollama:     { model: 'llama3.1', baseURL: 'http://localhost:11434/v1' },
  cerebras:   { model: 'llama3.1-8b', baseURL: 'https://api.cerebras.ai/v1' },
  deepseek:   { model: 'deepseek-chat', baseURL: 'https://api.deepseek.com' },
};

/**
 * Resolve AI config for a tenant+user.
 * Priority: bot config > user credential > env vars
 */
export async function resolveAiConfig(tenantId: string, userId?: string): Promise<AiConfig> {
  // Get bot config from DB
  let botConfig: Record<string, any> = {};
  try {
    const bot = await prisma.bot.findFirst({
      where: { tenantId, status: 'connected' },
    });
    if (bot?.config && typeof bot.config === 'object') {
      botConfig = bot.config as Record<string, any>;
    }
  } catch {
    // Fall through to env vars
  }

  const provider = (botConfig.ai_engine || process.env.DEFAULT_AI_PROVIDER || 'groq') as AiConfig['provider'];
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.groq;

  // Check user's credential for this provider
  let userApiKey: string | undefined;
  if (userId) {
    try {
      const credential = await prisma.userCredential.findFirst({
        where: { userId, provider, isDefault: true },
      });
      if (credential) {
        userApiKey = credential.keyValue;
      }
    } catch {
      // DB lookup failed — fall through to env vars
    }
  }

  // Resolve API key: bot config > user credential > env vars
  // Each provider has its own env var name
  const ENV_KEY_MAP: Record<string, string> = {
    groq: 'GROQ_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    gemini: 'GEMINI_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    cohere: 'COHERE_API_KEY',
    xai: 'XAI_API_KEY',
    together: 'TOGETHER_API_KEY',
    fireworks: 'FIREWORKS_API_KEY',
    bedrock: 'AWS_BEDROCK_KEY',
    ollama: 'OLLAMA_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    cerebras: 'CEREBRAS_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
  };
  const envKey = ENV_KEY_MAP[provider] || 'GROQ_API_KEY';
  const apiKey = botConfig.api_key || botConfig.groq_api_key || userApiKey || process.env[envKey] || '';

  return {
    provider,
    model: process.env.DEFAULT_MODEL || defaults.model,
    apiKey,
    baseURL: defaults.baseURL,
    systemPrompt: botConfig.system_prompt || 'You are a helpful CRM assistant. Be concise and professional.',
    temperature: botConfig.temperature ?? 0.7,
    maxTokens: botConfig.max_tokens ?? 500,
  };
}

/**
 * Validate that an AI config has a working API key.
 */
export function validateAiConfig(config: AiConfig): { valid: boolean; error?: string } {
  if (!config.apiKey) {
    return {
      valid: false,
      error: `No API key for provider "${config.provider}". Set ${config.provider.toUpperCase()}_API_KEY in .env or api_key in bot config.`,
    };
  }
  return { valid: true };
}
