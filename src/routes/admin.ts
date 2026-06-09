import { Router, Response } from 'express';
import { Queue } from 'bullmq';
import { redisConnection } from '../queue/setup';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

// All admin routes require authentication
router.use(authenticateToken);

// Helper: require admin role
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: () => void) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.post('/dlq/replay', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId, queueName = 'whatsapp-messages' } = req.body;
    const queue = new Queue(queueName, { connection: redisConnection });

    if (jobId) {
      // Replay specific job
      const job = await queue.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      await job.retry();
      logger.info({ jobId, queueName }, 'DLQ job replayed');
      return res.json({ message: 'Job replayed', jobId });
    }

    // Replay all failed jobs
    const failed = await queue.getFailed(0, 100);
    let replayed = 0;
    for (const job of failed) {
      await job.retry();
      replayed++;
    }

    logger.info({ count: replayed, queueName }, 'DLQ bulk replay');
    res.json({ message: `Replayed ${replayed} jobs`, count: replayed });
  } catch (err) {
    logger.error({ err }, 'DLQ replay error');
    res.status(500).json({ error: 'Failed to replay jobs' });
  }
});

router.get('/dlq/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { queueName = 'whatsapp-messages' } = req.query;
    const queue = new Queue(queueName as string, { connection: redisConnection });

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    res.json({
      queue: queueName,
      counts: { waiting, active, completed, failed }
    });
  } catch (err) {
    logger.error({ err }, 'DLQ status error');
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

export default router;
