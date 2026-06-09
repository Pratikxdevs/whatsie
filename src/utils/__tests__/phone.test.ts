import { describe, it, expect } from 'vitest';
import { parsePhone, isValidPhone, formatPhone, detectCountry, getCountryCode } from '../phone';

describe('phone utilities', () => {
  describe('parsePhone', () => {
    it('parses a valid US number with country code', () => {
      const result = parsePhone('+14155552671');
      expect(result).not.toBeNull();
      expect(result!.number).toBe('+14155552671');
      expect(result!.country).toBe('US');
    });

    it('parses a number with default country', () => {
      const result = parsePhone('4155552671', 'US');
      expect(result).not.toBeNull();
      expect(result!.number).toBe('+14155552671');
    });

    it('returns null for empty string', () => {
      expect(parsePhone('')).toBeNull();
    });

    it('returns null for garbage input', () => {
      expect(parsePhone('not-a-phone')).toBeNull();
    });

    it('handles international numbers', () => {
      const result = parsePhone('+442071234567');
      expect(result).not.toBeNull();
      expect(result!.country).toBe('GB');
    });
  });

  describe('isValidPhone', () => {
    it('returns true for valid numbers', () => {
      expect(isValidPhone('+14155552671')).toBe(true);
    });

    it('returns false for invalid numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('formatPhone', () => {
    it('formats to international', () => {
      const result = formatPhone('+14155552671');
      expect(result).toContain('415');
    });

    it('returns original input for invalid', () => {
      expect(formatPhone('abc')).toBe('abc');
    });
  });

  describe('detectCountry', () => {
    it('detects US', () => {
      expect(detectCountry('+14155552671')).toBe('US');
    });

    it('detects GB', () => {
      expect(detectCountry('+442071234567')).toBe('GB');
    });

    it('returns null for invalid', () => {
      expect(detectCountry('123')).toBeNull();
    });
  });

  describe('getCountryCode', () => {
    it('returns calling code for country', () => {
      expect(getCountryCode('US')).toBe('1');
      expect(getCountryCode('GB')).toBe('44');
    });
  });
});
