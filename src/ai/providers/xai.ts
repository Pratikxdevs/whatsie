import type { AIProvider, ProviderConfig, ValidationResult } from './types';
import { timedFetch } from './utils';

export const config: ProviderConfig = {
  provider: 'xai',
  label: 'xAI (Grok)',
  baseURL: 'https://api.x.ai/v1',
  defaultModel: 'grok-2-latest',
  models: ['grok-2-latest', 'grok-2-mini', 'grok-vision-beta'],
  keyPrefixes: ['xai-'],
  envKey: 'XAI_API_KEY',
};

export async function validateKey(apiKey: string, model?: string): Promise<ValidationResult> {
  const m = model || config.defaultModel;
  return timedFetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
  }, config.provider, m);
}

export const xaiProvider: AIProvider = { config, validateKey };
