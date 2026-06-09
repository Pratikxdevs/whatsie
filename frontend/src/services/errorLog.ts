/**
 * Frontend Error Logger
 *
 * Captures API errors, component errors, and unhandled exceptions.
 * Sends them to the debug dashboard on port 9222 and stores locally.
 */

export interface ErrorEntry {
  code: string;
  message: string;
  detail?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
  source: 'api' | 'component' | 'unhandled' | 'user';
}

const STORAGE_KEY = 'crmv2_error_log';
const MAX_STORED = 200;

/**
 * Error code registry — mirrors backend codes
 */
export const ErrorCode = {
  API_001: 'API_001', // Request timeout
  API_002: 'API_002', // Network unreachable
  API_003: 'API_003', // Server returned 5xx
  API_004: 'API_004', // Server returned 4xx
  API_005: 'API_005', // Response parsing failed
  API_006: 'API_006', // Rate limited (429)

  DB_001: 'DB_001',   // Connection failed
  DB_005: 'DB_005',   // Record not found
  AUTH_001: 'AUTH_001', // Missing token
  AUTH_002: 'AUTH_002', // Token expired

  WA_001: 'WA_001',   // Instance not found
  WA_002: 'WA_002',   // Instance not connected
  WA_004: 'WA_004',   // Send message failed
  WA_006: 'WA_006',   // Evolution API unreachable

  Q_003: 'Q_003',     // Worker processing failed
  Q_004: 'Q_004',     // Job in DLQ

  SYS_002: 'SYS_002', // Service unhealthy
} as const;

const ERROR_DESCRIPTIONS: Record<string, string> = {
  API_001: 'Request timed out — backend did not respond within 15s',
  API_002: 'Network unreachable — backend server may be down',
  API_003: 'Server error (5xx) — backend crashed',
  API_004: 'Client error (4xx) — check request',
  API_005: 'Response parsing failed — unexpected data',
  API_006: 'Rate limited — too many requests',
  DB_001: 'Database connection failed',
  DB_005: 'Record not found',
  AUTH_001: 'No authentication token',
  AUTH_002: 'Token expired — login again',
  WA_001: 'WhatsApp instance not found',
  WA_002: 'WhatsApp not connected — scan QR',
  WA_004: 'Failed to send WhatsApp message',
  WA_006: 'Evolution API unreachable',
  Q_003: 'Worker processing failed',
  Q_004: 'Job permanently failed (DLQ)',
  SYS_002: 'Service health check failed',
};

class ErrorLogger {
  private errors: ErrorEntry[] = [];
  private debugUrl: string;

  constructor() {
    this.debugUrl = this.getDebugUrl();
    this.loadFromStorage();
    this.setupGlobalHandlers();
  }

  private getDebugUrl(): string {
    // In dev, debug server is on same host port 9222
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:9222`;
    }
    return 'http://localhost:9222';
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.errors = JSON.parse(stored);
      }
    } catch { /* ignore */ }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.errors.slice(-MAX_STORED)));
    } catch { /* ignore */ }
  }

  private setupGlobalHandlers() {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.log({
        code: 'SYS_002',
        message: event.message || 'Unhandled error',
        detail: `${event.filename}:${event.lineno}:${event.colno}`,
        source: 'unhandled',
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      this.log({
        code: this.classifyError(reason),
        message: reason?.message || 'Unhandled promise rejection',
        detail: reason?.stack?.slice(0, 500),
        source: 'unhandled',
      });
    });
  }

  /**
   * Classify an error into an error code
   */
  classifyError(error: any): string {
    if (!error) return 'API_005';

    // Axios error
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) return 'API_001';
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) return 'API_002';
    if (error.response) {
      const status = error.response.status;
      if (status === 429) return 'API_006';
      if (status >= 500) return 'API_003';
      if (status === 401 || status === 403) return 'AUTH_001';
      if (status === 404) return 'DB_005';
      if (status >= 400) return 'API_004';
    }

    // Database errors
    if (error.message?.includes('P2002')) return 'DB_003';
    if (error.message?.includes('P2003')) return 'DB_004';
    if (error.message?.includes('P2025')) return 'DB_005';

    return 'API_005';
  }

  /**
   * Log an error
   */
  log(entry: Omit<ErrorEntry, 'timestamp'>) {
    const fullEntry: ErrorEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.errors.push(fullEntry);
    if (this.errors.length > MAX_STORED) this.errors.shift();
    this.saveToStorage();

    // Send to debug dashboard (fire-and-forget)
    this.sendToDebug(fullEntry);

    // Console output with code
    const prefix = `[${fullEntry.code}]`;
    console.error(`${prefix} ${fullEntry.message}`, fullEntry.detail || '', fullEntry.meta || '');

    return fullEntry;
  }

  /**
   * Log an API error with auto-classification
   */
  logApiError(error: any, endpoint?: string) {
    const code = this.classifyError(error);
    const message = error?.response?.data?.error || error?.message || 'Unknown API error';
    const status = error?.response?.status;

    return this.log({
      code,
      message: `${message}${status ? ` [${status}]` : ''}${endpoint ? ` → ${endpoint}` : ''}`,
      detail: error?.response?.data ? JSON.stringify(error.response.data).slice(0, 500) : undefined,
      meta: { endpoint, status, method: error?.config?.method },
      source: 'api',
    });
  }

  /**
   * Send to debug dashboard
   */
  private async sendToDebug(entry: ErrorEntry) {
    try {
      await fetch(`${this.debugUrl}/api/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch {
      // Debug server may not be running — that's fine
    }
  }

  /**
   * Get all errors
   */
  getErrors(): ErrorEntry[] {
    return [...this.errors];
  }

  /**
   * Get errors by code
   */
  getErrorsByCode(code: string): ErrorEntry[] {
    return this.errors.filter(e => e.code === code);
  }

  /**
   * Get error counts
   */
  getCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.errors) {
      counts[e.code] = (counts[e.code] || 0) + 1;
    }
    return counts;
  }

  /**
   * Clear stored errors
   */
  clear() {
    this.errors = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get description for an error code
   */
  getDescription(code: string): string {
    return ERROR_DESCRIPTIONS[code] || 'Unknown error';
  }
}

// Singleton
export const errorLog = new ErrorLogger();
