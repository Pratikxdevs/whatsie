import type { AIProvider, ProviderConfig, ValidationResult } from './types';
import { timedFetch } from './utils';

export const config: ProviderConfig = {
  provider: 'gemini',
  label: 'Google Gemini',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  defaultModel: 'gemini-2.0-flash',
  models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  keyPrefixes: ['AI'],
  envKey: 'GEMINI_API_KEY',
};

export async function validateKey(apiKey: string, model?: string): Promise<ValidationResult> {
  const m = model || config.defaultModel;
  return timedFetch(`${config.baseURL}/models/${m}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1 } }),
  }, config.provider, m);
}

export const geminiProvider: AIProvider = { config, validateKey };
