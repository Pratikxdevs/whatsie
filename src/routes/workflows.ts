import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { logger } from '../config/logger';
import { createAppError, ErrorCode } from '../errors/codes';

const router = Router();
router.use(authenticateToken);

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  triggerIntent: z.string().min(1).max(100),
  steps: z.array(z.record(z.string(), z.unknown())).min(1),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  triggerIntent: z.string().min(1).max(100).optional(),
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
});

// GET /api/workflows
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const workflows = await prisma.workflow.findMany({
      where: { tenantId },
      include: { _count: { select: { executions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ workflows });
  } catch (err: any) {
    logger.error({ err }, 'Workflows route error listing');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// GET /api/workflows/:id
router.get('/:id', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const workflow = await prisma.workflow.findFirst({
      where: { id: req.params.id, tenantId },
      include: { executions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!workflow) return res.status(404).json(createAppError(ErrorCode.DB_005, 'Workflow not found'));
    return res.json({ workflow });
  } catch (err: any) {
    logger.error({ err }, 'Workflows route error getting');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// POST /api/workflows
router.post('/', validateBody(createWorkflowSchema), async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const workflow = await prisma.workflow.create({ data: { ...req.body, tenantId } });
    return res.status(201).json({ workflow });
  } catch (err: any) {
    logger.error({ err }, 'Workflows route error creating');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// PUT /api/workflows/:id
router.put('/:id', validateBody(updateWorkflowSchema), async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const id = String(req.params.id);
    const existing = await prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json(createAppError(ErrorCode.DB_005, 'Workflow not found'));
    const workflow = await prisma.workflow.update({ where: { id }, data: req.body });
    return res.json({ workflow });
  } catch (err: any) {
    logger.error({ err }, 'Workflows route error updating');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    await prisma.workflow.deleteMany({ where: { id: req.params.id, tenantId } });
    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Workflows route error deleting');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// GET /api/workflows/executions
router.get('/executions', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const where: any = { tenantId };
    if (req.query.workflowId) where.workflowId = req.query.workflowId as string;
    const executions = await prisma.workflowExecution.findMany({
      where,
      include: { workflow: { select: { name: true } }, lead: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ executions });
  } catch (err: any) {
    logger.error({ err }, 'Workflows route error listing executions');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

// POST /api/workflows/executions/:id/cancel
router.post('/executions/:id/cancel', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const execution = await prisma.workflowExecution.updateMany({
      where: { id: req.params.id, tenantId, status: 'running' },
      data: { status: 'cancelled' },
    });
    return res.json({ success: execution.count > 0 });
  } catch (err: any) {
    logger.error({ err }, 'Workflows route error cancelling execution');
    return res.status(500).json(createAppError(ErrorCode.SYS_003, 'Internal Server Error'));
  }
});

export default router;
