/**
 * Frontend Error Logger + Activity Tracker — 100x Edition
 *
 * Captures API errors, component errors, unhandled exceptions, AND
 * all normal activity (API calls, route changes, socket events).
 * Sends everything to the debug dashboard on port 9222 and stores locally.
 */

export interface ErrorEntry {
  code: string;
  message: string;
  detail?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
  source: 'api' | 'component' | 'unhandled' | 'user' | 'activity';
}

const STORAGE_KEY = 'whatsie_error_log';
const MAX_STORED = 200;

/**
 * Full error code registry — mirrors all 32 backend codes
 */
export const ErrorCode = {
  // API Errors
  API_001: 'API_001', // Request timeout
  API_002: 'API_002', // Network unreachable
  API_003: 'API_003', // Server returned 5xx
  API_004: 'API_004', // Server returned 4xx
  API_005: 'API_005', // Response parsing failed
  API_006: 'API_006', // Rate limited (429)

  // Database Errors
  DB_001: 'DB_001', // Connection failed
  DB_002: 'DB_002', // Query timeout
  DB_003: 'DB_003', // Unique constraint
  DB_004: 'DB_004', // Foreign key violation
  DB_005: 'DB_005', // Record not found
  DB_006: 'DB_006', // Transaction failed
  DB_007: 'DB_007', // Schema migration needed
  DB_008: 'DB_008', // Connection pool exhausted

  // Auth Errors
  AUTH_001: 'AUTH_001', // Missing token
  AUTH_002: 'AUTH_002', // Token expired
  AUTH_003: 'AUTH_003', // Token invalid
  AUTH_004: 'AUTH_004', // Insufficient permissions
  AUTH_005: 'AUTH_005', // API key invalid
  AUTH_006: 'AUTH_006', // Tenant not found
  AUTH_007: 'AUTH_007', // Tenant suspended

  // WhatsApp Errors
  WA_001: 'WA_001', // Instance not found
  WA_002: 'WA_002', // Instance not connected
  WA_003: 'WA_003', // QR failed
  WA_004: 'WA_004', // Send failed
  WA_005: 'WA_005', // Webhook sig invalid
  WA_006: 'WA_006', // Evolution API down
  WA_007: 'WA_007', // Normalize failed
  WA_008: 'WA_008', // Duplicate
  WA_009: 'WA_009', // Session mismatch

  // Queue Errors
  Q_001: 'Q_001', // Redis failed
  Q_002: 'Q_002', // Enqueue failed
  Q_003: 'Q_003', // Worker failed
  Q_004: 'Q_004', // DLQ
  Q_005: 'Q_005', // Rate limit

  // WebSocket Errors
  WS_001: 'WS_001', // Connection failed
  WS_002: 'WS_002', // Room join failed
  WS_003: 'WS_003', // Event emission failed

  // System Errors
  SYS_001: 'SYS_001', // Missing env var
  SYS_002: 'SYS_002', // Service unhealthy
  SYS_003: 'SYS_003', // Disk space low
  SYS_004: 'SYS_004', // Memory critical
  SYS_005: 'SYS_005', // External service unreachable
} as const;

class ErrorLogger {
  private errors: ErrorEntry[] = [];
  private debugUrl: string;

  constructor() {
    this.debugUrl = this.getDebugUrl();
    this.loadFromStorage();
    this.setupGlobalHandlers();
  }

  private getDebugUrl(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:9222`;
    }
    return 'http://localhost:9222';
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) this.errors = JSON.parse(stored);
    } catch { /* ignore */ }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.errors.slice(-MAX_STORED)));
    } catch { /* ignore */ }
  }

  private setupGlobalHandlers() {
    if (typeof window === 'undefined') return;

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
   * Classify an error into a code.
   * Prioritizes backend-stamped code over client-side guessing.
   */
  classifyError(error: any): string {
    if (!error) return 'API_005';

    // Backend-stamped code takes priority
    if (error.response?.data?.code) return error.response.data.code;

    // Axios error patterns
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

    // Prisma error codes (if leaked to frontend)
    if (error.message?.includes('P2002')) return 'DB_003';
    if (error.message?.includes('P2003')) return 'DB_004';
    if (error.message?.includes('P2025')) return 'DB_005';

    return 'API_005';
  }

  /**
   * Log an error entry.
   */
  log(entry: Omit<ErrorEntry, 'timestamp'>) {
    const fullEntry: ErrorEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.errors.push(fullEntry);
    if (this.errors.length > MAX_STORED) this.errors.shift();
    this.saveToStorage();

    // Send to debug dashboard
    this.sendToDebug({
      level: entry.source === 'activity' ? 'info' : 'error',
      message: `[FRONTEND] ${fullEntry.message}`,
      code: fullEntry.code,
      meta: { ...fullEntry.meta, source: 'frontend', category: 'frontend' },
    });

    if (entry.source !== 'activity') {
      const prefix = `[${fullEntry.code}]`;
      console.error(`${prefix} ${fullEntry.message}`, fullEntry.detail || '', fullEntry.meta || '');
    }

    return fullEntry;
  }

  /**
   * Log a non-error activity event (API call, route change, socket event).
   */
  activityLog(event: string, meta?: Record<string, unknown>): void {
    this.sendToDebug({
      level: 'info',
      message: `[FRONTEND] ${event}`,
      code: undefined,
      meta: { ...meta, source: 'frontend', category: 'frontend' },
    });
  }

  /**
   * Log an API error with auto-classification.
   */
  logApiError(error: any, endpoint?: string) {
    const code = this.classifyError(error);

    // Check for backend-enriched error
    const backendData = error?.response?.data;
    const backendMessage = backendData?.message || backendData?.detail || backendData?.error || error?.message || 'Unknown API error';
    const status = error?.response?.status;

    return this.log({
      code,
      message: `${backendMessage}${status ? ` [${status}]` : ''}${endpoint ? ` → ${endpoint}` : ''}`,
      detail: backendData ? JSON.stringify(backendData).slice(0, 500) : undefined,
      meta: { endpoint, status, method: error?.config?.method, backendCode: backendData?.code },
      source: 'api',
    });
  }

  /**
   * Send a log entry to the 9222 debug dashboard.
   */
  private async sendToDebug(entry: {
    level: string;
    message: string;
    code?: string;
    meta?: Record<string, unknown>;
  }) {
    try {
      await fetch(`${this.debugUrl}/api/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: entry.level,
          message: entry.message,
          code: entry.code,
          meta: entry.meta,
        }),
      });
    } catch {
      // Debug server not running — silent fail
    }
  }

  getErrors(): ErrorEntry[] {
    return [...this.errors];
  }

  getErrorsByCode(code: string): ErrorEntry[] {
    return this.errors.filter(e => e.code === code);
  }

  getCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.errors) {
      counts[e.code] = (counts[e.code] || 0) + 1;
    }
    return counts;
  }

  clear() {
    this.errors = [];
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const errorLog = new ErrorLogger();
