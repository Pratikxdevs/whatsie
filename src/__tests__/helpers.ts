import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';

export function createTestTenant(overrides: Record<string, any> = {}) {
  return {
    id: 'tenant-test-uuid-0000-0000-000000000001',
    name: 'Test Tenant',
    plan: 'free',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-test-uuid-0000-0000-000000000001',
    tenantId: 'tenant-test-uuid-0000-0000-000000000001',
    email: 'test@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12', // bcrypt hash of 'password123'
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestApiKey(tenantId?: string) {
  const raw = 'sk_test_' + crypto.randomBytes(24).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return {
    raw,
    hash,
    record: {
      id: 'apikey-test-uuid-0000-0000-000000000001',
      tenantId: tenantId || 'tenant-test-uuid-0000-0000-000000000001',
      keyHash: hash,
      name: 'Test API Key',
      createdAt: new Date(),
    },
  };
}

export function generateTestToken(payload?: Record<string, any>) {
  return jwt.sign(
    {
      id: 'user-test-uuid-0000-0000-000000000001',
      tenantId: 'tenant-test-uuid-0000-0000-000000000001',
      role: 'admin',
      email: 'test@example.com',
      ...payload,
    },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}
