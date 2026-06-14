/**
 * AI Integration Configuration — OpenRouter Only
 *
 * Resolves AI settings per bot with this priority:
 *   1. Bot config (stored in DB config JSON field)
 *   2. User credential for openrouter
 *   3. OPENROUTER_API_KEY env var
 *   4. Hardcoded defaults
 */

import { prisma } from '../db/prisma';

export interface AiConfig {
  provider: 'openrouter';
  model: string;
  apiKey: string;
  baseURL: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'meta-llama/llama-3-8b-instruct';

/**
 * Resolve AI config for a tenant+user.
 * Always uses OpenRouter. Priority: bot config > user credential > env var.
 */
export async function resolveAiConfig(tenantId: string, userId?: string): Promise<AiConfig> {
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

  // Check user's openrouter credential
  let userApiKey: string | undefined;
  if (userId) {
    try {
      const credential = await prisma.userCredential.findFirst({
        where: { userId, provider: 'openrouter', isDefault: true },
      });
      if (credential) {
        userApiKey = credential.keyValue;
      }
    } catch {
      // Fall through to env var
    }
  }

  const apiKey = botConfig.api_key || userApiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
  const model = botConfig.model || process.env.DEFAULT_MODEL || DEFAULT_MODEL;

  return {
    provider: 'openrouter',
    model,
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
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
      error: 'No OpenRouter API key configured. Set OPENROUTER_API_KEY in .env or add your key in Settings.',
    };
  }
  return { valid: true };
}
