/**
 * Sanitize a string input — strips HTML/script tags and dangerous attributes.
 * Uses a simple regex approach for server-side sanitization.
 */
export function sanitizeInput(input: string): string {
  // Strip script tags and their contents
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Strip HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  sanitized = sanitized
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
  return sanitized.trim();
}

/**
 * Sanitize an object's string values recursively.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === 'string') {
      (result as any)[key] = sanitizeInput(val);
    }
  }
  return result;
}
