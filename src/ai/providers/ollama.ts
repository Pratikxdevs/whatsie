import type { AIProvider, ProviderConfig, ValidationResult } from './types';
import { timedFetch } from './utils';

export const config: ProviderConfig = {
  provider: 'ollama',
  label: 'Ollama (Local)',
  baseURL: 'http://localhost:11434/v1',
  defaultModel: 'llama3.1',
  models: ['llama3.1', 'llama3', 'mistral', 'codellama', 'phi3', 'gemma2'],
  keyPrefixes: [],
  envKey: 'OLLAMA_API_KEY',
};

/**
 * Ollama doesn't need an API key — we just check if the server is reachable.
 */
export async function validateKey(_apiKey: string, model?: string): Promise<ValidationResult> {
  const m = model || config.defaultModel;
  return timedFetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
  }, config.provider, m);
}

export const ollamaProvider: AIProvider = { config, validateKey };
