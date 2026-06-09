import { describe, it, expect } from 'vitest';
import { logger, getContextLogger, redactPII, redactObject } from './logger';

describe('Logger', () => {
  it('exports logger with info, error, and warn methods', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });

  it('getContextLogger returns a child logger', () => {
    const child = getContextLogger('test-tenant', 'test-module');
    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
    expect(typeof child.error).toBe('function');
    expect(typeof child.warn).toBe('function');
  });

  it('getContextLogger includes additional context', () => {
    const child = getContextLogger('tid', 'mod', { extra: 'value' });
    expect(child).toBeDefined();
  });
});

describe('redactPII', () => {
  it('masks phone numbers', () => {
    const input = 'Call me at +1-555-123-4567 or 555-987-6543';
    const result = redactPII(input);
    expect(result).not.toContain('4567');
    expect(result).not.toContain('6543');
    expect(result).toContain('****');
  });

  it('masks email addresses', () => {
    const input = 'Contact john.doe@example.com for info';
    const result = redactPII(input);
    expect(result).not.toContain('john.doe');
    expect(result).toContain('***@example.com');
  });

  it('masks API keys', () => {
    const input = 'Key: sk_abcdabcdefghijklmnopqrstuvwxyz123456';
    const result = redactPII(input);
    expect(result).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(result).toContain('sk_abcd****');
  });

  it('leaves normal text unchanged', () => {
    const input = 'Hello world, no PII here';
    expect(redactPII(input)).toBe(input);
  });
});

describe('redactObject', () => {
  it('redacts string values in objects', () => {
    const obj = { message: 'Call +1-555-123-4567', name: 'test' };
    const result = redactObject(obj);
    expect(result.message).toContain('****');
    expect(result.name).toBe('test');
  });

  it('masks key/secret/token fields', () => {
    const obj = { apiKey: 'supersecretvalue', token: 'anothersecret', normal: 'keep' };
    const result = redactObject(obj);
    expect(result.apiKey).toContain('****');
    expect(result.token).toContain('****');
    expect(result.normal).toBe('keep');
  });

  it('handles arrays', () => {
    const obj = ['+1-555-123-4567', 'normal'];
    const result = redactObject(obj);
    expect(result[0]).toContain('****');
    expect(result[1]).toBe('normal');
  });

  it('handles nested objects', () => {
    const obj = { deep: { phone: '+1-555-123-4567' } };
    const result = redactObject(obj);
    expect(result.deep.phone).toContain('****');
  });

  it('passes through non-string primitives', () => {
    expect(redactObject(42)).toBe(42);
    expect(redactObject(true)).toBe(true);
    expect(redactObject(null)).toBe(null);
  });
});
