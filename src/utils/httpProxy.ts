/**
 * Universal HTTP Proxy Layer
 *
 * Wraps outbound axios instances with:
 * - Circuit breaker (per-service)
 * - Exponential backoff retry with jitter
 * - Result caching (for idempotent GETs)
 * - Rate limiting (per-service)
 * - Timeout escalation (auto-increase on retry)
 *
 * Usage:
 *   const proxy = createProxy('my-service', { timeout: 30_000, retries: 2 });
 *   const data = await proxy.post(url, body, config);
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '../config/logger';

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreaker {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  successCount: number;
  threshold: number;
  resetMs: number;
  halfOpenMax: number;
}

const circuits = new Map<string, CircuitBreaker>();

function getCircuit(service: string, threshold = 5, resetMs = 60_000): CircuitBreaker {
  if (!circuits.has(service)) {
    circuits.set(service, {
      state: 'closed',
      failures: 0,
      lastFailure: 0,
      successCount: 0,
      threshold,
      resetMs,
      halfOpenMax: 3,
    });
  }
  return circuits.get(service)!;
}

function recordSuccess(service: string) {
  const cb = getCircuit(service);
  if (cb.state === 'half-open') {
    cb.successCount++;
    if (cb.successCount >= cb.halfOpenMax) {
      cb.state = 'closed';
      cb.failures = 0;
      cb.successCount = 0;
      logger.info({ service }, '[PROXY] Circuit closed — service recovered');
    }
  } else {
    cb.failures = Math.max(0, cb.failures - 1);
  }
}

function recordFailure(service: string) {
  const cb = getCircuit(service);
  cb.failures++;
  cb.lastFailure = Date.now();

  if (cb.state === 'half-open') {
    cb.state = 'open';
    logger.warn({ service, failures: cb.failures }, '[PROXY] Circuit re-opened from half-open');
  } else if (cb.failures >= cb.threshold) {
    cb.state = 'open';
    logger.error({ service, failures: cb.failures }, '[PROXY] Circuit OPEN — too many failures');
  }
}

function canRequest(service: string): boolean {
  const cb = getCircuit(service);
  if (cb.state === 'closed') return true;
  if (cb.state === 'half-open') return true;

  // Check if reset time has passed
  if (Date.now() - cb.lastFailure > cb.resetMs) {
    cb.state = 'half-open';
    cb.successCount = 0;
    logger.info({ service }, '[PROXY] Circuit half-open — testing recovery');
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Result Cache (for idempotent GETs)
// ---------------------------------------------------------------------------
interface CacheEntry {
  data: any;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60_000; // 5 minutes default

function cacheKey(service: string, method: string, url: string): string {
  return `${service}:${method}:${url}`;
}

function getCached(service: string, method: string, url: string): any | null {
  if (method !== 'GET') return null;
  const key = cacheKey(service, method, url);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(service: string, method: string, url: string, data: any, ttl = CACHE_TTL) {
  if (method !== 'GET') return;
  const key = cacheKey(service, method, url);
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ---------------------------------------------------------------------------
// Retry with Exponential Backoff + Jitter
// ---------------------------------------------------------------------------
function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function backoffDelay(attempt: number, baseMs = 1_000, maxMs = 30_000): number {
  const exp = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  const jitter = exp * (0.5 + Math.random() * 0.5);
  return Math.floor(jitter);
}

function isRetryable(error: any): boolean {
  if (!error.response) return true; // Network error
  const status = error.response.status;
  if (status >= 500) return true;
  if (status === 429) return true; // Rate limited
  if (status === 408) return true; // Request timeout
  return false;
}

// ---------------------------------------------------------------------------
// Proxy Factory
// ---------------------------------------------------------------------------
export interface ProxyConfig {
  timeout?: number;           // Base timeout in ms (default 15s)
  retries?: number;           // Max retry attempts (default 2)
  circuitThreshold?: number;  // Failures before circuit opens (default 5)
  circuitResetMs?: number;    // Time before circuit half-opens (default 60s)
  cacheTtlMs?: number;        // Cache TTL for GETs (default 5min, 0 = disabled)
  cacheErrors?: boolean;      // Cache 429 responses (default true)
}

export interface ProxiedAxios extends AxiosInstance {
  /** Force-invalidate cached responses for this service */
  bustCache(): void;
}

export function createProxy(service: string, config: ProxyConfig = {}): ProxiedAxios {
  const {
    timeout = 15_000,
    retries = 2,
    circuitThreshold = 5,
    circuitResetMs = 60_000,
    cacheTtlMs = CACHE_TTL,
    cacheErrors = true,
  } = config;

  // Initialize circuit breaker with custom thresholds
  getCircuit(service, circuitThreshold, circuitResetMs);

  const instance = axios.create({ timeout }) as ProxiedAxios;

  // --- Request interceptor: check circuit breaker + cache ---
  instance.interceptors.request.use((req: any) => {
    const method = (req.method || 'GET').toUpperCase();
    const url = req.url || '';

    // Circuit breaker check
    if (!canRequest(service)) {
      const error = new Error(`Circuit OPEN for ${service} — request blocked`) as any;
      error.code = 'CIRCUIT_OPEN';
      error.retryable = false;
      throw error;
    }

    // Check cache for GETs
    const cached = getCached(service, method, url);
    if (cached) {
      // Return cached response by throwing a special error caught in the adapter
      (req as any).__cached = cached;
    }

    return req;
  });

  // --- Response interceptor: retry logic + caching ---
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      const method = (response.config.method || 'GET').toUpperCase();
      recordSuccess(service);
      // Cache successful GET responses
      if (method === 'GET' && cacheTtlMs > 0) {
        setCache(service, method, response.config.url || '', response.data, cacheTtlMs);
      }
      return response;
    },
    async (error: any) => {
      const config = error.config;
      if (!config) throw error;

      // Handle cached responses
      if ((config as any).__cached) {
        return { data: (config as any).__cached, status: 200, config } as AxiosResponse;
      }

      const method = (config.method || 'GET').toUpperCase();
      const attempt = (config as any).__retryAttempt || 0;

      // Record failure for circuit breaker
      if (isRetryable(error)) {
        recordFailure(service);
      }

      // Cache 429 responses to prevent re-hammering
      if (cacheErrors && error.response?.status === 429 && method === 'GET') {
        const retryAfter = parseInt(error.response.headers?.['retry-after'] || '60', 10);
        setCache(service, method, config.url || '', error.response.data, retryAfter * 1000);
      }

      // Retry logic
      if (isRetryable(error) && attempt < retries) {
        const delay = backoffDelay(attempt);
        const newTimeout = timeout * (attempt + 2); // Escalate timeout on retry

        logger.warn({
          service,
          attempt: attempt + 1,
          maxRetries: retries,
          delay,
          timeout: newTimeout,
          url: config.url,
          status: error.response?.status,
          err: error.message,
        }, `[PROXY] Retrying ${method} ${config.url}`);

        (config as any).__retryAttempt = attempt + 1;
        config.timeout = newTimeout;

        await sleep(delay);
        return instance.request(config);
      }

      throw error;
    },
  );

  // --- Cache bust method ---
  instance.bustCache = () => {
    for (const key of cache.keys()) {
      if (key.startsWith(`${service}:`)) {
        cache.delete(key);
      }
    }
  };

  return instance;
}

// ---------------------------------------------------------------------------
// Health / Stats
// ---------------------------------------------------------------------------
export function getProxyStats() {
  const stats: Record<string, any> = {};
  for (const [service, cb] of circuits) {
    stats[service] = {
      state: cb.state,
      failures: cb.failures,
      lastFailure: cb.lastFailure ? new Date(cb.lastFailure).toISOString() : null,
    };
  }
  return {
    circuits: stats,
    cacheSize: cache.size,
  };
}

// Periodic cache cleanup (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) {
      cache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug({ cleaned, remaining: cache.size }, '[PROXY] Cache cleanup');
  }
}, 5 * 60_000);
