import type { AIProvider, ProviderConfig, ValidationResult } from './types';
import { timedFetch } from './utils';

export const config: ProviderConfig = {
  provider: 'mistral',
  label: 'Mistral AI',
  baseURL: 'https://api.mistral.ai/v1',
  defaultModel: 'mistral-small-latest',
  models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
  keyPrefixes: [],
  envKey: 'MISTRAL_API_KEY',
};

export async function validateKey(apiKey: string, model?: string): Promise<ValidationResult> {
  const m = model || config.defaultModel;
  return timedFetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
  }, config.provider, m);
}

export const mistralProvider: AIProvider = { config, validateKey };
