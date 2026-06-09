import { describe, it, expect } from 'vitest';
import { sendMessageSchema, uploadMediaSchema } from '../messages';

describe('message schemas', () => {
  describe('sendMessageSchema', () => {
    it('accepts valid text message', () => {
      expect(sendMessageSchema.safeParse({ content: 'Hello' }).success).toBe(true);
    });

    it('rejects empty content', () => {
      expect(sendMessageSchema.safeParse({ content: '' }).success).toBe(false);
    });

    it('defaults messageType to text', () => {
      const result = sendMessageSchema.safeParse({ content: 'Hi' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.messageType).toBe('text');
    });
  });

  describe('uploadMediaSchema', () => {
    it('accepts valid media upload', () => {
      const result = uploadMediaSchema.safeParse({
        media: 'data:image/jpeg;base64,/9j/4AAQ',
        mimeType: 'image/jpeg',
        filename: 'photo.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('rejects disallowed mime type', () => {
      const result = uploadMediaSchema.safeParse({
        media: 'data:application/x-evil;base64,AAAA',
        mimeType: 'application/x-evil',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing media', () => {
      const result = uploadMediaSchema.safeParse({
        mimeType: 'image/jpeg',
      });
      expect(result.success).toBe(false);
    });
  });
});
