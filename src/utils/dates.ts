/**
 * Get the billing period boundaries for a given date.
 * Periods start on the 1st of each month at 00:00 UTC.
 */
export function getBillingPeriod(date: Date = new Date()) {
  const periodStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { periodStart, periodEnd };
}

/**
 * Format a date to ISO string (UTC).
 */
export function formatUTC(date: Date): string {
  return date.toISOString();
}

/**
 * Check if a date has expired (is in the past).
 */
export function isExpired(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Get the number of days between two dates.
 */
export function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
