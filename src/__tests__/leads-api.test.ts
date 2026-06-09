import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from './setup';
import { generateTestToken } from './helpers';

// Mock queue/setup before imports
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
import leadsRouter from '../routes/leads';

const app = express();
app.use(express.json());
app.use('/api/leads', leadsRouter);

describe('Leads API', () => {
  const token = generateTestToken();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/leads', () => {
    it('returns leads with pagination', async () => {
      const mockLeads = [
        { id: 'lead-1', name: 'Alice', status: 'new', phone: '+1234567890' },
        { id: 'lead-2', name: 'Bob', status: 'contacted', phone: '+0987654321' },
      ];
      mockPrisma.lead.findMany.mockResolvedValueOnce(mockLeads);
      mockPrisma.lead.count.mockResolvedValueOnce(2);

      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.leads).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
    });

    it('filters by status and platform', async () => {
      mockPrisma.lead.findMany.mockResolvedValueOnce([]);
      mockPrisma.lead.count.mockResolvedValueOnce(0);

      await request(app)
        .get('/api/leads?status=new&platform=whatsapp')
        .set('Authorization', `Bearer ${token}`);

      const call = mockPrisma.lead.findMany.mock.calls[0][0];
      expect(call.where.status).toBe('new');
      expect(call.where.source).toBe('whatsapp');
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/leads');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/leads/:id', () => {
    it('returns a single lead', async () => {
      const mockLead = {
        id: 'lead-1',
        name: 'Alice',
        status: 'new',
        tenantId: 'tenant-test-uuid-0000-0000-000000000001',
        conversations: [],
        _count: { conversations: 0 },
      };
      mockPrisma.lead.findFirst.mockResolvedValueOnce(mockLead);

      const res = await request(app)
        .get('/api/leads/lead-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.lead.id).toBe('lead-1');
    });

    it('returns 404 for non-existent lead', async () => {
      mockPrisma.lead.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/leads/nonexistent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Lead not found');
    });
  });

  describe('PATCH /api/leads/:id', () => {
    it('updates lead fields', async () => {
      const existing = { id: 'lead-1', tenantId: 'tenant-test-uuid-0000-0000-000000000001' };
      const updated = { id: 'lead-1', name: 'Updated Name', status: 'qualified' };

      mockPrisma.lead.findFirst.mockResolvedValueOnce(existing);
      mockPrisma.lead.update.mockResolvedValueOnce(updated);

      const res = await request(app)
        .patch('/api/leads/lead-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name', status: 'qualified' });

      expect(res.status).toBe(200);
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { name: 'Updated Name', status: 'qualified' },
        include: { _count: { select: { conversations: true } } },
      });
    });

    it('returns 404 when lead does not exist', async () => {
      mockPrisma.lead.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/leads/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nope' });

      expect(res.status).toBe(404);
    });
  });
});
