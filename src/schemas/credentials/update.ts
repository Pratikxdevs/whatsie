import { z } from 'zod';

export const updateCredentialSchema = z.object({
  keyName: z.string().min(1).max(100).trim().optional(),
  keyValue: z.string().min(1).max(2000).optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateCredentialInput = z.infer<typeof updateCredentialSchema>;
