import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisConnection } from '../queue/setup';

const sendCommand = (...args: string[]) =>
  redisConnection.call(args[0], ...args.slice(1)) as Promise<string | string[]>;

/**
 * Rate limiter for authentication endpoints.
 * 5 requests per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:auth:',
  }),
  message: { error: 'Too many authentication attempts, please try again later.' },
});

/**
 * General API rate limiter.
 * 500 requests per minute per IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand,
    prefix: 'rl:api:',
  }),
  message: { error: 'Too many requests, please slow down.' },
});
