import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(10000).trim(),
  messageType: z.enum(['text', 'image', 'audio', 'video', 'document']).default('text'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
