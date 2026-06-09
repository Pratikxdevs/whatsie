import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkQuota } from './quota';
import { mockPrisma } from '../__tests__/setup';

// Mock the redis connection used by quota
vi.mock('../queue/setup', () => ({
  redisConnection: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
}));

import { redisConnection } from '../queue/setup';

const mockReq = (tenantId?: string) => ({
  user: tenantId ? { tenantId, role: 'admin' } : undefined,
  params: {},
} as any);

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('checkQuota middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.tenant.findUnique.mockResolvedValue({ plan: 'free' });
  });

  it('allows requests under quota limit', async () => {
    (redisConnection.incr as any).mockResolvedValue(1);
    const req = mockReq('tenant-1');
    const res = mockRes();
    const next = vi.fn();

    await checkQuota(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(429);
  });

  it('returns 429 when quota exceeded', async () => {
    (redisConnection.incr as any).mockResolvedValue(101);
    const req = mockReq('tenant-1');
    const res = mockRes();
    const next = vi.fn();

    await checkQuota(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Daily quota exceeded' })
    );
  });

  it('increments Redis counter', async () => {
    (redisConnection.incr as any).mockResolvedValue(5);
    const req = mockReq('tenant-1');
    const res = mockRes();
    const next = vi.fn();

    await checkQuota(req, res, next);

    expect(redisConnection.incr).toHaveBeenCalledWith(
      expect.stringContaining('quota:tenant-1:')
    );
  });

  it('sets expiry on first increment', async () => {
    (redisConnection.incr as any).mockResolvedValue(1);
    const req = mockReq('tenant-1');
    const res = mockRes();
    const next = vi.fn();

    await checkQuota(req, res, next);

    expect(redisConnection.expire).toHaveBeenCalledWith(
      expect.stringContaining('quota:'),
      86400
    );
  });

  it('allows request if no tenantId', async () => {
    const req = mockReq(undefined);
    const res = mockRes();
    const next = vi.fn();

    await checkQuota(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('allows request on Redis error (graceful fallback)', async () => {
    (redisConnection.incr as any).mockRejectedValue(new Error('Redis down'));
    const req = mockReq('tenant-1');
    const res = mockRes();
    const next = vi.fn();

    await checkQuota(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('enforces pro plan limits', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ plan: 'pro' });
    (redisConnection.incr as any).mockResolvedValue(1001);
    const req = mockReq('tenant-1');
    const res = mockRes();
    const next = vi.fn();

    await checkQuota(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
  });
});
