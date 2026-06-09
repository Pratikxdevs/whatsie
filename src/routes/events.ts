import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { createAppError, ErrorCode } from '../errors/codes';

const router = Router();
router.use(authenticateToken);

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const events = await prisma.event.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return res.json({ events, page, limit });
  } catch (err: any) {
    logger.error({ err }, 'Events route error');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

export default router;
