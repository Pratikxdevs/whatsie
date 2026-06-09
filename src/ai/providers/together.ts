import type { AIProvider, ProviderConfig, ValidationResult } from './types';
import { timedFetch } from './utils';

export const config: ProviderConfig = {
  provider: 'together',
  label: 'Together AI',
  baseURL: 'https://api.together.xyz/v1',
  defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
  models: ['meta-llama/Llama-3-70b-chat-hf', 'meta-llama/Llama-3-8b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
  keyPrefixes: [],
  envKey: 'TOGETHER_API_KEY',
};

export async function validateKey(apiKey: string, model?: string): Promise<ValidationResult> {
  const m = model || config.defaultModel;
  return timedFetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
  }, config.provider, m);
}

export const togetherProvider: AIProvider = { config, validateKey };
