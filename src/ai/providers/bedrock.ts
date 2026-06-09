import type { AIProvider, ProviderConfig, ValidationResult } from './types';

export const config: ProviderConfig = {
  provider: 'bedrock',
  label: 'AWS Bedrock',
  baseURL: 'https://bedrock-runtime.us-east-1.amazonaws.com',
  defaultModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  models: [
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-5-haiku-20241022-v1:0',
    'meta.llama3-70b-instruct-v1:0',
  ],
  keyPrefixes: [],
  envKey: 'AWS_BEDROCK_KEY',
};

/**
 * Bedrock uses AWS SigV4 signing — can't validate with a plain fetch.
 * We validate the key format (accessKeyId:secretAccessKey[:region]) and
 * note that real validation requires IAM credentials.
 */
export async function validateKey(apiKey: string): Promise<ValidationResult> {
  const parts = apiKey.split(':');
  if (parts.length < 2) {
    return { valid: false, error: 'Bedrock key must be "accessKeyId:secretAccessKey[:region]"', provider: config.provider };
  }
  if (parts[0].length < 10 || parts[1].length < 10) {
    return { valid: false, error: 'Invalid AWS credentials format.', provider: config.provider };
  }
  // Can't make a real call without SigV4 signing — return format-only validation
  return { valid: true, error: 'Key format valid. Live validation requires IAM integration.', provider: config.provider, model: config.defaultModel };
}

export const bedrockProvider: AIProvider = { config, validateKey };
