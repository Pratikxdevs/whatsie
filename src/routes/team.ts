import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { createAppError, ErrorCode } from '../errors/codes';

const router = Router();
router.use(authenticateToken);

// GET /api/team
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const members = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, role: true, createdAt: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ members });
  } catch (err: any) {
    logger.error({ err }, 'Team route error listing');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// PUT /api/team/:id/role
router.put('/:id/role', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const { role } = req.body;
    if (!role || !['owner', 'admin', 'member'].includes(role)) {
      return res.status(400).json(createAppError(ErrorCode.API_004, 'Invalid role'));
    }
    await prisma.user.updateMany({ where: { id: req.params.id, tenantId }, data: { role } });
    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Team route error updating role');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// DELETE /api/team/:id
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const userId = (req as AuthenticatedRequest).user!.id;
    if (req.params.id === userId) {
      return res.status(400).json(createAppError(ErrorCode.API_004, 'Cannot remove yourself'));
    }
    await prisma.user.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Team route error removing');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

export default router;
