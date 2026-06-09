import { describe, it, expect } from 'vitest';
import { isValidUrl, sanitizeUrl } from '../url';

describe('url utilities', () => {
  describe('isValidUrl', () => {
    it('accepts http and https', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('rejects non-http protocols', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects garbage', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('returns valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('returns null for invalid', () => {
      expect(sanitizeUrl('not a url')).toBeNull();
      expect(sanitizeUrl('')).toBeNull();
    });

    it('trims whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });
  });
});
