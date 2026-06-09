import { z } from 'zod';

export const updateBotSchema = z.object({
  displayName: z.string().min(1).max(100).trim().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
});

export type UpdateBotInput = z.infer<typeof updateBotSchema>;
