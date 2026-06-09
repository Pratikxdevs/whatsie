import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeTelegramWebhook } from '../normalizer/telegram';

describe('normalizeTelegramWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes a text message correctly', () => {
    const rawPayload = {
      message: {
        message_id: 100,
        from: { id: 12345, first_name: 'John', username: 'johndoe' },
        chat: { id: 12345, type: 'private' },
        date: 1700000000,
        text: 'Hello bot',
      },
    };

    const result = normalizeTelegramWebhook('tenant-1', rawPayload);

    expect(result.tenantId).toBe('tenant-1');
    expect(result.platform).toBe('telegram');
    expect(result.type).toBe('text');
    expect(result.userId).toBe('12345');
    expect(result.message.text).toBe('Hello bot');
    expect(result.metadata.chatId).toBe('12345');
    expect(result.metadata.chatType).toBe('private');
    expect(result.metadata.firstName).toBe('John');
    expect(result.metadata.username).toBe('johndoe');
  });

  it('normalizes a photo message with caption', () => {
    const rawPayload = {
      message: {
        message_id: 101,
        from: { id: 12345, first_name: 'John' },
        chat: { id: 12345, type: 'private' },
        date: 1700000000,
        photo: [{ file_id: 'photo-small' }, { file_id: 'photo-large' }],
        caption: 'Check this out',
      },
    };

    const result = normalizeTelegramWebhook('tenant-1', rawPayload);

    expect(result.type).toBe('image');
    expect(result.message.text).toBe('Check this out');
  });

  it('normalizes a voice message', () => {
    const rawPayload = {
      message: {
        message_id: 102,
        from: { id: 67890, first_name: 'Jane' },
        chat: { id: 67890, type: 'private' },
        date: 1700000000,
        voice: { file_id: 'voice-file-id', duration: 5 },
      },
    };

    const result = normalizeTelegramWebhook('tenant-1', rawPayload);

    expect(result.type).toBe('audio');
    expect(result.message.text).toBeNull();
  });

  it('captures reply_to_message metadata', () => {
    const rawPayload = {
      message: {
        message_id: 103,
        from: { id: 12345, first_name: 'John' },
        chat: { id: 12345, type: 'private' },
        date: 1700000000,
        text: 'This is a reply',
        reply_to_message: { message_id: 42 },
      },
    };

    const result = normalizeTelegramWebhook('tenant-1', rawPayload);

    expect(result.metadata.replyTo).toBe('42');
  });

  it('detects forwarded messages', () => {
    const rawPayload = {
      message: {
        message_id: 104,
        from: { id: 12345, first_name: 'John' },
        chat: { id: 12345, type: 'private' },
        date: 1700000000,
        text: 'Forwarded content',
        forward_date: 1699999000,
      },
    };

    const result = normalizeTelegramWebhook('tenant-1', rawPayload);

    expect(result.metadata.isForwarded).toBe(true);
  });

  it('captures group message with distinct chatId and userId', () => {
    const rawPayload = {
      message: {
        message_id: 105,
        from: { id: 11111, first_name: 'Alice', username: 'alice' },
        chat: { id: -99999, type: 'group', title: 'Test Group' },
        date: 1700000000,
        text: 'Hello group',
      },
    };

    const result = normalizeTelegramWebhook('tenant-1', rawPayload);

    expect(result.userId).toBe('11111');
    expect(result.metadata.chatId).toBe('-99999');
    expect(result.metadata.chatType).toBe('group');
  });

  it('throws when no message in payload', () => {
    expect(() => normalizeTelegramWebhook('tenant-1', {})).toThrow(
      'normalizeTelegramWebhook: no message found in payload',
    );
  });

  it('handles edited_message as fallback', () => {
    const rawPayload = {
      edited_message: {
        message_id: 106,
        from: { id: 12345, first_name: 'John' },
        chat: { id: 12345, type: 'private' },
        date: 1700000000,
        text: 'Edited text',
      },
    };

    const result = normalizeTelegramWebhook('tenant-1', rawPayload);

    expect(result.message.text).toBe('Edited text');
    expect(result.type).toBe('text');
  });
});
