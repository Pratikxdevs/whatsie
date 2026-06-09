import { describe, it, expect } from 'vitest';
import { getBillingPeriod, formatUTC, isExpired, daysBetween } from '../../utils/dates';

describe('dates utils', () => {
  describe('getBillingPeriod', () => {
    it('returns first-of-month boundaries', () => {
      const date = new Date('2026-05-15T12:00:00Z');
      const { periodStart, periodEnd } = getBillingPeriod(date);
      expect(periodStart.toISOString()).toBe('2026-05-01T00:00:00.000Z');
      expect(periodEnd.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    });

    it('handles December rollover', () => {
      const date = new Date('2026-12-25T00:00:00Z');
      const { periodStart, periodEnd } = getBillingPeriod(date);
      expect(periodStart.toISOString()).toBe('2026-12-01T00:00:00.000Z');
      expect(periodEnd.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    });
  });

  describe('formatUTC', () => {
    it('returns ISO string', () => {
      const date = new Date('2026-05-15T12:30:00Z');
      expect(formatUTC(date)).toBe('2026-05-15T12:30:00.000Z');
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
    it('calculates correct difference', () => {
      const a = new Date('2026-05-01');
      const b = new Date('2026-05-15');
      expect(daysBetween(a, b)).toBe(14);
    });

    it('handles reversed order', () => {
      const a = new Date('2026-05-15');
      const b = new Date('2026-05-01');
      expect(daysBetween(a, b)).toBe(14);
    });
  });
});
