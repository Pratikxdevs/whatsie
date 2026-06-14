import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma, prismaUnfiltered } from '../db/prisma';
import { tenantContext } from './tenant';
import { logger } from '../config/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
  };
}

/**
 * HMAC-SHA256 hash of an API key with server-side pepper.
 * Pepper is read from API_KEY_PEPPER env var. Required in production.
 */
function hashApiKey(key: string): string {
  const pepper = process.env.API_KEY_PEPPER!; // enforced at startup via requiredEnvs (C-001)
  return crypto.createHmac('sha256', pepper).update(key).digest('hex');
}

import { getAuth, clerkClient } from '@clerk/express';

/**
 * Authentication middleware.
 * Supports:
 *   1. API Key header (X-API-KEY: <key>) — HMAC-SHA256 + pepper lookup
 *   2. Clerk JWT (getAuth(req) populated by clerkMiddleware upstream)
 *   3. Bearer JWT tokens (Authorization: Bearer <token>)
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authState = getAuth(req);
  
  // Debug log auth state
  logger.info({
    authUserId: authState?.userId,
    hasAuthHeader: !!req.headers.authorization,
    url: req.originalUrl || req.url
  }, 'authenticateToken call debug');

  // Strategy 1: API Key header
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey) {
    const keyHash = hashApiKey(apiKey);
    const keyRecord = await prismaUnfiltered.apiKey.findFirst({
      where: { keyHash },
      include: { tenant: true }
    });
    if (keyRecord && keyRecord.tenant.status === 'active') {
      req.user = {
        id: 'api-key-user',
        tenantId: keyRecord.tenantId
      };
      return next();
    }
    return res.status(401).json({ error: 'Invalid API Key' });
  }

  // Strategy 2: Clerk JWT
  if (authState?.userId) {
    try {
      let user = await prismaUnfiltered.user.findUnique({
        where: { clerkId: authState.userId }
      });

      // JIT Sync: If webhook hasn't fired yet or we're in local dev without ngrok
      if (!user) {
        logger.info({ clerkId: authState.userId }, 'User not found in DB. Attempting JIT sync from Clerk...');
        try {
          const clerkUser = await clerkClient.users.getUser(authState.userId);
          const email = clerkUser.emailAddresses[0]?.emailAddress || 'unknown@example.com';
          const tenantName = email.split('@')[0] || 'My Workspace';
          
          user = await prismaUnfiltered.$transaction(async (tx) => {
            let tenant = await tx.tenant.findFirst({ where: { users: { some: { clerkId: authState.userId } } } });
            if (!tenant) {
              tenant = await tx.tenant.create({
                data: { name: tenantName, status: 'active', plan: 'free' }
              });
            }
            return tx.user.upsert({
              where: { clerkId: authState.userId },
              update: {},
              create: { clerkId: authState.userId, email, tenantId: tenant.id }
            });
          });
          
          logger.info({ clerkId: authState.userId, tenantId: user.tenantId }, 'JIT sync successful');
        } catch (syncErr: any) {
          logger.error({ err: syncErr.message }, 'JIT sync failed');
          return res.status(403).json({ error: 'User not synced and auto-sync failed' });
        }
      }

      req.user = { id: user.id, tenantId: user.tenantId };
      return tenantContext.run({ tenantId: user.tenantId }, () => next());
    } catch (error) {
      logger.error({ error }, 'Clerk auth lookup failed');
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Default Fail-Closed
  return res.status(401).json({ error: 'Authentication required — provide a valid Clerk token or X-API-KEY header' });
};
