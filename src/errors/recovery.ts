/**
 * Error Recovery Registry
 *
 * For every error code, defines the self-fix action a user can take.
 * Attached to every enriched API error response as `recovery`.
 *
 * Shape:
 *   action  — short verb phrase shown to user ("Sign in again")
 *   cta     — optional button label + frontend route
 *   hint    — longer explanation of what to do
 */

import { ErrorCode } from './codes';

export interface RecoveryAction {
  action: string;
  hint: string;
  cta?: {
    label: string;
    route?: string;         // frontend route (e.g. "/login")
    trigger?: string;       // UI trigger key (e.g. "open_qr_modal", "open_settings_ai")
  };
  severity: 'info' | 'warn' | 'error' | 'fatal';
}

export const ERROR_RECOVERY: Record<string, RecoveryAction> = {
  // ── Auth Errors ───────────────────────────────────────────────────
  AUTH_001: {
    action: 'Sign in again',
    hint: 'Your session token is missing. Please sign in to continue.',
    cta: { label: 'Go to Login', route: '/login' },
    severity: 'warn',
  },
  AUTH_002: {
    action: 'Sign in again',
    hint: 'Your session has expired. Please sign in to refresh it.',
    cta: { label: 'Sign In', route: '/login' },
    severity: 'warn',
  },
  AUTH_003: {
    action: 'Sign in again',
    hint: 'Your session token is corrupted. Sign out and sign back in to fix this.',
    cta: { label: 'Sign In', route: '/login' },
    severity: 'warn',
  },
  AUTH_004: {
    action: 'Contact your admin',
    hint: "You don't have permission for this action. Ask your workspace admin to grant you access.",
    severity: 'warn',
  },
  AUTH_005: {
    action: 'Reconfigure your API key',
    hint: 'Your AI API key is invalid or has been revoked. Go to Settings → AI Keys to update it.',
    cta: { label: 'Open AI Settings', trigger: 'open_settings_ai' },
    severity: 'error',
  },
  AUTH_006: {
    action: 'Sign in again',
    hint: 'Your account was not found in the system. Signing in again will re-sync your account.',
    cta: { label: 'Sign In', route: '/login' },
    severity: 'error',
  },
  AUTH_007: {
    action: 'Contact support',
    hint: 'Your workspace has been suspended. Please contact support to resolve this.',
    severity: 'fatal',
  },

  // ── WhatsApp / Evolution API Errors ──────────────────────────────
  WA_001: {
    action: 'Delete this bot and recreate it',
    hint: 'The WhatsApp instance no longer exists in the messaging platform. Delete this bot and add a new one.',
    cta: { label: 'Delete & Recreate', trigger: 'delete_and_recreate_bot' },
    severity: 'error',
  },
  WA_002: {
    action: 'Scan the QR code again',
    hint: 'Your WhatsApp session is disconnected. Open the bot and scan the QR code to reconnect.',
    cta: { label: 'Scan QR', trigger: 'open_qr_modal' },
    severity: 'warn',
  },
  WA_003: {
    action: 'Restart the bot',
    hint: 'QR code generation failed. Try stopping and starting the bot again to generate a fresh QR code.',
    cta: { label: 'Retry QR', trigger: 'retry_qr' },
    severity: 'error',
  },
  WA_004: {
    action: 'Retry sending the message',
    hint: 'Failed to send the WhatsApp message. The recipient may have blocked you or the connection dropped. Try again.',
    cta: { label: 'Retry', trigger: 'retry_send_message' },
    severity: 'error',
  },
  WA_005: {
    action: 'Check EVOLUTION_API_SECRET environment variable',
    hint: 'Incoming webhook signature is invalid. Make sure EVOLUTION_API_SECRET in .env matches the value configured in Evolution API.',
    severity: 'fatal',
  },
  WA_006: {
    action: 'Check the Evolution API service',
    hint: 'The messaging platform is unreachable. Verify that Evolution API is running (check Docker) and EVOLUTION_API_URL is set correctly.',
    cta: { label: 'View Health', trigger: 'open_health_dashboard' },
    severity: 'fatal',
  },
  WA_007: {
    action: 'Check incoming webhook format',
    hint: 'Failed to process an incoming message — the payload format is unexpected. This may be a version mismatch with Evolution API.',
    severity: 'error',
  },
  WA_008: {
    action: 'No action needed',
    hint: 'This message was already processed. Duplicate messages are ignored automatically.',
    severity: 'info',
  },
  WA_009: {
    action: 'Delete this bot and recreate it',
    hint: 'The session name in the database does not match any active bot. Delete this entry and recreate the bot.',
    cta: { label: 'Delete & Recreate', trigger: 'delete_and_recreate_bot' },
    severity: 'error',
  },

  // ── API Errors ────────────────────────────────────────────────────
  API_001: {
    action: 'Retry the request',
    hint: 'The server took too long to respond. This is usually temporary — try again in a moment.',
    cta: { label: 'Retry', trigger: 'retry_request' },
    severity: 'warn',
  },
  API_002: {
    action: 'Check your connection',
    hint: 'Cannot reach the server. Check that you are connected to the internet and the server is running.',
    severity: 'error',
  },
  API_003: {
    action: 'Try again in a moment',
    hint: 'The server encountered an internal error. This is usually temporary. If it persists, check server logs.',
    cta: { label: 'Retry', trigger: 'retry_request' },
    severity: 'error',
  },
  API_004: {
    action: 'Check request parameters',
    hint: 'The request contained invalid data. Check the form fields and try again.',
    severity: 'warn',
  },
  API_005: {
    action: 'Refresh the page',
    hint: 'Received unexpected data from the server. Refreshing the page often fixes this.',
    cta: { label: 'Refresh', trigger: 'refresh_page' },
    severity: 'error',
  },
  API_006: {
    action: 'Wait and try again',
    hint: 'Too many requests sent too quickly. Wait a moment before trying again.',
    cta: { label: 'Retry in 30s', trigger: 'countdown_retry' },
    severity: 'warn',
  },

  // ── Database Errors ───────────────────────────────────────────────
  DB_001: {
    action: 'Check database connection',
    hint: 'The database is unreachable. Verify that PostgreSQL is running (check Docker) and DATABASE_URL is correct.',
    cta: { label: 'View Health', trigger: 'open_health_dashboard' },
    severity: 'fatal',
  },
  DB_002: {
    action: 'Try again in a moment',
    hint: 'A database query timed out. This may be caused by high load or a missing index.',
    cta: { label: 'Retry', trigger: 'retry_request' },
    severity: 'error',
  },
  DB_003: {
    action: 'Use a different name',
    hint: 'A record with this value already exists. Try using a different name or identifier.',
    severity: 'warn',
  },
  DB_004: {
    action: 'Check related records',
    hint: 'A required related record is missing. The item you referenced may have been deleted.',
    severity: 'error',
  },
  DB_005: {
    action: 'Go back',
    hint: 'The requested item no longer exists. It may have been deleted.',
    cta: { label: 'Go Back', trigger: 'navigate_back' },
    severity: 'warn',
  },
  DB_006: {
    action: 'Try again',
    hint: 'A database transaction was rolled back due to a conflict. Try the operation again.',
    cta: { label: 'Retry', trigger: 'retry_request' },
    severity: 'error',
  },
  DB_007: {
    action: 'Run database migrations',
    hint: 'The database schema is out of date. Run: npx prisma migrate dev',
    severity: 'fatal',
  },
  DB_008: {
    action: 'Try again in a moment',
    hint: 'The database connection pool is exhausted. The system is under high load. Try again shortly.',
    severity: 'error',
  },

  // ── Queue / Redis Errors ──────────────────────────────────────────
  Q_001: {
    action: 'Check Redis connection',
    hint: 'Redis is unreachable. Verify Redis is running (check Docker) and REDIS_URL is correct.',
    cta: { label: 'View Health', trigger: 'open_health_dashboard' },
    severity: 'fatal',
  },
  Q_002: {
    action: 'Retry the operation',
    hint: 'Failed to queue a background job. Try the operation again.',
    cta: { label: 'Retry', trigger: 'retry_request' },
    severity: 'error',
  },
  Q_003: {
    action: 'Check server logs',
    hint: 'A background worker failed to process a job. Check the debug dashboard for details.',
    cta: { label: 'View Logs', trigger: 'open_health_dashboard' },
    severity: 'error',
  },
  Q_004: {
    action: 'Check the dead letter queue',
    hint: 'A job permanently failed after all retries. Check the debug dashboard to inspect and replay it.',
    cta: { label: 'View DLQ', trigger: 'open_health_dashboard' },
    severity: 'error',
  },
  Q_005: {
    action: 'Slow down',
    hint: 'Too many requests are being processed. The rate limiter has engaged. Wait before sending more.',
    severity: 'warn',
  },

  // ── WebSocket Errors ──────────────────────────────────────────────
  WS_001: {
    action: 'Refresh the page',
    hint: 'Real-time connection failed. Refreshing the page will attempt to reconnect.',
    cta: { label: 'Refresh', trigger: 'refresh_page' },
    severity: 'error',
  },
  WS_002: {
    action: 'Refresh the page',
    hint: 'Failed to join your workspace room. You may miss real-time updates. Refresh to retry.',
    cta: { label: 'Refresh', trigger: 'refresh_page' },
    severity: 'error',
  },
  WS_003: {
    action: 'Refresh the page',
    hint: 'A real-time event could not be delivered. Refresh the page to restore the connection.',
    cta: { label: 'Refresh', trigger: 'refresh_page' },
    severity: 'warn',
  },

  // ── System Errors ─────────────────────────────────────────────────
  SYS_001: {
    action: 'Add the missing environment variable',
    hint: 'A required environment variable is not set. Check the .env file and restart the server.',
    severity: 'fatal',
  },
  SYS_002: {
    action: 'Check service health',
    hint: 'A service health check failed. Check the debug dashboard for details.',
    cta: { label: 'View Health', trigger: 'open_health_dashboard' },
    severity: 'error',
  },
  SYS_003: {
    action: 'Free up disk space',
    hint: 'Disk space is critically low. Delete unused files or expand the disk volume.',
    severity: 'fatal',
  },
  SYS_004: {
    action: 'Check memory usage',
    hint: 'Memory usage is critical. Restart the server or scale up the instance.',
    severity: 'fatal',
  },
  SYS_005: {
    action: 'Check external service connectivity',
    hint: 'An external service is unreachable. Check the debug dashboard for which service failed.',
    cta: { label: 'View Health', trigger: 'open_health_dashboard' },
    severity: 'error',
  },
};

/**
 * Get recovery action for an error code.
 */
export function getRecovery(code: string): RecoveryAction | null {
  return ERROR_RECOVERY[code] || null;
}

export interface EnrichedError {
  code: string;
  message: string;
  detail: string | null;
  meta: Record<string, unknown> | null;
  timestamp: string;
  recovery: RecoveryAction | null;
}

/**
 * Build a fully enriched error object with recovery action.
 * Use this in all route error handlers instead of plain { error: string }.
 */
export function enrichError(
  code: string,
  detail?: string,
  meta?: Record<string, unknown>
): EnrichedError {
  const recovery = getRecovery(code);
  return {
    code,
    message: recovery?.hint || detail || 'An unexpected error occurred',
    detail: detail || null,
    meta: meta || null,
    timestamp: new Date().toISOString(),
    recovery,
  };
}
