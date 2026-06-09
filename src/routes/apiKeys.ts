import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { logger } from '../config/logger';
import { createAppError, ErrorCode } from '../errors/codes';

const router = Router();
router.use(authenticateToken);

const createKeySchema = z.object({ name: z.string().min(1).max(100) });

// GET /api/api-keys
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const keys = await prisma.apiKey.findMany({ where: { tenantId }, select: { id: true, name: true, createdAt: true } });
    return res.json({ keys });
  } catch (err: any) {
    logger.error({ err }, 'API keys route error listing');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// POST /api/api-keys
router.post('/', validateBody(createKeySchema), async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const rawKey = `crm_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    const apiKey = await prisma.apiKey.create({ data: { tenantId, keyHash, name: req.body.name } });
    return res.status(201).json({ id: apiKey.id, name: apiKey.name, key: rawKey, createdAt: apiKey.createdAt });
  } catch (err: any) {
    logger.error({ err }, 'API keys route error creating');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// DELETE /api/api-keys/:id
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    await prisma.apiKey.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'API keys route error deleting');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

export default router;
