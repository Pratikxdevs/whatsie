import { Router } from 'express';
import { enrichError } from '../errors/recovery';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { validateBody } from '../middleware/validate';
import { createLeadSchema, updateLeadSchema } from '../schemas/leads';
import { createAppError, ErrorCode } from '../errors/codes';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/leads - List leads with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const { status, platform, search, page: pageStr, limit: limitStr } = req.query;

    const page = Math.max(1, parseInt(pageStr as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr as string, 10) || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status && typeof status === 'string') {
      where.status = status;
    } else {
      // By default, exclude 'new' leads (only show those our AI has texted/qualified)
      where.status = { not: 'new' };
    }
    if (platform && typeof platform === 'string') {
      where.source = platform;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { conversations: true } },
          conversations: {
            take: 1,
            orderBy: { lastMessageAt: 'desc' },
            select: { lastMessageAt: true, platform: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return res.json({ leads, total, page, limit });
  } catch (err: any) {
    logger.error({ err }, 'Leads route error listing leads');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// GET /api/leads/:id - Get single lead
router.get('/:id', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        _count: { select: { conversations: true } },
        conversations: {
          include: {
            messages: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                direction: true,
                content: true,
                messageType: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json(createAppError(ErrorCode.DB_005, 'Lead not found'));
    }

    return res.json({ lead });
  } catch (err: any) {
    logger.error({ err }, 'Leads route error fetching lead');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// POST /api/leads - Create lead
router.post('/', validateBody(createLeadSchema), async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const lead = await prisma.lead.create({
      data: { ...req.body, tenantId },
      include: {
        _count: { select: { conversations: true } },
      },
    });
    return res.status(201).json({ lead });
  } catch (err: any) {
    logger.error({ err }, 'Leads route error creating lead');
    return res.status(500).json(createAppError(ErrorCode.DB_006, 'Failed to create lead'));
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const existing = await prisma.lead.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json(createAppError(ErrorCode.DB_005, 'Lead not found'));
    }
    await prisma.lead.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Leads route error deleting lead');
    return res.status(500).json(createAppError(ErrorCode.DB_006, 'Failed to delete lead'));
  }
});

// PATCH /api/leads/:id - Update lead
router.patch('/:id', validateBody(updateLeadSchema), async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const leadId = String(req.params.id);

    const existing = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!existing) {
      return res.status(404).json(createAppError(ErrorCode.DB_005, 'Lead not found'));
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: req.body,
      include: {
        _count: { select: { conversations: true } },
      },
    });

    return res.json({ lead });
  } catch (err: any) {
    logger.error({ err }, 'Leads route error updating lead');
    return res.status(500).json(createAppError(ErrorCode.DB_006, 'Failed to update lead'));
  }
});

export default router;
