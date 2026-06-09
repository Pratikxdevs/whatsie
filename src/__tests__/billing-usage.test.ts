import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from './setup';

vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { recordBillingUsage, recordAiUsage } from '../billing/recordUsage';

describe('recordBillingUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.billingUsage.upsert.mockResolvedValue({});
    mockPrisma.aiLog.create.mockResolvedValue({});
  });

  it('upserts billing usage with correct period dates', async () => {
    await recordBillingUsage('tenant-1', 'messages_sent', 5);

    expect(mockPrisma.billingUsage.upsert).toHaveBeenCalledTimes(1);

    const call = mockPrisma.billingUsage.upsert.mock.calls[0][0];
    expect(call.where.tenantId_metric_periodStart).toEqual({
      tenantId: 'tenant-1',
      metric: 'messages_sent',
      periodStart: expect.any(Date),
    });
    expect(call.create.tenantId).toBe('tenant-1');
    expect(call.create.metric).toBe('messages_sent');
    expect(call.create.quantity).toBe(BigInt(5));
    expect(call.create.periodStart).toBeInstanceOf(Date);
    expect(call.create.periodEnd).toBeInstanceOf(Date);
    // periodStart should be first day of current month
    expect(call.create.periodStart.getUTCDate()).toBe(1);
    expect(call.update.quantity).toEqual({ increment: BigInt(5) });
  });

  it('increments quantity on upsert', async () => {
    await recordBillingUsage('tenant-2', 'ai_tokens', 100);

    const call = mockPrisma.billingUsage.upsert.mock.calls[0][0];
    expect(call.update.quantity).toEqual({ increment: BigInt(100) });
  });

  it('does not throw on prisma error (billing failures are swallowed)', async () => {
    mockPrisma.billingUsage.upsert.mockRejectedValueOnce(new Error('DB down'));

    await expect(recordBillingUsage('tenant-1', 'messages', 1)).resolves.toBeUndefined();
  });
});

describe('recordAiUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.aiLog.create.mockResolvedValue({});
    mockPrisma.billingUsage.upsert.mockResolvedValue({});
  });

  it('creates an AiLog entry', async () => {
    await recordAiUsage('tenant-1', 'gpt-4', 100, 200);

    expect(mockPrisma.aiLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 200,
      },
    });
  });

  it('calls recordBillingUsage with total ai_tokens', async () => {
    await recordAiUsage('tenant-1', 'gpt-4', 100, 200);

    expect(mockPrisma.billingUsage.upsert).toHaveBeenCalledTimes(1);
    const call = mockPrisma.billingUsage.upsert.mock.calls[0][0];
    expect(call.create.metric).toBe('ai_tokens');
    expect(call.create.quantity).toBe(BigInt(300));
    expect(call.update.quantity).toEqual({ increment: BigInt(300) });
  });

  it('does not throw on prisma error', async () => {
    mockPrisma.aiLog.create.mockRejectedValueOnce(new Error('DB error'));

    await expect(recordAiUsage('tenant-1', 'gpt-4', 10, 20)).resolves.toBeUndefined();
  });
});
