import { redisConnection } from '../queue/setup';

class RedisRateLimiter {
  private platform: string;
  private minTimeMs: number;

  constructor(platform: string, minTimeMs: number) {
    this.platform = platform;
    this.minTimeMs = minTimeMs;
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    const key = `ratelimit:outbound:${this.platform}`;
    
    // Simple distributed lock/delay based on Redis INCR
    const current = await redisConnection.incr(key);
    if (current === 1) {
      await redisConnection.pexpire(key, this.minTimeMs);
    } else {
      const ttl = await redisConnection.pttl(key);
      if (ttl > 0) {
        // Delay this execution by the TTL
        await new Promise(resolve => setTimeout(resolve, ttl));
      }
    }
    
    // Execute task
    return fn();
  }
}

// WhatsApp: 1 per second (1000ms)
export const whatsappLimiter = new RedisRateLimiter('whatsapp', 1000);

export const limiters = {
  whatsapp: whatsappLimiter,
};

export async function sendWithRateLimit<T>(platform: keyof typeof limiters, sendFn: () => Promise<T>): Promise<T> {
  const limiter = limiters[platform];
  if (!limiter) {
    throw new Error(`No rate limiter found for platform: ${platform}`);
  }
  return limiter.schedule(sendFn);
}
