import { z } from 'zod';
import { logger } from '../config/logger';

const isProd = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  GATEWAY_SECURITY_TOKEN: z.string().min(1),
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_SECRET: z.string().min(1),
  EVOLUTION_API_KEY: z.string().min(1),

  // Credential encryption key — required in production
  CREDENTIAL_ENCRYPTION_KEY: isProd
    ? z.string().min(32, 'CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters in production')
    : z.string().min(1).optional(),

  // API key pepper — separate from JWT_SECRET, used in HMAC for key hashing
  API_KEY_PEPPER: isProd
    ? z.string().min(32, 'API_KEY_PEPPER must be at least 32 characters in production')
    : z.string().min(1).optional(),

  // Optional but validated for format if present
  FRONTEND_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  DEFAULT_TENANT_ID: z.string().uuid().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables at startup.
 * Returns parsed env or throws with detailed errors.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`);
    logger.fatal({ errors }, 'Environment validation failed');
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
  return result.data;
}
