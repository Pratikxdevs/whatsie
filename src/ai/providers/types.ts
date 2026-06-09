/**
 * Base provider interface and types for AI key validation.
 * Each provider implements validateKey() which makes a minimal API call
 * to verify the key is valid and the provider is reachable.
 */

export interface ProviderConfig {
  provider: string;
  label: string;
  baseURL: string;
  defaultModel: string;
  models: string[];
  keyPrefixes: string[]; // e.g. ['sk-'] for OpenAI
  envKey: string;        // env var name, e.g. OPENAI_API_KEY
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
}

export interface AIProvider {
  config: ProviderConfig;
  validateKey(apiKey: string, model?: string): Promise<ValidationResult>;
}
