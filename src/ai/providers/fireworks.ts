import type { AIProvider, ProviderConfig, ValidationResult } from './types';
import { timedFetch } from './utils';

export const config: ProviderConfig = {
  provider: 'fireworks',
  label: 'Fireworks AI',
  baseURL: 'https://api.fireworks.ai/inference/v1',
  defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
  models: ['accounts/fireworks/models/llama-v3p1-70b-instruct', 'accounts/fireworks/models/llama-v3p1-8b-instruct'],
  keyPrefixes: ['fw_'],
  envKey: 'FIREWORKS_API_KEY',
};

export async function validateKey(apiKey: string, model?: string): Promise<ValidationResult> {
  const m = model || config.defaultModel;
  return timedFetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
  }, config.provider, m);
}

export const fireworksProvider: AIProvider = { config, validateKey };
