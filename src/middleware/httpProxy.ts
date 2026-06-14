/**
 * Universal HTTP Proxy Layer
 *
 * Wraps all outbound axios instances with:
 * - Circuit breaker (per-domain)
 * - Rate limiting (per-domain)
 * - Response caching (GET requests)
 * - Automatic retry with exponential backoff on timeout/5xx
 * - Request/response logging
 *
 * Usage:
 *   import { createProxiedClient } from '../middleware/httpProxy';
 *   const client = createProxiedClient({ baseURL: '...', timeout: 15000 });
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { logger } from '../config/logger';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
interface ProxyConfig {
  /** Max retries on timeout or 5xx (default: 2) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  backoffBase?: number;
  /** Max delay cap in ms (default: 30000) */
  backoffMax?: number;
  /** Circuit breaker: failures before opening (default: 5) */
  circuitBreakerThreshold?: number;
  /** Circuit breaker: reset timeout in ms (default: 60000) */
  circuitBreakerResetMs?: number;
  /** Rate limit: max requests per window per domain (default: 100) */
  rateLimitMax?: number;
  /** Rate limit: window duration in ms (default: 60000) */
  rateLimitWindowMs?: number;
  /** Cache TTL for GET requests in ms (default: 30000) */
  cacheTtlMs?: number;
  /** Log prefix for this client */
  logPrefix?: string;
}

// ---------------------------------------------------------------------------
// Per-domain state
// ---------------------------------------------------------------------------
interface DomainState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  openedAt: number;
  requests: number[];
  cache: Map<string, { data: any; expires: number }>;
}

const domains = new Map<string, DomainState>();

function getDomain(url: string): string {
  try {
    const u = new URL(url);
    const port = u.port || (u.protocol === 'https:' ? '443' : '80');
    return `${u.hostname}:${port}`;
  } catch {
    return url;
  }
}

function getDomainState(domain: string): DomainState {
  if (!domains.has(domain)) {
    domains.set(domain, {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
      openedAt: 0,
      requests: [],
      cache: new Map(),
    });
  }
  return domains.get(domain)!;
}

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------
function isCircuitOpen(domain: string, config: ProxyConfig): boolean {
  const state = getDomainState(domain);
  const threshold = config.circuitBreakerThreshold ?? 5;
  const resetMs = config.circuitBreakerResetMs ?? 60_000;

  if (!state.isOpen) return false;

  // Auto-reset after timeout
  if (Date.now() - state.openedAt > resetMs) {
    state.isOpen = false;
    state.failures = 0;
    logger.info({ domain }, `[PROXY] Circuit breaker reset for ${domain}`);
    return false;
  }

  return true;
}

function recordSuccess(domain: string): void {
  const state = getDomainState(domain);
  state.failures = Math.max(0, state.failures - 1);
  if (state.isOpen && state.failures === 0) {
    state.isOpen = false;
    logger.info({ domain }, `[PROXY] Circuit breaker closed for ${domain}`);
  }
}

function recordFailure(domain: string, config: ProxyConfig): void {
  const state = getDomainState(domain);
  const threshold = config.circuitBreakerThreshold ?? 5;
  state.failures++;
  state.lastFailure = Date.now();

  if (state.failures >= threshold && !state.isOpen) {
    state.isOpen = true;
    state.openedAt = Date.now();
    logger.warn({ domain, failures: state.failures }, `[PROXY] Circuit breaker OPENED for ${domain}`);
  }
}

// ---------------------------------------------------------------------------
// Rate Limiter (sliding window)
// ---------------------------------------------------------------------------
function checkRateLimit(domain: string, config: ProxyConfig): boolean {
  const state = getDomainState(domain);
  const max = config.rateLimitMax ?? 100;
  const windowMs = config.rateLimitWindowMs ?? 60_000;
  const now = Date.now();

  // Clean old entries
  state.requests = state.requests.filter(t => now - t < windowMs);

  if (state.requests.length >= max) {
    logger.warn({ domain, count: state.requests.length, max }, `[PROXY] Rate limit hit for ${domain}`);
    return false;
  }

  state.requests.push(now);
  return true;
}

// ---------------------------------------------------------------------------
// Cache (GET only)
// ---------------------------------------------------------------------------
function getCached(domain: string, key: string, config: ProxyConfig): any | null {
  const state = getDomainState(domain);
  const entry = state.cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    state.cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(domain: string, key: string, data: any, config: ProxyConfig): void {
  const state = getDomainState(domain);
  const ttl = config.cacheTtlMs ?? 30_000;
  state.cache.set(key, { data, expires: Date.now() + ttl });

  // Evict expired entries periodically
  if (state.cache.size > 200) {
    const now = Date.now();
    for (const [k, v] of state.cache) {
      if (now > v.expires) state.cache.delete(k);
    }
  }
}

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------
function isRetryable(error: AxiosError): boolean {
  // Timeout
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return true;
  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') return true;
  // 5xx server errors
  if (error.response?.status && error.response.status >= 500) return true;
  // 429 Too Many Requests
  if (error.response?.status === 429) return true;
  return false;
}

function getBackoffDelay(attempt: number, config: ProxyConfig): number {
  const base = config.backoffBase ?? 1000;
  const max = config.backoffMax ?? 30_000;
  const delay = Math.min(base * Math.pow(2, attempt) + Math.random() * 1000, max);
  return delay;
}

// ---------------------------------------------------------------------------
// Create proxied axios client
// ---------------------------------------------------------------------------
export function createProxiedClient(baseConfig: Omit<AxiosRequestConfig, 'proxy'> & { proxy?: ProxyConfig } = {}): AxiosInstance {
  const proxyConfig = baseConfig.proxy ?? {};
  const logPrefix = proxyConfig.logPrefix ?? '[PROXY]';

  // Strip proxy config before passing to axios
  const { proxy: _, ...axiosConfig } = baseConfig;

  const client = axios.create(axiosConfig);

  // --- Request interceptor ---
  client.interceptors.request.use((config) => {
    const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
    const domain = getDomain(fullUrl);
    const method = (config.method || 'GET').toUpperCase();

    // Circuit breaker check
    if (isCircuitOpen(domain, proxyConfig)) {
      return Promise.reject(new axios.Cancel(`Circuit breaker open for ${domain}`));
    }

    // Rate limit check
    if (!checkRateLimit(domain, proxyConfig)) {
      return Promise.reject(new axios.Cancel(`Rate limit exceeded for ${domain}`));
    }

    // Cache check for GET requests
    if (method === 'GET' && proxyConfig.cacheTtlMs) {
      const cacheKey = `${config.url}?${JSON.stringify(config.params || {})}`;
      const cached = getCached(domain, cacheKey, proxyConfig);
      if (cached) {
        logger.debug({ domain, url: config.url }, `${logPrefix} Cache hit`);
        // Return cached response by throwing a cancel with cached data
        const cancelErr = new axios.Cancel('Cache hit');
        (cancelErr as any).__cached = cached;
        (cancelErr as any).config = config;
        return Promise.reject(cancelErr);
      }
      (config as any).__cacheKey = cacheKey;
    }

    // Attach retry metadata
    (config as any).__retryCount = (config as any).__retryCount ?? 0;
    (config as any).__domain = domain;
    (config as any).__startTime = Date.now();

    return config;
  });

  // --- Response interceptor ---
  client.interceptors.response.use(
    (response) => {
      const domain = (response.config as any).__domain;
      const startTime = (response.config as any).__startTime;
      const duration = startTime ? Date.now() - startTime : 0;

      if (domain) {
        recordSuccess(domain);
      }

      // Cache successful GET responses
      if (response.config.method === 'GET' && proxyConfig.cacheTtlMs) {
        const cacheKey = (response.config as any).__cacheKey;
        if (cacheKey && domain) {
          setCache(domain, cacheKey, response.data, proxyConfig);
        }
      }

      if (duration > 5000) {
        logger.warn({ domain, duration, url: response.config.url }, `${logPrefix} Slow response`);
      }

      return response;
    },
    async (error: AxiosError | any) => {
      if (axios.isCancel(error)) {
        // Check if it's a cache hit cancel
        const cancelErr = error as any;
        const cached = cancelErr.__cached;
        if (cached) {
          return { data: cached, status: 200, statusText: 'OK', headers: {}, config: cancelErr.config } as AxiosResponse;
        }
        return Promise.reject(error);
      }

      const config = error.config as any;
      if (!config) return Promise.reject(error);

      const domain = config.__domain || 'unknown';
      const retryCount = config.__retryCount || 0;
      const maxRetries = proxyConfig.maxRetries ?? 2;

      recordFailure(domain, proxyConfig);

      // Retry if retryable and under limit
      if (isRetryable(error) && retryCount < maxRetries) {
        const delay = getBackoffDelay(retryCount, proxyConfig);
        logger.warn({
          domain,
          attempt: retryCount + 1,
          maxRetries,
          delay,
          error: error.message,
          url: config.url,
        }, `${logPrefix} Retrying after ${delay}ms`);

        await new Promise(r => setTimeout(r, delay));
        config.__retryCount = retryCount + 1;
        return client(config);
      }

      // Log final failure
      logger.error({
        domain,
        retries: retryCount,
        error: error.message,
        status: error.response?.status,
        url: config.url,
      }, `${logPrefix} Request failed after ${retryCount} retries`);

      return Promise.reject(error);
    }
  );

  return client;
}

// ---------------------------------------------------------------------------
// Health / metrics
// ---------------------------------------------------------------------------
export function getProxyStats(): Record<string, any> {
  const stats: Record<string, any> = {};
  for (const [domain, state] of domains) {
    stats[domain] = {
      failures: state.failures,
      circuitOpen: state.isOpen,
      requestsInWindow: state.requests.length,
      cacheSize: state.cache.size,
    };
  }
  return stats;
}

// ---------------------------------------------------------------------------
// Cache invalidation
// ---------------------------------------------------------------------------
export function invalidateCache(domain?: string): void {
  if (domain) {
    const state = domains.get(domain);
    if (state) state.cache.clear();
  } else {
    for (const state of domains.values()) {
      state.cache.clear();
    }
  }
}
