import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma, prismaUnfiltered } from '../db/prisma';
import { tenantContext } from './tenant';
import { logger } from '../config/logger';
import { enrichError } from '../errors/recovery';

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
    return res.status(401).json(enrichError('AUTH_005', 'API key is invalid or revoked'));
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
          
          user = await prismaUnfiltered.$transaction(async (tx: any) => {
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
          
          if (!user) {
            throw new Error('User not found after JIT sync');
          }
          logger.info({ clerkId: authState.userId, tenantId: user.tenantId }, 'JIT sync successful');
        } catch (syncErr: any) {
          logger.error({ err: syncErr.message }, 'JIT sync failed');
          return res.status(403).json(enrichError('AUTH_006', 'User account not synced — try signing out and back in'));
        }
      }

      if (!user) {
        return res.status(403).json(enrichError('AUTH_006', 'User account not synced — try signing out and back in'));
      }

      req.user = { id: user.id, tenantId: user.tenantId };
      return tenantContext.run({ tenantId: user.tenantId }, () => next());
    } catch (error) {
      logger.error({ error }, 'Clerk auth lookup failed');
      return res.status(500).json(enrichError('AUTH_003', 'Authentication lookup failed — try signing in again'));
    }
  }

  // Default Fail-Closed
  return res.status(401).json(enrichError('AUTH_001', 'Authentication required — provide a valid Clerk token or X-API-KEY header'));
};
