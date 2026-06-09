/**
 * Universal Request Logger Middleware
 *
 * Logs every HTTP request to both pino logger and the 9222 debug server ring buffer.
 * Also logs auth events (login/logout/register) with user context.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { addLog } from '../debug/server';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const method = req.method;
  const path = req.url;

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const userId = (req as any).user?.id || null;
    const tenantId = (req as any).user?.tenantId || null;

    // Skip health checks and static assets to reduce noise
    if (path === '/health' || path === '/api/debug/health' || path.startsWith('/assets')) {
      return;
    }

    const meta: Record<string, any> = {
      method,
      path,
      status,
      duration,
    };
    if (userId) meta.userId = userId;
    if (tenantId) meta.tenantId = tenantId;

    // Log level based on status code
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    // Log to pino
    logger[level]({ ...meta }, `${method} ${path} ${status} ${duration}ms`);

    // Log auth events with extra detail
    if (path.includes('/auth/')) {
      const eventType = path.includes('/login') ? 'LOGIN'
        : path.includes('/logout') ? 'LOGOUT'
        : path.includes('/register') ? 'REGISTER'
        : path.includes('/refresh') ? 'TOKEN_REFRESH'
        : 'AUTH';

      addLog(
        level === 'error' ? 'error' : 'info',
        `[${eventType}] ${method} ${path} → ${status} (${duration}ms)`,
        eventType,
        { ...meta, eventType }
      );
    } else {
      // Log to debug server ring buffer
      addLog(
        level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        `${method} ${path} → ${status} (${duration}ms)`,
        undefined,
        meta
      );
    }
  });

  next();
}
