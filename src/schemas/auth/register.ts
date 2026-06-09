import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  tenantName: z
    .string()
    .min(2, 'Tenant name must be at least 2 characters')
    .max(100, 'Tenant name must be at most 100 characters')
    .trim(),
  name: z.string().max(100).trim().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
