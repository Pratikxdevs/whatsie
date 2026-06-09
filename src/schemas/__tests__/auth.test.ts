import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../auth';

describe('auth schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid input', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Password1',
        tenantName: 'My Company',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'not-email',
        password: 'Password1',
        tenantName: 'My Company',
      });
      expect(result.success).toBe(false);
    });

    it('rejects weak password (no uppercase)', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'password1',
        tenantName: 'My Company',
      });
      expect(result.success).toBe(false);
    });

    it('rejects weak password (no number)', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Password',
        tenantName: 'My Company',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Pass1',
        tenantName: 'My Company',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing tenantName', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Password1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects tenantName that is too short', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Password1',
        tenantName: 'A',
      });
      expect(result.success).toBe(false);
    });

    it('allows optional name', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Password1',
        tenantName: 'My Company',
        name: 'John',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid input', () => {
      expect(loginSchema.safeParse({ email: 'user@example.com', password: 'pass' }).success).toBe(true);
    });

    it('rejects missing fields', () => {
      expect(loginSchema.safeParse({ email: 'user@example.com' }).success).toBe(false);
      expect(loginSchema.safeParse({ password: 'pass' }).success).toBe(false);
    });

    it('rejects invalid email', () => {
      expect(loginSchema.safeParse({ email: 'not-email', password: 'pass' }).success).toBe(false);
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
