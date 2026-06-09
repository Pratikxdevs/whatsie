import { describe, it, expect } from 'vitest';
import { createTestTenant, createTestUser, createTestApiKey, generateTestToken } from './helpers';

describe('Test Infrastructure', () => {
  it('vitest runs successfully', () => {
    expect(true).toBe(true);
  });

  it('test helpers create valid objects', () => {
    const tenant = createTestTenant();
    expect(tenant.id).toBeTruthy();
    expect(tenant.status).toBe('active');

    const user = createTestUser();
    expect(user.email).toBe('test@example.com');
    expect(user.passwordHash).toBeTruthy();

    const apiKey = createTestApiKey();
    expect(apiKey.raw).toMatch(/^sk_test_/);
    expect(apiKey.hash).toBeTruthy();

    const token = generateTestToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('mocks are available', async () => {
    const { prisma } = await import('../db/prisma');
    expect(prisma.tenant.findFirst).toBeDefined();
    expect(prisma.user.create).toBeDefined();
  });
});
