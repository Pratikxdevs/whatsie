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

// resolveAiConfig is now canonically exported from src/ai/orchestrator.ts to prevent duplication
import { resolveAiConfig } from '../ai/orchestrator';

export { resolveAiConfig };

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
