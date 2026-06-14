import { prisma } from '../db/prisma';
import { logger } from '../config/logger';

export async function detectStalledConversations() {
  try {
    const thresholdHours = Number(process.env.STALLED_CONV_THRESHOLD_HOURS) || 12;
    const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    const stalledConversations = await prisma.conversation.findMany({
      where: {
        status: {
          in: ['active', 'ongoing', 'open']
        },
        lastMessageAt: {
          lt: cutoff
        }
      }
    });

    if (stalledConversations.length > 0) {
      const ids = stalledConversations.map(c => c.id);
      
      await prisma.conversation.updateMany({
        where: { id: { in: ids } },
        data: { status: 'stalled' }
      });

      logger.info({ count: ids.length }, 'Marked conversations as stalled');
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to detect stalled conversations');
  }
}

let jobInterval: NodeJS.Timeout | null = null;

export function startStalledConversationJob() {
  if (jobInterval) return;
  // L-003: configurable via env — defaults: 1h interval, 12h threshold
  const intervalMs = Number(process.env.STALLED_CONV_INTERVAL_MS) || 60 * 60 * 1000;
  jobInterval = setInterval(detectStalledConversations, intervalMs);
  logger.info({ intervalMs }, 'Stalled conversations job started');
}

export function stopStalledConversationJob() {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
  }
}
