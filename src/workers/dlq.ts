import { QueueEvents } from 'bullmq';
import { redisConnection } from '../queue/setup';
import { logger } from '../config/logger';
import { io } from '../index';

/**
 * Monitors the 'whatsapp-messages' queue for completely failed jobs.
 * These jobs have exhausted their 5 retry attempts (with exponential backoff)
 * and have now entered the Dead Letter Queue state.
 */
export const whatsappQueueEvents = new QueueEvents('whatsapp-messages', {
  connection: redisConnection
});

whatsappQueueEvents.on('failed', async ({ jobId, failedReason }) => {
  logger.error({
    module: 'DLQ',
    event: 'job_failed',
    jobId,
    reason: failedReason
  }, `Job ${jobId} failed completely and was moved to DLQ`);

  // Optionally emit a Socket.io alert to an admin dashboard
  io.emit('dlq.alert', {
    queue: 'whatsapp-messages',
    jobId,
    reason: failedReason,
    timestamp: new Date().toISOString()
  });
});

logger.info({ module: 'DLQ' }, 'Dead Letter Queue monitor started for whatsapp-messages');
