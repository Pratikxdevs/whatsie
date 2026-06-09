import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../../schemas/auth';

describe('auth schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid input', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'StrongPass1',
        tenantName: 'Acme Corp',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'StrongPass1',
        tenantName: 'Acme',
      });
      expect(result.success).toBe(false);
    });

    it('rejects weak password', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'weak',
        tenantName: 'Acme',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing tenantName', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'StrongPass1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid input', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'anypassword',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com' });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshSchema', () => {
    it('accepts valid token', () => {
      expect(refreshSchema.safeParse({ refreshToken: 'abc123' }).success).toBe(true);
    });

    it('rejects empty token', () => {
      expect(refreshSchema.safeParse({ refreshToken: '' }).success).toBe(false);
    });
  });

  describe('logoutSchema', () => {
    it('accepts valid token', () => {
      expect(logoutSchema.safeParse({ refreshToken: 'abc123' }).success).toBe(true);
    });
  });
});
