import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizeObject } from '../../utils/sanitize';

describe('sanitize utils', () => {
  describe('sanitizeInput', () => {
    it('strips script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(sanitizeInput(input)).toBe('Hello');
    });

    it('strips HTML tags', () => {
      expect(sanitizeInput('<b>bold</b> text')).toBe('bold text');
    });

    it('passes through plain text', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
    });

    it('handles empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('sanitizes string values', () => {
      const input = { name: '<b>John</b>', age: 30 };
      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
    });

    it('leaves non-string values untouched', () => {
      const input = { count: 42, active: true, data: null };
      const result = sanitizeObject(input);
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
    });
  });
});
