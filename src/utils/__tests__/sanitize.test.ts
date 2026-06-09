import { describe, it, expect, vi } from 'vitest';

// Mock jsdom since it has native dependency issues in vitest
vi.mock('jsdom', () => ({
  JSDOM: class {
    window = {};
  },
}));

vi.mock('dompurify', () => ({
  default: (_window: any) => ({
    sanitize: (input: string, opts?: { ALLOWED_TAGS?: string[] }) => {
      // Simple mock: strip tags when ALLOWED_TAGS is empty or not provided
      if (opts?.ALLOWED_TAGS?.length === 0) {
        return input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '').trim();
      }
      return input;
    },
  }),
}));

// Re-import after mocks
const { sanitizeInput, sanitizeObject } = await import('../sanitize');

describe('sanitize utilities', () => {
  describe('sanitizeInput', () => {
    it('strips HTML tags', () => {
      expect(sanitizeInput('<b>hello</b>')).toBe('hello');
    });

    it('strips script tags', () => {
      const result = sanitizeInput('<script>alert("xss")</script>safe');
      expect(result).toBe('safe');
    });

    it('returns plain text unchanged', () => {
      expect(sanitizeInput('hello world')).toBe('hello world');
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
      expect(result).toEqual(input);
    });
  });
});
