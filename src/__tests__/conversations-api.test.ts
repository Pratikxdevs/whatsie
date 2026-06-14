import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from './setup';
import { generateTestToken } from './helpers';

vi.mock('../queue/setup', () => ({
  redisConnection: {},
}));

vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import request from 'supertest';
import express from 'express';
import conversationsRouter from '../routes/conversations';

const app = express();
app.use(express.json());
app.use('/api/conversations', conversationsRouter);

describe('Conversations API', () => {
  const token = generateTestToken();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/conversations', () => {
    it('returns conversations with pagination', async () => {
      const mockConversations = [
        { id: 'conv-1', platform: 'whatsapp', status: 'open', leadId: 'lead-1' },
        { id: 'conv-2', platform: 'whatsapp', status: 'closed', leadId: 'lead-2' },
      ];
      mockPrisma.conversation.findMany.mockResolvedValueOnce(mockConversations);
      mockPrisma.conversation.count.mockResolvedValueOnce(2);

      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.conversations).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('filters by status and platform', async () => {
      mockPrisma.conversation.findMany.mockResolvedValueOnce([]);
      mockPrisma.conversation.count.mockResolvedValueOnce(0);

      await request(app)
        .get('/api/conversations?status=open&platform=whatsapp')
        .set('Authorization', `Bearer ${token}`);

      const call = mockPrisma.conversation.findMany.mock.calls[0][0];
      expect(call.where.status).toBe('open');
      expect(call.where.platform).toBe('whatsapp');
    });
  });

  describe('GET /api/conversations/:id/messages', () => {
    it('returns messages sorted by createdAt ascending', async () => {
      const mockConversation = { id: 'conv-1', tenantId: 'tenant-test-uuid-0000-0000-000000000001' };
      const mockMessages = [
        { id: 'msg-1', content: 'First', createdAt: '2024-01-01T00:00:00Z' },
        { id: 'msg-2', content: 'Second', createdAt: '2024-01-01T00:01:00Z' },
      ];

      mockPrisma.conversation.findFirst.mockResolvedValueOnce(mockConversation);
      mockPrisma.message.findMany.mockResolvedValueOnce(mockMessages);
      mockPrisma.message.count.mockResolvedValueOnce(2);

      const res = await request(app)
        .get('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.messages[0].content).toBe('First');

      // Verify orderBy is createdAt asc
      const call = mockPrisma.message.findMany.mock.calls[0][0];
      expect(call.orderBy).toEqual({ createdAt: 'asc' });
    });

    it('returns 404 for non-existent conversation', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/conversations/nonexistent/messages')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Conversation not found');
    });
  });
});
