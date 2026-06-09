import { z } from 'zod';

export const botFormSchema = z.object({
  name: z.string().min(1, 'Bot name is required').max(100),
  platform: z.enum(['whatsapp', 'telegram', 'discord', 'twitter'], {
    message: 'Select a platform',
  }),
  system_prompt: z.string().max(10000).optional(),
  ai_engine: z.string().optional(),
  api_key: z.string().optional(),
  bot_token: z.string().optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  max_tokens: z.coerce.number().int().min(1).max(100000).optional(),
});

export type BotFormInput = z.infer<typeof botFormSchema>;
