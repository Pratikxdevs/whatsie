import { describe, it, expect } from 'vitest';
import { parsePhone, formatPhone, isValidPhone, detectCountry } from '../utils/phone';
import { validateEmail, normalizeEmail } from '../utils/email';
import { sanitizeInput, sanitizeObject } from '../utils/sanitize';
import { isValidUrl, sanitizeUrl } from '../utils/url';
import { getBillingPeriod, formatUTC, isExpired, daysBetween } from '../utils/dates';
import { validateMimeType, validateFileSize, validateBase64Upload } from '../utils/fileUpload';

describe('Phone Utils', () => {
  describe('parsePhone', () => {
    it('parses a valid US number', () => {
      const result = parsePhone('+14155552671');
      expect(result).not.toBeNull();
      expect(result?.country).toBe('US');
      expect(result?.countryCode).toBe('1');
    });

    it('returns null for invalid number', () => {
      expect(parsePhone('not-a-number')).toBeNull();
    });

    it('accepts default country', () => {
      const result = parsePhone('4155552671', 'US');
      expect(result).not.toBeNull();
      expect(result?.number).toBe('+14155552671');
    });
  });

  describe('formatPhone', () => {
    it('formats to international', () => {
      expect(formatPhone('+14155552671')).toBe('+1 415 555 2671');
    });

    it('returns original for invalid', () => {
      expect(formatPhone('abc')).toBe('abc');
    });
  });

  describe('isValidPhone', () => {
    it('returns true for valid numbers', () => {
      expect(isValidPhone('+14155552671')).toBe(true);
      expect(isValidPhone('+442071234567')).toBe(true);
    });

    it('returns false for invalid', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('not-a-number')).toBe(false);
    });
  });

  describe('detectCountry', () => {
    it('detects US from +1', () => {
      expect(detectCountry('+14155552671')).toBe('US');
    });

    it('detects GB from +44', () => {
      expect(detectCountry('+442071234567')).toBe('GB');
    });

    it('returns null for invalid', () => {
      expect(detectCountry('123')).toBeNull();
    });
  });
});

describe('Email Utils', () => {
  describe('validateEmail', () => {
    it('accepts valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('@no-user.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('normalizeEmail', () => {
    it('lowercases and trims', () => {
      expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
    });
  });
});

describe('Sanitize Utils', () => {
  describe('sanitizeInput', () => {
    it('strips HTML tags', () => {
      expect(sanitizeInput('<b>bold</b>')).toBe('bold');
    });

    it('strips script tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>hello')).toBe('hello');
    });

    it('returns plain text unchanged', () => {
      expect(sanitizeInput('hello world')).toBe('hello world');
    });
  });

  describe('sanitizeObject', () => {
    it('sanitizes string values', () => {
      const result = sanitizeObject({ name: '<b>John</b>', age: 30 });
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
    });
  });
});

describe('URL Utils', () => {
  describe('isValidUrl', () => {
    it('accepts http/https URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('rejects non-http protocols', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('returns valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('returns null for invalid', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull();
    });

    it('strips control characters', () => {
      expect(sanitizeUrl('https://example.com\x00')).toBe('https://example.com');
    });
  });
});

describe('Date Utils', () => {
  describe('getBillingPeriod', () => {
    it('returns period boundaries', () => {
      const date = new Date('2026-05-15');
      const { periodStart, periodEnd } = getBillingPeriod(date);
      expect(periodStart.getUTCMonth()).toBe(4); // May
      expect(periodStart.getUTCDate()).toBe(1);
      expect(periodEnd.getUTCMonth()).toBe(5); // June
      expect(periodEnd.getUTCDate()).toBe(1);
    });
  });

  describe('formatUTC', () => {
    it('returns ISO string', () => {
      const date = new Date('2026-05-15T12:00:00Z');
      expect(formatUTC(date)).toBe('2026-05-15T12:00:00.000Z');
    });
  });

  describe('isExpired', () => {
    it('returns true for past dates', () => {
      expect(isExpired(new Date('2020-01-01'))).toBe(true);
    });

    it('returns false for future dates', () => {
      expect(isExpired(new Date('2099-01-01'))).toBe(false);
    });
  });

  describe('daysBetween', () => {
    it('calculates days correctly', () => {
      const a = new Date('2026-01-01');
      const b = new Date('2026-01-11');
      expect(daysBetween(a, b)).toBe(10);
    });
  });
});

describe('File Upload Utils', () => {
  describe('validateMimeType', () => {
    it('accepts allowed types', () => {
      expect(validateMimeType('image/jpeg')).toBe(true);
      expect(validateMimeType('application/pdf')).toBe(true);
    });

    it('rejects disallowed types', () => {
      expect(validateMimeType('application/exe')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('accepts valid sizes', () => {
      expect(validateFileSize(1024)).toBe(true);
    });

    it('rejects zero size', () => {
      expect(validateFileSize(0)).toBe(false);
    });

    it('rejects oversized', () => {
      expect(validateFileSize(50 * 1024 * 1024)).toBe(false);
    });
  });

  describe('validateBase64Upload', () => {
    it('validates a proper data URI', () => {
      // Small valid base64 image
      const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
      const result = validateBase64Upload(dataUri);
      expect(result.valid).toBe(true);
    });

    it('rejects invalid format', () => {
      expect(validateBase64Upload('not-base64').valid).toBe(false);
    });

    it('rejects disallowed MIME', () => {
      const dataUri = 'data:application/exe;base64,AAAA';
      expect(validateBase64Upload(dataUri).valid).toBe(false);
    });
  });
});
