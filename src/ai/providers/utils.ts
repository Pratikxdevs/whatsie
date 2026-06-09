/**
 * Shared utilities for provider key validation via plain HTTP requests.
 * No SDKs needed — just hit the provider's API with a minimal request.
 */
import type { ValidationResult } from './types';

/**
 * Make a timed fetch to a provider API.
 */
export async function timedFetch(
  url: string,
  init: RequestInit,
  provider: string,
  model: string,
): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const response = await fetch(url, init);
    const latencyMs = Date.now() - start;

    if (response.ok) {
      return { valid: true, provider, model, latencyMs };
    }

    const body = await response.text().catch(() => '');
    const status = response.status;

    // Auth failures — key is invalid
    if (status === 401 || status === 403) {
      return { valid: false, error: 'API key is invalid or revoked.', provider, latencyMs };
    }

    // Rate limited — key is valid but quota hit
    if (status === 429) {
      return { valid: true, error: 'Key is valid but rate-limited.', provider, model, latencyMs };
    }

    // Model not found — key is valid, just wrong model
    if (status === 404 || body.includes('does not exist')) {
      return { valid: true, error: 'Key is valid but model not found.', provider, model, latencyMs };
    }

    // Other 4xx — key is likely valid, request issue
    if (status >= 400 && status < 500) {
      return { valid: true, error: `Key valid. Request error (${status}).`, provider, model, latencyMs };
    }

    // Server error
    return { valid: false, error: `Provider error (${status}).`, provider, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return { valid: false, error: `Provider unreachable: ${err.message}`, provider, latencyMs };
  }
}

/** Trim trailing slash from URL. */
export function cleanURL(url: string): string {
  return url.replace(/\/+$/, '');
}
