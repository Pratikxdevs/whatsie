import express, { Request, Response } from 'express';
import request from 'supertest';
import crypto from 'crypto';
import { tenantAuthMiddleware, tenantContext } from './tenant';
import { mockPrisma } from '../__tests__/setup';
import { createTestTenant, createTestApiKey } from '../__tests__/helpers';

const tenant = createTestTenant();
const apiKey = createTestApiKey(tenant.id);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(tenantAuthMiddleware);
  app.get('/test', (_req: Request, res: Response) => {
    const store = tenantContext.getStore();
    res.json({ tenantId: store?.tenantId });
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('tenantAuthMiddleware', () => {
  it('rejects request without X-API-KEY header', async () => {
    const app = createApp();
    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('X-API-KEY header is required');
  });

  it('rejects request with invalid API key', async () => {
    (mockPrisma.apiKey.findFirst as any).mockResolvedValueOnce(null);
    const app = createApp();
    const res = await request(app)
      .get('/test')
      .set('X-API-KEY', 'sk_invalid_key');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid API Key');
  });

  it('rejects request when tenant is suspended', async () => {
    const suspendedTenant = createTestTenant({ status: 'suspended' });
    const key = createTestApiKey(suspendedTenant.id);
    (mockPrisma.apiKey.findFirst as any).mockResolvedValueOnce({
      ...key.record,
      tenant: suspendedTenant,
    });
    const app = createApp();
    const res = await request(app)
      .get('/test')
      .set('X-API-KEY', key.raw);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Tenant is suspended or inactive');
  });

  it('accepts request with valid API key', async () => {
    (mockPrisma.apiKey.findFirst as any).mockResolvedValueOnce({
      ...apiKey.record,
      tenant,
    });
    const app = createApp();
    const res = await request(app)
      .get('/test')
      .set('X-API-KEY', apiKey.raw);
    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe(tenant.id);
  });

  it('sets tenant context in AsyncLocalStorage', async () => {
    let capturedTenantId: string | undefined;
    (mockPrisma.apiKey.findFirst as any).mockResolvedValueOnce({
      ...apiKey.record,
      tenant,
    });
    const app = express();
    app.use(express.json());
    app.use(tenantAuthMiddleware);
    app.get('/test', (_req, res) => {
      capturedTenantId = tenantContext.getStore()?.tenantId;
      res.json({ ok: true });
    });
    await request(app)
      .get('/test')
      .set('X-API-KEY', apiKey.raw);
    expect(capturedTenantId).toBe(tenant.id);
  });

  it('computes SHA-256 hash of API key for lookup', async () => {
    const spy = vi.spyOn(crypto, 'createHash');
    (mockPrisma.apiKey.findFirst as any).mockResolvedValueOnce({
      ...apiKey.record,
      tenant,
    });
    const app = createApp();
    await request(app)
      .get('/test')
      .set('X-API-KEY', apiKey.raw);
    expect(spy).toHaveBeenCalledWith('sha256');
    spy.mockRestore();
  });
});
