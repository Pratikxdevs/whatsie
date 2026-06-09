import type { AIProvider, ProviderConfig, ValidationResult } from './types';
import { timedFetch } from './utils';

export const config: ProviderConfig = {
  provider: 'cerebras',
  label: 'Cerebras',
  baseURL: 'https://api.cerebras.ai/v1',
  defaultModel: 'llama3.1-8b',
  models: ['llama3.1-8b', 'llama3.1-70b'],
  keyPrefixes: ['csk-'],
  envKey: 'CEREBRAS_API_KEY',
};

export async function validateKey(apiKey: string, model?: string): Promise<ValidationResult> {
  const m = model || config.defaultModel;
  return timedFetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
  }, config.provider, m);
}

export const cerebrasProvider: AIProvider = { config, validateKey };
