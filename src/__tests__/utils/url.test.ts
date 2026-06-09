import { describe, it, expect } from 'vitest';
import { isValidUrl, sanitizeUrl } from '../../utils/url';

describe('url utils', () => {
  describe('isValidUrl', () => {
    it('accepts valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://sub.domain.com/path?q=1')).toBe(true);
    });

    it('rejects invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('returns valid URLs as-is', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('strips control characters', () => {
      expect(sanitizeUrl('https://example.com\x00')).toBe('https://example.com');
    });

    it('returns null for invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull();
    });

    it('trims whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });
  });
});
