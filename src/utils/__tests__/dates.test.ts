import { describe, it, expect } from 'vitest';
import { getBillingPeriod, formatUTC, isExpired, daysBetween } from '../dates';

describe('date utilities', () => {
  describe('getBillingPeriod', () => {
    it('returns start and end of month', () => {
      const ref = new Date('2026-05-15');
      const { periodStart, periodEnd } = getBillingPeriod(ref);
      expect(periodStart.getUTCMonth()).toBe(4); // May
      expect(periodStart.getUTCDate()).toBe(1);
      expect(periodEnd.getUTCMonth()).toBe(5); // June 1st = end of May period
      expect(periodEnd.getUTCDate()).toBe(1);
    });
  });

  describe('formatUTC', () => {
    it('returns ISO string', () => {
      const date = new Date('2026-05-24T12:00:00Z');
      expect(formatUTC(date)).toBe('2026-05-24T12:00:00.000Z');
    });
  });

  describe('isExpired', () => {
    it('returns true for past dates', () => {
      expect(isExpired(new Date('2020-01-01'))).toBe(true);
    });

    it('returns false for future dates', () => {
      expect(isExpired(new Date('2030-01-01'))).toBe(false);
    });
  });

  describe('daysBetween', () => {
    it('calculates days between dates', () => {
      const a = new Date('2026-05-01');
      const b = new Date('2026-05-24');
      expect(daysBetween(a, b)).toBe(23);
    });

    it('is symmetric', () => {
      const a = new Date('2026-05-01');
      const b = new Date('2026-05-24');
      expect(daysBetween(b, a)).toBe(23);
    });
  });
});
