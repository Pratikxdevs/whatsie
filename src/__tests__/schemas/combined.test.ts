import { describe, it, expect } from 'vitest';
import { createBotSchema } from '../../schemas/bots/create';
import { sendMessageSchema, uploadMediaSchema } from '../../schemas/messages';
import { createCredentialSchema } from '../../schemas/credentials/create';

describe('bot schemas', () => {
  it('accepts valid create input', () => {
    const result = createBotSchema.safeParse({
      name: 'My Bot',
      platform: 'whatsapp',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid platform', () => {
    expect(createBotSchema.safeParse({ name: 'Bot', platform: 'invalid' }).success).toBe(false);
  });

  it('rejects empty name', () => {
    expect(createBotSchema.safeParse({ name: '', platform: 'discord' }).success).toBe(false);
  });
});

describe('message schemas', () => {
  it('accepts valid message', () => {
    expect(sendMessageSchema.safeParse({ content: 'Hello' }).success).toBe(true);
  });

  it('rejects empty content', () => {
    expect(sendMessageSchema.safeParse({ content: '' }).success).toBe(false);
  });

  it('rejects content over 10000 chars', () => {
    expect(sendMessageSchema.safeParse({ content: 'x'.repeat(10001) }).success).toBe(false);
  });
});

describe('credential schemas', () => {
  it('accepts valid credential', () => {
    const result = createCredentialSchema.safeParse({
      provider: 'openai',
      keyName: 'Production Key',
      keyValue: 'sk-abc123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid provider', () => {
    expect(createCredentialSchema.safeParse({
      provider: 'invalid',
      keyName: 'key',
      keyValue: 'val',
    }).success).toBe(false);
  });

  it('rejects empty keyName', () => {
    expect(createCredentialSchema.safeParse({
      provider: 'groq',
      keyName: '',
      keyValue: 'val',
    }).success).toBe(false);
  });
});
