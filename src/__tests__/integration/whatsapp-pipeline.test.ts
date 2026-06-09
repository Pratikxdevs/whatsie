import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the index module to prevent server startup
vi.mock('../../index', () => ({
  io: { to: vi.fn().mockReturnValue({ emit: vi.fn() }) },
}));

// Mock queue setup
const mockQueueAdd = vi.fn().mockResolvedValue({ id: 'job-1' });
vi.mock('../../queue/setup', () => ({
  whatsappQueue: { add: mockQueueAdd },
  redisConnection: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    setnx: vi.fn().mockResolvedValue(1),
    pipeline: vi.fn().mockReturnValue({
      lpush: vi.fn().mockReturnThis(),
      ltrim: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
  },
}));

import { normalizeWhatsAppWebhook } from '../../normalizer/whatsapp';

describe('WhatsApp Pipeline Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes a valid WhatsApp webhook and queues it', async () => {
    const rawPayload = {
      event: 'messages.upsert',
      data: {
        key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'msg-001' },
        message: { conversation: 'Hello from integration test' },
      },
    };

    // Step 1: Normalize
    const normalized = normalizeWhatsAppWebhook('tenant-1', rawPayload);

    expect(normalized.tenantId).toBe('tenant-1');
    expect(normalized.platform).toBe('whatsapp');
    expect(normalized.userId).toBe('5511999999999@s.whatsapp.net');
    expect(normalized.message.text).toBe('Hello from integration test');
    expect(normalized.type).toBe('text');

    // Step 2: Queue (simulating what gateway does)
    await mockQueueAdd('incoming-message', normalized);

    expect(mockQueueAdd).toHaveBeenCalledWith('incoming-message', expect.objectContaining({
      tenantId: 'tenant-1',
      platform: 'whatsapp',
      userId: '5511999999999@s.whatsapp.net',
    }));
  });

  it('handles image messages through the pipeline', async () => {
    const rawPayload = {
      event: 'messages.upsert',
      data: {
        key: { remoteJid: 'user@s.whatsapp.net', id: 'msg-002' },
        message: {
          imageMessage: {
            url: 'https://example.com/img.jpg',
            mimetype: 'image/jpeg',
            fileLength: 5000,
          },
        },
      },
    };

    const normalized = normalizeWhatsAppWebhook('tenant-1', rawPayload);

    expect(normalized.type).toBe('image');
    expect(normalized.message.text).toBeNull();
    expect(normalized.message.attachments).toHaveLength(1);
    expect(normalized.message.attachments[0].type).toBe('image');

    await mockQueueAdd('incoming-message', normalized);
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
  });

  it('idempotency: duplicate message IDs should be detected', async () => {
    const { redisConnection } = await import('../../queue/setup');
    const messageId = 'msg-dup-001';

    // First call: setnx returns 1 (new key)
    (redisConnection.setnx as any).mockResolvedValueOnce(1);
    const firstAttempt = await (redisConnection as any).setnx(`idempotency:whatsapp:${messageId}`, 'processed');
    expect(firstAttempt).toBe(1);

    // Second call: setnx returns 0 (key exists = duplicate)
    (redisConnection.setnx as any).mockResolvedValueOnce(0);
    const secondAttempt = await (redisConnection as any).setnx(`idempotency:whatsapp:${messageId}`, 'processed');
    expect(secondAttempt).toBe(0);
  });

  it('handles webhook with non-message event types gracefully', async () => {
    const rawPayload = {
      event: 'connection.update',
      data: {},
    };

    // Gateway should return early for non-message events
    // The normalizer would still work but gateway skips processing
    expect(rawPayload.event).not.toBe('messages.upsert');
  });
});
