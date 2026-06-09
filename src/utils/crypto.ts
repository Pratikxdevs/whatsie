import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-dev-key-change-in-prod';
  const salt = randomBytes(SALT_LENGTH); // In production, store per-record salt
  return scryptSync(secret, salt, 32);
}

/**
 * Encrypt a credential value.
 * Returns: base64(salt:iv:tag:ciphertext)
 */
export function encryptCredential(plaintext: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-dev-key-change-in-prod', salt, 32);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Pack: salt(32 hex) + iv(24 hex) + tag(32 hex) + ciphertext
  return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('base64');
}

/**
 * Decrypt a credential value.
 * Input: base64(salt:iv:tag:ciphertext)
 */
export function decryptCredential(encrypted: string): string {
  const buf = Buffer.from(encrypted, 'base64');

  const salt = buf.subarray(0, SALT_LENGTH);
  const iv = buf.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buf.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = scryptSync(process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-dev-key-change-in-prod', salt, 32);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a value looks like it was encrypted by this utility.
 */
export function isEncrypted(value: string): boolean {
  try {
    const buf = Buffer.from(value, 'base64');
    // Minimum size: salt(16) + iv(12) + tag(16) + at least 1 byte ciphertext = 45
    return buf.length >= 45 && value.length > 60;
  } catch {
    return false;
  }
}
