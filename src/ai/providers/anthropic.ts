import type { AIProvider, ProviderConfig, ValidationResult } from './types';
import { timedFetch } from './utils';

export const config: ProviderConfig = {
  provider: 'anthropic',
  label: 'Anthropic',
  baseURL: 'https://api.anthropic.com/v1',
  defaultModel: 'claude-sonnet-4-20250514',
  models: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
  keyPrefixes: ['sk-ant-'],
  envKey: 'ANTHROPIC_API_KEY',
};

export async function validateKey(apiKey: string, model?: string): Promise<ValidationResult> {
  const m = model || config.defaultModel;
  return timedFetch(`${config.baseURL}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: m, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
  }, config.provider, m);
}

export const anthropicProvider: AIProvider = { config, validateKey };
