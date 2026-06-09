import { describe, it, expect } from 'vitest';
import { parsePhone, formatPhone, isValidPhone, detectCountry, getCountryCode } from '../../utils/phone';

describe('phone utils', () => {
  describe('isValidPhone', () => {
    it('validates US numbers', () => {
      expect(isValidPhone('+14155552671')).toBe(true);
      expect(isValidPhone('4155552671', 'US')).toBe(true);
    });

    it('validates UK numbers', () => {
      expect(isValidPhone('+447911123456')).toBe(true);
    });

    it('rejects invalid numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('not-a-number')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('parsePhone', () => {
    it('parses a valid US number', () => {
      const result = parsePhone('+14155552671');
      expect(result).not.toBeNull();
      expect(result!.country).toBe('US');
      expect(result!.countryCode).toBe('1');
      expect(result!.number).toBe('+14155552671');
    });

    it('returns null for invalid numbers', () => {
      expect(parsePhone('123')).toBeNull();
      expect(parsePhone('not-a-number')).toBeNull();
    });
  });

  describe('formatPhone', () => {
    it('formats a US number internationally', () => {
      expect(formatPhone('+14155552671')).toBe('+1 415 555 2671');
    });

    it('returns original input for invalid numbers', () => {
      expect(formatPhone('not-a-number')).toBe('not-a-number');
    });
  });

  describe('detectCountry', () => {
    it('detects US from phone number', () => {
      expect(detectCountry('+14155552671')).toBe('US');
    });

    it('detects UK from phone number', () => {
      expect(detectCountry('+442071234567')).toBe('GB');
    });

    it('returns null for invalid input', () => {
      expect(detectCountry('123')).toBeNull();
    });
  });

  describe('getCountryCode', () => {
    it('returns correct calling code for US', () => {
      expect(getCountryCode('US')).toBe('1');
    });

    it('returns correct calling code for GB', () => {
      expect(getCountryCode('GB')).toBe('44');
    });
  });
});
