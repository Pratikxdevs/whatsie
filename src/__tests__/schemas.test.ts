import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth';
import { createBotSchema, updateBotSchema } from '../schemas/bots';
import { createLeadSchema, updateLeadSchema } from '../schemas/leads';
import { sendMessageSchema, uploadMediaSchema } from '../schemas/messages';
import { createCredentialSchema, updateCredentialSchema } from '../schemas/credentials';

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid input', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'SecurePass1',
        tenantName: 'Acme Corp',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'SecurePass1',
        tenantName: 'Acme',
      });
      expect(result.success).toBe(false);
    });

    it('rejects weak password', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'weak',
        tenantName: 'Acme',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing tenantName', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'SecurePass1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid input', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshSchema', () => {
    it('accepts valid token', () => {
      const result = refreshSchema.safeParse({ refreshToken: 'abc123' });
      expect(result.success).toBe(true);
    });

    it('rejects empty token', () => {
      const result = refreshSchema.safeParse({ refreshToken: '' });
      expect(result.success).toBe(false);
    });
  });
});

describe('Bot Schemas', () => {
  describe('createBotSchema', () => {
    it('accepts valid input', () => {
      const result = createBotSchema.safeParse({
        name: 'My Bot',
        platform: 'whatsapp',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid platform', () => {
      const result = createBotSchema.safeParse({
        name: 'My Bot',
        platform: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateBotSchema', () => {
    it('accepts partial updates', () => {
      const result = updateBotSchema.safeParse({ displayName: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = updateBotSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('Lead Schemas', () => {
  describe('createLeadSchema', () => {
    it('accepts valid input', () => {
      const result = createLeadSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+14155552671',
      });
      expect(result.success).toBe(true);
    });

    it('accepts name only', () => {
      const result = createLeadSchema.safeParse({ name: 'Jane' });
      expect(result.success).toBe(true);
    });
  });

  describe('updateLeadSchema', () => {
    it('accepts valid status', () => {
      const result = updateLeadSchema.safeParse({ status: 'qualified' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = updateLeadSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });
  });
});

describe('Message Schemas', () => {
  describe('sendMessageSchema', () => {
    it('accepts valid text message', () => {
      const result = sendMessageSchema.safeParse({ content: 'Hello!' });
      expect(result.success).toBe(true);
    });

    it('rejects empty content', () => {
      const result = sendMessageSchema.safeParse({ content: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('uploadMediaSchema', () => {
    it('accepts valid upload', () => {
      const result = uploadMediaSchema.safeParse({
        media: 'data:image/jpeg;base64,/9j/4AAQ',
        mimeType: 'image/jpeg',
        filename: 'photo.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('rejects disallowed mime type', () => {
      const result = uploadMediaSchema.safeParse({
        media: 'data:application/exe;base64,AAAA',
        mimeType: 'application/exe',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Credential Schemas', () => {
  describe('createCredentialSchema', () => {
    it('accepts valid input', () => {
      const result = createCredentialSchema.safeParse({
        provider: 'openai',
        keyName: 'Production Key',
        keyValue: 'sk-abc123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid provider', () => {
      const result = createCredentialSchema.safeParse({
        provider: 'invalid',
        keyName: 'Key',
        keyValue: 'val',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateCredentialSchema', () => {
    it('accepts partial updates', () => {
      const result = updateCredentialSchema.safeParse({ keyName: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = updateCredentialSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
