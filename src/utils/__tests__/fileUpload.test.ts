import { describe, it, expect } from 'vitest';
import { validateMimeType, validateFileSize, validateBase64Upload, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../fileUpload';

describe('fileUpload utilities', () => {
  describe('validateMimeType', () => {
    it('accepts allowed types', () => {
      expect(validateMimeType('image/jpeg')).toBe(true);
      expect(validateMimeType('application/pdf')).toBe(true);
      expect(validateMimeType('audio/ogg')).toBe(true);
    });

    it('rejects disallowed types', () => {
      expect(validateMimeType('application/x-executable')).toBe(false);
      expect(validateMimeType('text/html')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('accepts sizes within limit', () => {
      expect(validateFileSize(1024)).toBe(true);
    });

    it('rejects zero or negative', () => {
      expect(validateFileSize(0)).toBe(false);
      expect(validateFileSize(-1)).toBe(false);
    });

    it('rejects sizes over limit', () => {
      expect(validateFileSize(MAX_FILE_SIZE + 1)).toBe(false);
    });
  });

  describe('validateBase64Upload', () => {
    it('validates a proper data URI', () => {
      // "hello" in base64 = aGVsbG8=
      const dataUri = 'data:image/jpeg;base64,aGVsbG8=';
      const result = validateBase64Upload(dataUri);
      expect(result.valid).toBe(true);
    });

    it('rejects non-data-URI format', () => {
      const result = validateBase64Upload('not-a-data-uri');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid base64');
    });

    it('rejects bad mime type', () => {
      const dataUri = 'data:application/x-evil;base64,aGVsbG8=';
      const result = validateBase64Upload(dataUri);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });
  });
});
