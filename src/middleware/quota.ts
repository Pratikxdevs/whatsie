import { Response, NextFunction } from 'express';
import { redisConnection } from '../queue/setup';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from './auth';
import { logger } from '../config/logger';

// Plan-based daily message limits
const PLAN_LIMITS: Record<string, number> = {
  free: 100,
  pro: 1000,
  enterprise: 999999,
};

/**
 * Per-tenant daily quota middleware.
 * Tracks messages processed per day in Redis and enforces plan-based limits.
 */
export const checkQuota = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Get tenantId from authenticated user or route params (for gateway routes)
    const tenantId = req.user?.tenantId || (req as any).params?.tenantId;
    if (!tenantId) {
      return next();
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const quotaKey = `quota:${tenantId}:${today}`;

    // Increment and set TTL if new key
    const count = await redisConnection.incr(quotaKey);
    if (count === 1) {
      await redisConnection.expire(quotaKey, 86400); // 24 hours
    }

    // Get tenant plan (default to 'free')
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    const plan = (tenant as any)?.plan || 'free';
    const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    if (count > limit) {
      logger.warn({ tenantId, plan, count, limit }, 'Daily quota exceeded');
      return res.status(429).json({
        error: 'Daily quota exceeded',
        plan,
        limit,
        used: count,
      });
    }

    // Attach quota info to request for downstream use
    (req as any).quota = { count, limit, plan };
    next();
  } catch (err) {
    // Don't block requests if quota check fails
    logger.error({ err }, 'Quota check error, allowing request');
    next();
  }
};
