import { describe, it, expect } from 'vitest';
import { normalizeWhatsAppWebhook, renderOutboundWhatsApp } from './whatsapp';

describe('normalizeWhatsAppWebhook', () => {
  const tenantId = 'tenant-1';

  it('normalizes a text message', () => {
    const rawPayload = {
      event: 'messages.upsert',
      data: {
        key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'msg-123' },
        message: {
          conversation: 'Hello, how are you?',
        },
      },
    };

    const result = normalizeWhatsAppWebhook(tenantId, rawPayload);

    expect(result.tenantId).toBe(tenantId);
    expect(result.platform).toBe('whatsapp');
    expect(result.userId).toBe('5511999999999@s.whatsapp.net');
    expect(result.type).toBe('text');
    expect(result.message.text).toBe('Hello, how are you?');
    expect(result.message.attachments).toEqual([]);
    expect(result.message.quickReplies).toBeNull();
    expect(result.metadata.raw).toBe(rawPayload);
    expect(result.metadata.isForwarded).toBe(false);
  });

  it('normalizes an extended text message', () => {
    const rawPayload = {
      data: {
        key: { remoteJid: 'user@s.whatsapp.net' },
        message: {
          extendedTextMessage: { text: 'Extended text here' },
        },
      },
    };

    const result = normalizeWhatsAppWebhook(tenantId, rawPayload);
    expect(result.message.text).toBe('Extended text here');
    expect(result.type).toBe('text');
  });

  it('normalizes an image message', () => {
    const rawPayload = {
      data: {
        key: { remoteJid: 'user@s.whatsapp.net' },
        message: {
          imageMessage: {
            url: 'https://example.com/image.jpg',
            mimetype: 'image/jpeg',
            fileLength: 12345,
          },
        },
      },
    };

    const result = normalizeWhatsAppWebhook(tenantId, rawPayload);
    expect(result.type).toBe('image');
    expect(result.message.attachments).toHaveLength(1);
    expect(result.message.attachments[0]).toEqual({
      type: 'image',
      url: 'https://example.com/image.jpg',
      mimeType: 'image/jpeg',
      size: 12345,
    });
    expect(result.message.text).toBeNull();
  });

  it('handles missing message data gracefully', () => {
    const rawPayload = { data: {} };
    const result = normalizeWhatsAppWebhook(tenantId, rawPayload);
    expect(result.type).toBe('text');
    expect(result.message.text).toBeNull();
    expect(result.userId).toBe('unknown');
  });

  it('handles null/undefined rawPayload fields', () => {
    const rawPayload = {};
    const result = normalizeWhatsAppWebhook(tenantId, rawPayload);
    expect(result.tenantId).toBe(tenantId);
    expect(result.platform).toBe('whatsapp');
    expect(result.userId).toBe('unknown');
    expect(result.type).toBe('text');
  });

  it('handles image message with missing fields', () => {
    const rawPayload = {
      data: {
        key: { remoteJid: 'user@s.whatsapp.net' },
        message: {
          imageMessage: {},
        },
      },
    };

    const result = normalizeWhatsAppWebhook(tenantId, rawPayload);
    expect(result.type).toBe('image');
    expect(result.message.attachments[0].url).toBe('');
    expect(result.message.attachments[0].mimeType).toBe('image/jpeg');
    expect(result.message.attachments[0].size).toBe(0);
  });

  it('detects forwarded messages', () => {
    const rawPayload = {
      data: {
        key: { remoteJid: 'user@s.whatsapp.net' },
        message: {
          extendedTextMessage: {
            text: 'Forwarded',
            contextInfo: { isForwarded: true },
          },
        },
      },
    };

    const result = normalizeWhatsAppWebhook(tenantId, rawPayload);
    expect(result.metadata.isForwarded).toBe(true);
  });
});

describe('renderOutboundWhatsApp', () => {
  it('renders correct Evolution API format', () => {
    const result = renderOutboundWhatsApp('Hello!', '5511999999999@s.whatsapp.net');
    expect(result).toEqual({
      number: '5511999999999@s.whatsapp.net',
      textMessage: { text: 'Hello!' },
      options: {
        delay: 1200,
        presence: 'composing',
      },
    });
  });

  it('preserves the text content exactly', () => {
    const longText = 'A'.repeat(500);
    const result = renderOutboundWhatsApp(longText, 'user@s.whatsapp.net');
    expect(result.textMessage.text).toBe(longText);
  });
});
