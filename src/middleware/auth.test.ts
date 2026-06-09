import express, { Request, Response } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthenticatedRequest } from './auth';
import { mockPrisma } from '../__tests__/setup';
import { createTestApiKey, createTestTenant, generateTestToken } from '../__tests__/helpers';

const tenant = createTestTenant();
const apiKey = createTestApiKey(tenant.id);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(authenticateToken);
  app.get('/test', (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    res.json({ user: authReq.user });
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authenticateToken', () => {
  it('rejects request without token or API key', async () => {
    const app = createApp();
    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/token|API-KEY/i);
  });

  it('rejects request with invalid JWT', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Invalid or expired access token');
  });

  it('rejects request with expired JWT', async () => {
    const expiredToken = jwt.sign(
      { id: 'user-1', tenantId: tenant.id, role: 'admin' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1s' }
    );
    const app = createApp();
    const res = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Invalid or expired access token');
  });

  it('accepts valid JWT and populates req.user', async () => {
    const token = generateTestToken();
    const app = createApp();
    const res = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.tenantId).toBe(tenant.id);
    expect(res.body.user.role).toBe('admin');
  });

  it('resolves tenant from API key via ApiKey table', async () => {
    (mockPrisma.apiKey.findFirst as any).mockResolvedValueOnce({
      ...apiKey.record,
      tenant,
    });
    const app = createApp();
    const res = await request(app)
      .get('/test')
      .set('X-API-KEY', apiKey.raw);
    expect(res.status).toBe(200);
    expect(res.body.user.tenantId).toBe(tenant.id);
    expect(res.body.user.id).toBe('api-key-user');
    expect(res.body.user.role).toBe('admin');
  });

  it('rejects API key not found in database', async () => {
    (mockPrisma.apiKey.findFirst as any).mockResolvedValueOnce(null);
    const app = createApp();
    const res = await request(app)
      .get('/test')
      .set('X-API-KEY', 'sk_nonexistent_key');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid API Key');
  });
});
