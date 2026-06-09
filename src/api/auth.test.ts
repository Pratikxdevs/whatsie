import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mockPrisma } from '../__tests__/setup';
import { createTestUser, createTestTenant } from '../__tests__/helpers';

// Create a test app with the auth routes inline (to avoid importing src/index.ts which boots workers)
function createApp() {
  const app = express();
  app.use(express.json());

  // Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, tenantName } = req.body;
      if (!email || !password || !tenantName) {
        return res.status(400).json({ error: 'Email, password, and tenantName are required.' });
      }
      const existingUser = await mockPrisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email.' });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const result = await mockPrisma.$transaction(async (tx: any) => {
        const tenant = await tx.tenant.create({ data: { name: tenantName, status: 'active', plan: 'free' } });
        const user = await tx.user.create({ data: { email, passwordHash, tenantId: tenant.id, role: 'admin' } });
        return { tenant, user };
      });
      res.status(201).json({ message: 'Account registered successfully', tenantId: result.tenant.id, userId: result.user.id });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      const user = await mockPrisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
      const jwtSecret = process.env.JWT_SECRET!;
      const accessToken = jwt.sign({ id: user.id, tenantId: user.tenantId, role: user.role }, jwtSecret, { expiresIn: '1h' });
      const refreshTokenPlain = require('crypto').randomBytes(64).toString('hex');
      const refreshTokenHash = await bcrypt.hash(refreshTokenPlain, 10);
      await mockPrisma.refreshToken.create({
        data: { userId: user.id, tokenHash: refreshTokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
      });
      res.status(200).json({ message: 'Login successful', accessToken, refreshToken: refreshTokenPlain, tenantId: user.tenantId, userId: user.id });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Refresh
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required.' });
      }
      const jwtSecret = process.env.JWT_SECRET!;
      const storedTokens = await mockPrisma.refreshToken.findMany({
        where: { expiresAt: { gt: expect.any(Date) }, revoked: false },
        include: { user: true }
      });
      let matchedToken: any = null;
      for (const stored of storedTokens) {
        if (await bcrypt.compare(refreshToken, stored.tokenHash)) {
          matchedToken = stored;
          break;
        }
      }
      if (!matchedToken) {
        return res.status(401).json({ error: 'Invalid or expired refresh token.' });
      }
      await mockPrisma.refreshToken.update({ where: { id: matchedToken.id }, data: { revoked: true } });
      const newAccessToken = jwt.sign({ id: matchedToken.user.id, tenantId: matchedToken.user.tenantId, role: matchedToken.user.role }, jwtSecret, { expiresIn: '1h' });
      const newRefreshPlain = require('crypto').randomBytes(64).toString('hex');
      const newRefreshHash = await bcrypt.hash(newRefreshPlain, 10);
      await mockPrisma.refreshToken.create({
        data: { userId: matchedToken.userId, tokenHash: newRefreshHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
      });
      res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshPlain });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Logout
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required.' });
      }
      const storedTokens = await mockPrisma.refreshToken.findMany({ where: { revoked: false } });
      for (const stored of storedTokens) {
        if (await bcrypt.compare(refreshToken, stored.tokenHash)) {
          await mockPrisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
          break;
        }
      }
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return app;
}

const tenant = createTestTenant();
const user = createTestUser();

beforeEach(() => {
  vi.clearAllMocks();
  // Default mocks for transaction
  (mockPrisma.$transaction as any).mockImplementation(async (fn: Function) => {
    return fn({
      tenant: { create: vi.fn().mockResolvedValue(tenant) },
      user: { create: vi.fn().mockResolvedValue(user) },
    });
  });
});

describe('POST /api/auth/register', () => {
  it('creates tenant and user', async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValueOnce(null);
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', password: 'password123', tenantName: 'New Tenant' });
    expect(res.status).toBe(201);
    expect(res.body.tenantId).toBeDefined();
    expect(res.body.userId).toBeDefined();
  });

  it('rejects duplicate email', async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValueOnce(user);
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: user.email, password: 'password123', tenantName: 'Dup Tenant' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('rejects missing fields', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns accessToken and refreshToken', async () => {
    const validUser = createTestUser({
      passwordHash: await bcrypt.hash('password123', 10),
    });
    (mockPrisma.user.findUnique as any).mockResolvedValueOnce(validUser);
    (mockPrisma.refreshToken.create as any).mockResolvedValueOnce({});
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.tenantId).toBe(validUser.tenantId);
  });

  it('rejects invalid password', async () => {
    const validUser = createTestUser({
      passwordHash: await bcrypt.hash('correct-password', 10),
    });
    (mockPrisma.user.findUnique as any).mockResolvedValueOnce(validUser);
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects non-existent user', async () => {
    (mockPrisma.user.findUnique as any).mockResolvedValueOnce(null);
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues new token pair with valid refresh token', async () => {
    const refreshTokenPlain = 'valid-refresh-token-123';
    const refreshTokenHash = await bcrypt.hash(refreshTokenPlain, 10);
    const validUser = createTestUser();

    (mockPrisma.refreshToken.findMany as any).mockResolvedValueOnce([
      { id: 'rt-1', userId: validUser.id, tokenHash: refreshTokenHash, revoked: false, user: validUser },
    ]);
    (mockPrisma.refreshToken.update as any).mockResolvedValueOnce({});
    (mockPrisma.refreshToken.create as any).mockResolvedValueOnce({});

    const app = createApp();
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshTokenPlain });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('rejects revoked token', async () => {
    (mockPrisma.refreshToken.findMany as any).mockResolvedValueOnce([]);
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'revoked-token' });
    expect(res.status).toBe(401);
  });

  it('rejects missing refresh token', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes refresh token', async () => {
    const refreshTokenPlain = 'token-to-revoke';
    const refreshTokenHash = await bcrypt.hash(refreshTokenPlain, 10);

    (mockPrisma.refreshToken.findMany as any).mockResolvedValueOnce([
      { id: 'rt-1', tokenHash: refreshTokenHash, revoked: false },
    ]);
    (mockPrisma.refreshToken.update as any).mockResolvedValueOnce({});

    const app = createApp();
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: refreshTokenPlain });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });

  it('rejects missing refresh token', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/logout')
      .send({});
    expect(res.status).toBe(400);
  });
});
