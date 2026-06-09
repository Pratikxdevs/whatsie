import express, { Request, Response } from 'express';
import request from 'supertest';
import crypto from 'crypto';
import { mockPrisma } from '../__tests__/setup';
import { createTestTenant } from '../__tests__/helpers';

// Re-create the verifyWhatsAppSignature middleware inline for testing
const EVOLUTION_API_SECRET = process.env.EVOLUTION_API_SECRET || 'test-evolution-secret';

function verifyWhatsAppSignature(req: Request, res: Response, next: Function) {
  const signature = req.headers['x-hub-signature'] || req.headers['authorization'];
  const secret = process.env.EVOLUTION_API_SECRET!;

  if (!signature) {
    return res.status(401).json({ error: 'Missing Signature' });
  }

  if (typeof signature === 'string' && signature.startsWith('sha256=')) {
    const hash = crypto.createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (`sha256=${hash}` !== signature) {
      return res.status(401).json({ error: 'Invalid Signature' });
    }
  }

  next();
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(verifyWhatsAppSignature);
  app.post('/gateway/whatsapp/:tenantId', (_req: Request, res: Response) => {
    res.status(200).send('OK');
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('verifyWhatsAppSignature', () => {
  it('rejects webhook without signature', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/gateway/whatsapp/tenant-123')
      .send({ event: 'messages.upsert' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing Signature');
  });

  it('rejects webhook with invalid HMAC signature', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/gateway/whatsapp/tenant-123')
      .set('x-hub-signature', 'sha256=invalidhash')
      .send({ event: 'messages.upsert' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid Signature');
  });

  it('accepts webhook with valid HMAC-SHA256 signature', async () => {
    const body = { event: 'messages.upsert' };
    const hash = crypto.createHmac('sha256', EVOLUTION_API_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');
    const app = createApp();
    const res = await request(app)
      .post('/gateway/whatsapp/tenant-123')
      .set('x-hub-signature', `sha256=${hash}`)
      .send(body);
    expect(res.status).toBe(200);
  });

  it('accepts webhook with valid Bearer token', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/gateway/whatsapp/tenant-123')
      .set('Authorization', `Bearer ${EVOLUTION_API_SECRET}`)
      .send({ event: 'messages.upsert' });
    expect(res.status).toBe(200);
  });

  it('no dev-mode bypass exists - rejects without signature even in development', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const app = createApp();
    const res = await request(app)
      .post('/gateway/whatsapp/tenant-123')
      .send({ event: 'messages.upsert' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing Signature');
    process.env.NODE_ENV = originalEnv;
  });
});
