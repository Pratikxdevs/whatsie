/**
 * AI Provider Registry
 *
 * Central registry for all AI providers. Each provider can validate its API keys
 * by making a minimal completion request.
 *
 * Usage:
 *   import { validateProviderKey, getProvider, PROVIDER_LIST } from './providers';
 *   const result = await validateProviderKey('openai', 'sk-...');
 */

import type { AIProvider, ProviderConfig, ValidationResult } from './types';
import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';
import { geminiProvider } from './gemini';
import { groqProvider } from './groq';
import { mistralProvider } from './mistral';
import { cohereProvider } from './cohere';
import { xaiProvider } from './xai';
import { togetherProvider } from './together';
import { fireworksProvider } from './fireworks';
import { bedrockProvider } from './bedrock';
import { ollamaProvider } from './ollama';
import { openrouterProvider } from './openrouter';
import { cerebrasProvider } from './cerebras';
import { deepseekProvider } from './deepseek';

// ── Registry ────────────────────────────────────────────────────────────

const PROVIDERS: Record<string, AIProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  groq: groqProvider,
  mistral: mistralProvider,
  cohere: cohereProvider,
  xai: xaiProvider,
  together: togetherProvider,
  fireworks: fireworksProvider,
  bedrock: bedrockProvider,
  ollama: ollamaProvider,
  openrouter: openrouterProvider,
  cerebras: cerebrasProvider,
  deepseek: deepseekProvider,
};

// ── Public API ──────────────────────────────────────────────────────────

/** Get a provider by name. Returns undefined if not found. */
export function getProvider(name: string): AIProvider | undefined {
  return PROVIDERS[name];
}

/** List all registered provider configs (for frontend dropdown). */
export const PROVIDER_LIST: ProviderConfig[] = Object.values(PROVIDERS).map(p => p.config);

/** Validate an API key for a specific provider. */
export async function validateProviderKey(
  providerName: string,
  apiKey: string,
  model?: string,
): Promise<ValidationResult> {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    return {
      valid: false,
      error: `Unknown provider: ${providerName}. Available: ${Object.keys(PROVIDERS).join(', ')}`,
      provider: providerName,
    };
  }
  return provider.validateKey(apiKey, model);
}

/** Auto-detect provider from API key prefix. Returns the first match or null. */
export function detectProvider(apiKey: string): ProviderConfig | null {
  for (const provider of Object.values(PROVIDERS)) {
    for (const prefix of provider.config.keyPrefixes) {
      if (apiKey.startsWith(prefix)) {
        return provider.config;
      }
    }
  }
  return null;
}

export { type AIProvider, type ProviderConfig, type ValidationResult } from './types';
