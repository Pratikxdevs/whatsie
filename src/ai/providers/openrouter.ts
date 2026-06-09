import type { AIProvider, ProviderConfig, ValidationResult } from './types';
import { timedFetch } from './utils';

export const config: ProviderConfig = {
  provider: 'openrouter',
  label: 'OpenRouter',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultModel: 'meta-llama/llama-3-70b-instruct',
  models: [
    'meta-llama/llama-3-70b-instruct',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-pro-1.5',
    'openai/gpt-4o',
    'mistralai/mixtral-8x7b-instruct',
  ],
  keyPrefixes: ['sk-or-'],
  envKey: 'OPENROUTER_API_KEY',
};

export async function validateKey(apiKey: string, model?: string): Promise<ValidationResult> {
  const m = model || config.defaultModel;
  return timedFetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://crm.app',
      'X-Title': 'CRM Platform',
    },
    body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
  }, config.provider, m);
}

export const openrouterProvider: AIProvider = { config, validateKey };
