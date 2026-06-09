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

// Dev bypass tenant — used when DEV_AUTH_BYPASS=true
const DEV_TENANT_ID = process.env.DEFAULT_TENANT_ID;
const DEV_AUTH_BYPASS = process.env.DEV_AUTH_BYPASS === 'true';

/**
 * Dual-mode authentication middleware.
 * Supports:
 *   1. Dev bypass (DEV_AUTH_BYPASS=true) — auto-assigns default tenant
 *   2. API Key header (X-API-KEY: <key>) — resolves tenant from ApiKey table
 *   3. Bearer JWT tokens (Authorization: Bearer <token>)
 *   4. Clerk JWT (req.auth populated by clerkMiddleware upstream)
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Strategy 0: Dev bypass — auto-assign default tenant
  if (DEV_AUTH_BYPASS) {
    if (!DEV_TENANT_ID) {
      logger.fatal('DEV_AUTH_BYPASS is enabled but DEFAULT_TENANT_ID is not set');
      return res.status(500).json({ error: 'Server misconfigured: DEFAULT_TENANT_ID required when DEV_AUTH_BYPASS is enabled' });
    }
    req.user = {
      id: 'dev-user',
      tenantId: DEV_TENANT_ID,
      role: 'admin'
    };
    return next();
  }

  // Strategy 1: Check X-API-KEY header first
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey) {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
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
    return res.status(401).json({ error: 'Authentication required' });
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
