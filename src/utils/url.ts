/**
 * Validate a URL format.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize a URL — ensure it starts with http/https and strip control characters.
 */
export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim().replace(/[\x00-\x1f]/g, '');
  if (!isValidUrl(trimmed)) return null;
  return trimmed;
}
