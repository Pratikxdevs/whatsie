import { parsePhoneNumberFromString, isValidPhoneNumber, getCountryCallingCode } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

/**
 * Parse a phone number string into structured data.
 * Returns null if the number is invalid.
 */
export function parsePhone(input: string, defaultCountry?: CountryCode) {
  const parsed = parsePhoneNumberFromString(input, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return {
    number: parsed.number,           // E.164 format: +14155552671
    national: parsed.nationalNumber, // 4155552671
    country: parsed.country,         // 'US'
    countryCode: parsed.countryCallingCode, // '1'
    type: parsed.getType(),          // 'MOBILE', 'FIXED_LINE', etc.
  };
}

/**
 * Format a phone number for display.
 * Returns the original input if parsing fails.
 */
export function formatPhone(input: string, defaultCountry?: CountryCode): string {
  const parsed = parsePhoneNumberFromString(input, defaultCountry);
  if (!parsed) return input;
  return parsed.formatInternational(); // +1 415 555 2671
}

/**
 * Check if a phone number is valid.
 */
export function isValidPhone(input: string, defaultCountry?: CountryCode): boolean {
  try {
    return isValidPhoneNumber(input, defaultCountry);
  } catch {
    return false;
  }
}

/**
 * Detect country from a phone number.
 */
export function detectCountry(input: string): CountryCode | null {
  const parsed = parsePhoneNumberFromString(input);
  return parsed?.country ?? null;
}

/**
 * Get country calling code from country ISO code.
 */
export function getCountryCode(country: CountryCode): string {
  return getCountryCallingCode(country);
}
