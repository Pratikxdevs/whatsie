import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Validate REDIS_URL from Env
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// BullMQ expects a specific subset of options, casting to any resolves the strict type conflict
export const redisConnection: any = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

// Create the Queue
export const whatsappQueue = new Queue('whatsapp-messages', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 min backoff
    },
    removeOnComplete: {
      age: 24 * 3600, // keep 24 hours
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep 7 days
    }
  }
});


