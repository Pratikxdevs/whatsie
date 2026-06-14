import { z } from 'zod';

const providers = ['openrouter', 'evolution'] as const;

export const credentialFormSchema = z.object({
  provider: z.enum(providers, { message: 'Select a provider' }),
  keyName: z.string().min(1, 'Key name is required').max(100),
  keyValue: z.string().min(1, 'Key value is required').max(5000),
  isDefault: z.boolean().optional(),
});

export type CredentialFormInput = z.infer<typeof credentialFormSchema>;
