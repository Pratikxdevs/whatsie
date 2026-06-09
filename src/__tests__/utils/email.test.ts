import { describe, it, expect } from 'vitest';
import { validateEmail, normalizeEmail } from '../../utils/email';

describe('email utils', () => {
  describe('validateEmail', () => {
    it('accepts valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test+tag@sub.domain.com')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('@no-user.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('normalizeEmail', () => {
    it('lowercases and trims', () => {
      expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    });

    it('handles already normalized', () => {
      expect(normalizeEmail('user@example.com')).toBe('user@example.com');
    });
  });
});
