import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../queue/setup', () => ({
  redisConnection: {
    incr: vi.fn().mockResolvedValue(1),
    pexpire: vi.fn().mockResolvedValue(1),
    pttl: vi.fn().mockResolvedValue(0),
  },
}));

import { discordLimiter, discordChannelLimiter, sendWithRateLimit, limiters } from '../rateLimiter/index';

describe('Discord rate limiters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('discordLimiter exists and is a RedisRateLimiter instance', () => {
    expect(discordLimiter).toBeDefined();
    expect(typeof discordLimiter.schedule).toBe('function');
  });

  it('discordChannelLimiter exists', () => {
    expect(discordChannelLimiter).toBeDefined();
    expect(typeof discordChannelLimiter.schedule).toBe('function');
  });

  it('limiters object includes discord and discordChannel', () => {
    expect(limiters).toHaveProperty('discord');
    expect(limiters).toHaveProperty('discordChannel');
  });

  it('sendWithRateLimit discord executes the function', async () => {
    const fn = vi.fn().mockResolvedValue('sent');
    const result = await sendWithRateLimit('discord', fn);

    expect(fn).toHaveBeenCalled();
    expect(result).toBe('sent');
  });

  it('sendWithRateLimit discordChannel executes the function', async () => {
    const fn = vi.fn().mockResolvedValue('sent');
    const result = await sendWithRateLimit('discordChannel', fn);

    expect(fn).toHaveBeenCalled();
    expect(result).toBe('sent');
  });

  it('sendWithRateLimit throws for unknown platform', async () => {
    const fn = vi.fn();

    await expect(
      sendWithRateLimit('nonexistent' as any, fn)
    ).rejects.toThrow('No rate limiter found for platform: nonexistent');

    expect(fn).not.toHaveBeenCalled();
  });
});
