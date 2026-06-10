import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: string;
  };
}

/**
 * HMAC-SHA256 hash of an API key with server-side pepper.
 * Pepper is read from API_KEY_PEPPER env var. Required in production.
 */
function hashApiKey(key: string): string {
  const pepper = process.env.API_KEY_PEPPER;
  if (!pepper) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('API_KEY_PEPPER is required in production');
    }
    logger.warn('API_KEY_PEPPER not set — using insecure dev fallback. DO NOT use in production.');
  }
  const effectivePepper = pepper || 'dev-pepper-do-not-use-in-prod';
  return crypto.createHmac('sha256', effectivePepper).update(key).digest('hex');
}

/**
 * Authentication middleware.
 * Supports:
 *   1. API Key header (X-API-KEY: <key>) — HMAC-SHA256 + pepper lookup
 *   2. Clerk JWT (req.auth populated by clerkMiddleware upstream)
 *   3. Bearer JWT tokens (Authorization: Bearer <token>)
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Strategy 1: API Key header
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey) {
    const keyHash = hashApiKey(apiKey);
    const keyRecord = await prisma.apiKey.findFirst({
      where: { keyHash },
      include: { tenant: true }
    });
    if (keyRecord && keyRecord.tenant.status === 'active') {
      req.user = {
        id: 'api-key-user',
        tenantId: keyRecord.tenantId,
        role: 'admin'
      };
      return next();
    }
    return res.status(401).json({ error: 'Invalid API Key' });
  }

  // Strategy 2: Clerk JWT (req.auth populated by clerkMiddleware)
  const auth = (req as any).auth;
  if (auth?.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId: auth.userId }
      });
      if (!user) {
        return res.status(403).json({ error: 'User not synced' });
      }
      req.user = { id: user.id, tenantId: user.tenantId, role: user.role };
      return next();
    } catch (error) {
      logger.error({ error }, 'Clerk auth lookup failed');
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Strategy 3: Standard Bearer JWT
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required — provide a Bearer token or X-API-KEY header' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('JWT_SECRET is missing in environment variables');
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }
    req.user = decoded as AuthenticatedRequest['user'];
    next();
  });
};
