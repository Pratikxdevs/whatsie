/**
 * Allowed MIME types for file uploads.
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'application/pdf',
  'text/plain',
] as const;

/**
 * Maximum file size: 16MB
 */
export const MAX_FILE_SIZE = 16 * 1024 * 1024;

/**
 * Validate a MIME type against the allowed list.
 */
export function validateMimeType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Validate file size against the max.
 */
export function validateFileSize(sizeInBytes: number): boolean {
  return sizeInBytes > 0 && sizeInBytes <= MAX_FILE_SIZE;
}

/**
 * Validate a base64 data URI — checks MIME type and decoded size.
 */
export function validateBase64Upload(dataUri: string): { valid: boolean; error?: string } {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { valid: false, error: 'Invalid base64 data URI format' };

  const mimeType = match[1];
  const base64Data = match[2];

  if (!validateMimeType(mimeType)) {
    return { valid: false, error: `Unsupported file type: ${mimeType}` };
  }

  const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
  if (!validateFileSize(sizeInBytes)) {
    return { valid: false, error: `File too large: ${(sizeInBytes / 1024 / 1024).toFixed(1)}MB (max 16MB)` };
  }

  return { valid: true };
}
