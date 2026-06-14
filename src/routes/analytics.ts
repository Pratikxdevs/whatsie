import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/analytics/message-volume
 * Message volume over time (inbound/outbound per day).
 * Query: days (default 30), platform (optional filter)
 */
router.get('/message-volume', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 90);
    const platform = req.query.platform as string | undefined;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build platform join/filter if needed
    // NOTE: Prisma uses camelCase columns (no @map), so raw SQL must quote them
    let rows: { date: Date; inbound: bigint; outbound: bigint }[];
    if (platform) {
      rows = await prisma.$queryRaw`
        SELECT DATE(m."createdAt") as date,
               COUNT(*) FILTER (WHERE m.direction = 'in') as inbound,
               COUNT(*) FILTER (WHERE m.direction = 'out') as outbound
        FROM "Message" m
        JOIN "Conversation" c ON c.id = m."conversationId"
        WHERE m."tenantId" = ${tenantId}
          AND m."createdAt" >= ${startDate}
          AND c.platform = ${platform}
        GROUP BY DATE(m."createdAt")
        ORDER BY date ASC
      `;
    } else {
      rows = await prisma.$queryRaw`
        SELECT DATE("createdAt") as date,
               COUNT(*) FILTER (WHERE direction = 'in') as inbound,
               COUNT(*) FILTER (WHERE direction = 'out') as outbound
        FROM "Message"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `;
    }

    const data = rows.map(r => ({
      date: r.date,
      inbound: Number(r.inbound),
      outbound: Number(r.outbound),
    }));

    res.set('Cache-Control', 'private, max-age=60');
    return res.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'Analytics message-volume error');
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * GET /api/analytics/conversion-funnel
 * Lead counts grouped by status.
 */
router.get('/conversion-funnel', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;

    const grouped = await prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });

    const funnel = grouped.map(g => ({
      status: g.status,
      count: g._count,
    }));

    res.set('Cache-Control', 'private, max-age=120');
    return res.json({ funnel });
  } catch (err: any) {
    logger.error({ err }, 'Analytics conversion-funnel error');
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * GET /api/analytics/dashboard-stats
 * Summary stats: total leads, open conversations, messages this month, active bots.
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [totalLeads, openConversations, messagesThisMonth, activeBots, convertedLeads] = await Promise.all([
      prisma.lead.count({ where: { tenantId, status: { not: 'new' } } }),
      prisma.conversation.count({ where: { tenantId, status: 'open' } }),
      prisma.message.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
      prisma.bot.count({ where: { tenantId, status: 'connected' } }),
      prisma.lead.count({ where: { tenantId, status: 'converted' } }),
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    res.set('Cache-Control', 'private, max-age=30');
    return res.json({ totalLeads, openConversations, messagesThisMonth, activeBots, conversionRate });
  } catch (err: any) {
    logger.error({ err }, 'Analytics dashboard-stats error');
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

export default router;
