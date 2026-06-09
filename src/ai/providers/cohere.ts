import type { AIProvider, ProviderConfig, ValidationResult } from './types';
import { timedFetch } from './utils';

export const config: ProviderConfig = {
  provider: 'cohere',
  label: 'Cohere',
  baseURL: 'https://api.cohere.com/v2',
  defaultModel: 'command-r',
  models: ['command-r-plus', 'command-r', 'command-light'],
  keyPrefixes: [],
  envKey: 'COHERE_API_KEY',
};

export async function validateKey(apiKey: string, model?: string): Promise<ValidationResult> {
  const m = model || config.defaultModel;
  return timedFetch(`${config.baseURL}/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'hi' }] }),
  }, config.provider, m);
}

export const cohereProvider: AIProvider = { config, validateKey };
