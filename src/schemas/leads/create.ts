import { z } from 'zod';

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Lead name is required').max(200).trim(),
  phone: z.string().max(30).optional(),
  email: z.string().email('Invalid email address').max(255).optional(),
  source: z.string().max(100).optional(),
  botId: z.string().uuid().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
