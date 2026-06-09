import { describe, it, expect } from 'vitest';
import { validateMimeType, validateFileSize, validateBase64Upload, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../utils/fileUpload';

describe('fileUpload utils', () => {
  describe('validateMimeType', () => {
    it('accepts allowed types', () => {
      expect(validateMimeType('image/jpeg')).toBe(true);
      expect(validateMimeType('application/pdf')).toBe(true);
      expect(validateMimeType('video/mp4')).toBe(true);
    });

    it('rejects disallowed types', () => {
      expect(validateMimeType('application/exe')).toBe(false);
      expect(validateMimeType('text/html')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('accepts valid sizes', () => {
      expect(validateFileSize(1024)).toBe(true);
      expect(validateFileSize(MAX_FILE_SIZE)).toBe(true);
    });

    it('rejects too large files', () => {
      expect(validateFileSize(MAX_FILE_SIZE + 1)).toBe(false);
    });

    it('rejects zero/negative', () => {
      expect(validateFileSize(0)).toBe(false);
      expect(validateFileSize(-1)).toBe(false);
    });
  });

  describe('validateBase64Upload', () => {
    it('validates a proper base64 data URI', () => {
      // Small valid image
      const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
      const result = validateBase64Upload(dataUri);
      expect(result.valid).toBe(true);
    });

    it('rejects non-data-uris', () => {
      expect(validateBase64Upload('not-base64').valid).toBe(false);
    });

    it('rejects unsupported MIME types', () => {
      const dataUri = 'data:application/exe;base64,AAAA';
      expect(validateBase64Upload(dataUri).valid).toBe(false);
    });
  });
});
