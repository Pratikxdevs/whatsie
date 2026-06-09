import { z } from 'zod';

const emailSchema = z.string().email();

/**
 * Validate an email address format.
 */
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

/**
 * Normalize an email address: lowercase, trim whitespace.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
