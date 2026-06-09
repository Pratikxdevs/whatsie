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
import analyticsRouter from '../routes/analytics';

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRouter);

describe('Analytics API', () => {
  const token = generateTestToken();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/analytics/message-volume', () => {
    it('returns message volume array', async () => {
      const mockRows = [
        { date: new Date('2024-01-01'), inbound: BigInt(5), outbound: BigInt(3) },
        { date: new Date('2024-01-02'), inbound: BigInt(10), outbound: BigInt(7) },
      ];
      mockPrisma.$queryRaw.mockResolvedValueOnce(mockRows);

      const res = await request(app)
        .get('/api/analytics/message-volume')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].inbound).toBe(5);
      expect(res.body.data[0].outbound).toBe(3);
    });

    it('accepts days and platform query params', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/analytics/message-volume?days=7&platform=telegram')
        .set('Authorization', `Bearer ${token}`);

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/analytics/conversion-funnel', () => {
    it('returns counts grouped by lead status', async () => {
      mockPrisma.lead.groupBy.mockResolvedValueOnce([
        { status: 'new', _count: 10 },
        { status: 'contacted', _count: 5 },
        { status: 'qualified', _count: 3 },
      ]);

      const res = await request(app)
        .get('/api/analytics/conversion-funnel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.funnel).toHaveLength(3);
      expect(res.body.funnel[0]).toEqual({ status: 'new', count: 10 });
    });
  });

  describe('GET /api/analytics/dashboard-stats', () => {
    it('returns summary stats', async () => {
      mockPrisma.lead.count.mockResolvedValueOnce(50);
      mockPrisma.conversation.count.mockResolvedValueOnce(12);
      mockPrisma.message.count.mockResolvedValueOnce(300);
      mockPrisma.bot.count.mockResolvedValueOnce(2);

      const res = await request(app)
        .get('/api/analytics/dashboard-stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalLeads: 50,
        openConversations: 12,
        messagesThisMonth: 300,
        activeBots: 2,
        conversionRate: 0,
      });
    });
  });
});
