import { z } from 'zod';

export const createBotSchema = z.object({
  name: z.string().min(1, 'Bot name is required').max(100).trim(),
  platform: z.enum(['whatsapp'], {
    message: 'Platform must be whatsapp',
  }),
  system_prompt: z.string().max(10000).optional(),
  ai_engine: z.string().max(100).optional(),
  api_key: z.string().max(5000).optional(),
  bot_token: z.string().max(5000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(100000).optional(),
});

export type CreateBotInput = z.infer<typeof createBotSchema>;
