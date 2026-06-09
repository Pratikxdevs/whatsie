import { describe, it, expect } from 'vitest';
import { createCredentialSchema, updateCredentialSchema } from '../credentials';

describe('credential schemas', () => {
  describe('createCredentialSchema', () => {
    it('accepts valid input', () => {
      const result = createCredentialSchema.safeParse({
        provider: 'openai',
        keyName: 'My Key',
        keyValue: 'sk-abc123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid provider', () => {
      const result = createCredentialSchema.safeParse({
        provider: 'invalid',
        keyName: 'My Key',
        keyValue: 'sk-abc123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty keyValue', () => {
      const result = createCredentialSchema.safeParse({
        provider: 'openai',
        keyName: 'My Key',
        keyValue: '',
      });
      expect(result.success).toBe(false);
    });

    it('defaults isDefault to false', () => {
      const result = createCredentialSchema.safeParse({
        provider: 'openai',
        keyName: 'My Key',
        keyValue: 'sk-abc123',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.isDefault).toBe(false);
    });
  });

  describe('updateCredentialSchema', () => {
    it('accepts partial updates', () => {
      expect(updateCredentialSchema.safeParse({ keyName: 'New Name' }).success).toBe(true);
      expect(updateCredentialSchema.safeParse({ keyValue: 'new-value' }).success).toBe(true);
      expect(updateCredentialSchema.safeParse({}).success).toBe(true);
    });
  });
});
