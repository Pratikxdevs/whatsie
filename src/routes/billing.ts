import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/billing/usage
 * Current period billing usage.
 * Query: month (optional, YYYY-MM format, defaults to current month)
 */
router.get('/usage', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;

    let periodStart: Date;
    const monthParam = req.query.month as string | undefined;

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [year, month] = monthParam.split('-').map(Number);
      periodStart = new Date(Date.UTC(year, month - 1, 1));
    } else {
      const now = new Date();
      periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }

    const usage = await prisma.billingUsage.findMany({
      where: { tenantId, periodStart },
      orderBy: { metric: 'asc' },
    });

    // CRITICAL: BigInt cannot be serialized to JSON — convert to Number
    const serialized = usage.map(u => ({
      ...u,
      quantity: Number(u.quantity),
    }));

    return res.json({ usage: serialized });
  } catch (err: any) {
    logger.error({ err }, 'Billing usage error');
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * GET /api/billing/usage/history
 * Last 6 months of billing usage.
 */
router.get('/usage/history', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;

    const now = new Date();
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const usage = await prisma.billingUsage.findMany({
      where: {
        tenantId,
        periodStart: { gte: sixMonthsAgo },
      },
      orderBy: { periodStart: 'desc' },
    });

    // BigInt serialization
    const serialized = usage.map(u => ({
      ...u,
      quantity: Number(u.quantity),
    }));

    return res.json({ usage: serialized });
  } catch (err: any) {
    logger.error({ err }, 'Billing usage history error');
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * GET /api/billing/ai-logs
 * Paginated AI usage logs.
 * Query: page (default 1), limit (default 20, max 100)
 */
router.get('/ai-logs', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.aiLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.aiLog.count({ where: { tenantId } }),
    ]);

    return res.json({ logs, total, page, limit });
  } catch (err: any) {
    logger.error({ err }, 'Billing AI logs error');
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

export default router;
