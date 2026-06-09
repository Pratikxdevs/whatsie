import { describe, it, expect } from 'vitest';
import { validateEmail, normalizeEmail } from '../email';

describe('email utilities', () => {
  describe('validateEmail', () => {
    it('validates correct emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
    });
  });

  describe('normalizeEmail', () => {
    it('lowercases and trims', () => {
      expect(normalizeEmail('  User@EXAMPLE.com  ')).toBe('user@example.com');
    });
  });
});
