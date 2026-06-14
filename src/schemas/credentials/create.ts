import { z } from 'zod';

const VALID_PROVIDERS = [
  'openrouter',
  'evolution',
] as const;

export const createCredentialSchema = z.object({
  provider: z.enum(VALID_PROVIDERS, {
    message: `Provider must be one of: ${VALID_PROVIDERS.join(', ')}`,
  }),
  keyName: z
    .string()
    .min(1, 'Key name is required')
    .max(100, 'Key name must be at most 100 characters')
    .trim(),
  keyValue: z.string().min(1, 'Key value is required').max(2000),
  isDefault: z.boolean().optional().default(false),
});

export const VALID_PROVIDER_LIST = VALID_PROVIDERS;

export type CreateCredentialInput = z.infer<typeof createCredentialSchema>;
