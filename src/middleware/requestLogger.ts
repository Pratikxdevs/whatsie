/**
 * Universal Request Logger Middleware — 100x Edition
 *
 * Logs EVERY HTTP request lifecycle to both pino logger and the 9222 debug ring buffer:
 *   1. REQUEST START  — method, path, auth method, body size, user-agent
 *   2. REQUEST FINISH — status, duration, user/tenant context, response size
 *   3. AUTH EVENTS    — login/logout/register events with user context
 *
 * Categories: [BACKEND] for standard requests, [AUTH] for auth events.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { addLog } from '../debug/server';

/** Detect how the request was authenticated */
function detectAuthMethod(req: Request): string {
  if (req.headers['x-api-key']) return 'api-key';
  if (req.headers.authorization?.startsWith('Bearer ')) return 'bearer';
  return 'none';
}

/** Extract body size safely */
function getBodySize(req: Request): number {
  const cl = req.headers['content-length'];
  if (cl) return parseInt(cl, 10) || 0;
  if (req.body && typeof req.body === 'object') {
    try { return JSON.stringify(req.body).length; } catch { return 0; }
  }
  return 0;
}

const SKIP_PATHS = new Set(['/health', '/api/debug/health', '/ready', '/metrics']);

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const method = req.method;
  const path = req.url;
  const requestId = (req as any).id || '-';

  // Skip noise paths
  if (SKIP_PATHS.has(path) || path.startsWith('/assets')) {
    return next();
  }

  const authMethod = detectAuthMethod(req);
  const userAgent = req.headers['user-agent']?.slice(0, 80) || '-';
  const bodySize = getBodySize(req);

  // ── LOG REQUEST START ────────────────────────────────────────────
  const startMeta = {
    requestId,
    method,
    path,
    authMethod,
    bodySize,
    userAgent,
    ip: req.ip,
    source: 'backend',
    category: 'backend',
  };

  logger.debug(startMeta, `→ ${method} ${path}`);
  addLog('info', `[BACKEND] → ${method} ${path} (${authMethod}${bodySize > 0 ? `, ${bodySize}B` : ''})`, undefined, startMeta);

  // ── LOG REQUEST FINISH ───────────────────────────────────────────
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const userId = (req as any).user?.id || null;
    const tenantId = (req as any).user?.tenantId || null;
    const resSize = parseInt(res.getHeader('content-length') as string || '0', 10) || 0;

    const finishMeta: Record<string, any> = {
      requestId,
      method,
      path,
      status,
      duration,
      authMethod,
      source: 'backend',
      category: 'backend',
    };
    if (userId) finishMeta.userId = userId;
    if (tenantId) finishMeta.tenantId = tenantId;
    if (resSize > 0) finishMeta.resSize = resSize;

    // Log level based on status
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    const statusIcon = status >= 500 ? '✗' : status >= 400 ? '⚠' : '✓';

    // Structured pino log
    logger[level](finishMeta, `← ${method} ${path} ${status} ${duration}ms`);

    // Auth events — enhanced detail
    if (path.includes('/auth/') || path.includes('/login') || path.includes('/logout') || path.includes('/register')) {
      const eventType = path.includes('/login') ? 'LOGIN'
        : path.includes('/logout') ? 'LOGOUT'
        : path.includes('/register') ? 'REGISTER'
        : path.includes('/refresh') ? 'TOKEN_REFRESH'
        : 'AUTH';

      addLog(
        level === 'error' ? 'error' : 'info',
        `[AUTH] ${statusIcon} ${eventType} — ${method} ${path} → ${status} (${duration}ms)`,
        undefined,
        { ...finishMeta, eventType, category: 'backend' }
      );
    } else {
      addLog(
        level,
        `[BACKEND] ${statusIcon} ${method} ${path} → ${status} (${duration}ms)`,
        undefined,
        finishMeta
      );
    }
  });

  next();
}
