/**
 * Error Code Registry
 *
 * Format: {DOMAIN}_{NUMBER}
 * Domains:
 *   API  = Frontend API calls (axios/fetch failures)
 *   DB   = Database / Prisma errors
 *   AUTH = Authentication / authorization
 *   WA   = WhatsApp / Evolution API
 *   Q    = Queue / BullMQ / Redis
 *   WS   = WebSocket / Socket.IO
 *   SYS  = System / infrastructure
 */

export const ErrorCode = {
  // ── API Errors (frontend → backend) ──────────────────────────────
  API_001: 'API_001', // Request timeout
  API_002: 'API_002', // Network unreachable
  API_003: 'API_003', // Server returned 5xx
  API_004: 'API_004', // Server returned 4xx (client error)
  API_005: 'API_005', // Response parsing failed
  API_006: 'API_006', // Rate limited (429)

  // ── Database Errors ──────────────────────────────────────────────
  DB_001: 'DB_001',   // Connection failed
  DB_002: 'DB_002',   // Query timeout
  DB_003: 'DB_003',   // Unique constraint violation
  DB_004: 'DB_004',   // Foreign key violation
  DB_005: 'DB_005',   // Record not found
  DB_006: 'DB_006',   // Transaction failed
  DB_007: 'DB_007',   // Schema migration needed
  DB_008: 'DB_008',   // Connection pool exhausted

  // ── Auth Errors ──────────────────────────────────────────────────
  AUTH_001: 'AUTH_001', // Missing token
  AUTH_002: 'AUTH_002', // Token expired
  AUTH_003: 'AUTH_003', // Token invalid / malformed
  AUTH_004: 'AUTH_004', // Insufficient permissions
  AUTH_005: 'AUTH_005', // API key invalid
  AUTH_006: 'AUTH_006', // Tenant not found
  AUTH_007: 'AUTH_007', // Tenant suspended

  // ── WhatsApp / Evolution API Errors ──────────────────────────────
  WA_001: 'WA_001',   // Instance not found
  WA_002: 'WA_002',   // Instance not connected
  WA_003: 'WA_003',   // QR code generation failed
  WA_004: 'WA_004',   // Send message failed
  WA_005: 'WA_005',   // Webhook signature invalid
  WA_006: 'WA_006',   // Evolution API unreachable
  WA_007: 'WA_007',   // Message normalization failed
  WA_008: 'WA_008',   // Duplicate message (idempotency)
  WA_009: 'WA_009',   // Session name mismatch

  // ── Queue / Redis Errors ─────────────────────────────────────────
  Q_001: 'Q_001',     // Redis connection failed
  Q_002: 'Q_002',     // Job enqueue failed
  Q_003: 'Q_003',     // Worker processing failed
  Q_004: 'Q_004',     // Job exceeded max retries (DLQ)
  Q_005: 'Q_005',     // Rate limit exceeded

  // ── WebSocket Errors ─────────────────────────────────────────────
  WS_001: 'WS_001',   // Connection failed
  WS_002: 'WS_002',   // Room join failed
  WS_003: 'WS_003',   // Event emission failed

  // ── System Errors ────────────────────────────────────────────────
  SYS_001: 'SYS_001', // Missing environment variable
  SYS_002: 'SYS_002', // Service unhealthy
  SYS_003: 'SYS_003', // Disk space low
  SYS_004: 'SYS_004', // Memory pressure
  SYS_005: 'SYS_005', // External service unreachable
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Error code descriptions — human-readable explanations
 */
export const ERROR_DESCRIPTIONS: Record<string, string> = {
  API_001: 'Request timed out — backend did not respond within 15s',
  API_002: 'Network unreachable — backend server may be down',
  API_003: 'Server error (5xx) — backend crashed or misconfigured',
  API_004: 'Client error (4xx) — check request parameters',
  API_005: 'Response parsing failed — unexpected JSON structure',
  API_006: 'Rate limited — too many requests',

  DB_001: 'Database connection failed — check Postgres is running',
  DB_002: 'Query timed out — possible lock or missing index',
  DB_003: 'Unique constraint violated — duplicate record',
  DB_004: 'Foreign key violation — referenced record missing',
  DB_005: 'Record not found',
  DB_006: 'Transaction rolled back — concurrent conflict',
  DB_007: 'Schema drift — run npx prisma migrate dev',
  DB_008: 'Connection pool exhausted — too many concurrent queries',

  AUTH_001: 'No authentication token provided',
  AUTH_002: 'Token has expired — login again',
  AUTH_003: 'Token is invalid or malformed',
  AUTH_004: 'Insufficient permissions for this action',
  AUTH_005: 'API key is invalid or revoked',
  AUTH_006: 'Tenant not found in database',
  AUTH_007: 'Tenant is suspended — contact support',

  WA_001: 'WhatsApp instance not found in Evolution API',
  WA_002: 'WhatsApp instance not connected — scan QR code',
  WA_003: 'QR code generation failed — restart the bot',
  WA_004: 'Failed to send WhatsApp message',
  WA_005: 'Webhook HMAC signature invalid — check EVOLUTION_API_SECRET',
  WA_006: 'Evolution API unreachable at EVOLUTION_API_URL',
  WA_007: 'Failed to normalize incoming webhook payload',
  WA_008: 'Duplicate message received (already processed)',
  WA_009: 'Session name does not match any bot record',

  Q_001: 'Redis connection failed — check Redis is running',
  Q_002: 'Failed to enqueue job to BullMQ',
  Q_003: 'Worker failed to process job',
  Q_004: 'Job permanently failed after max retries — moved to DLQ',
  Q_005: 'Rate limit exceeded — slow down',

  WS_001: 'WebSocket connection failed',
  WS_002: 'Failed to join tenant room',
  WS_003: 'Failed to emit Socket.IO event',

  SYS_001: 'Required environment variable not set',
  SYS_002: 'Health check failed — service degraded',
  SYS_003: 'Disk space critically low',
  SYS_004: 'Memory usage critical',
  SYS_005: 'External service unreachable',
};

/**
 * Create a structured error object with code
 */
export function createAppError(code: ErrorCode, detail?: string, meta?: Record<string, unknown>) {
  return {
    code,
    message: ERROR_DESCRIPTIONS[code] || 'Unknown error',
    detail: detail || null,
    meta: meta || null,
    timestamp: new Date().toISOString(),
  };
}
