import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import helmet from 'helmet';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verifyToken, clerkMiddleware } from '@clerk/express';
import { prisma, prismaUnfiltered } from './db/prisma';
import requestId from './middleware/requestId';
import { logger } from './config/logger';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimit';
import gatewayRouter from './routes/gateway';
import authRouter from './api/auth';
// whatsapp.routes.ts removed (C-003) — superseded by workspaces.ts + whatsapp-chat.ts
import whatsappChatRouter from './routes/whatsapp-chat';
import workspacesRouter from './routes/workspaces';
import webhookRouter from './routes/webhooks';
import aiBridgeRouter from './AiInteg/endpoints';
import analyticsRouter from './routes/analytics';
import billingRouter from './routes/billing';
import conversationsRouter from './routes/conversations';
import leadsRouter from './routes/leads';
import credentialsRouter from './routes/credentials';
import './workers/index'; // Spawns the BullMQ worker in the background

import { redisConnection } from './queue/setup';
import { register, httpRequestDurationSeconds } from './metrics';
import { startDebugServer, addLog, recordRequest } from './debug/server';
import { setDebugLogger } from './config/logger';
import { startDockerLogStream } from './debug/dockerLogs';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { startStalledConversationJob, stopStalledConversationJob } from './jobs/stalledConversations';

dotenv.config();

// Wire Pino logger to debug server ring buffer
setDebugLogger(addLog);

import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}

// 0. Config Validation - Fail fast if critical env vars are missing
const requiredEnvs = [
  'DATABASE_URL', 'REDIS_URL', 'GATEWAY_SECURITY_TOKEN', 'JWT_SECRET',
  'EVOLUTION_API_SECRET', 'EVOLUTION_API_KEY', 'EVOLUTION_API_URL',
  'CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY', 'OPENROUTER_API_KEY',
  'API_KEY_PEPPER', // C-001: required to prevent known-pepper API key attacks
];
const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
if (missingEnvs.length > 0) {
  logger.fatal({ missingEnvs }, `Missing required environment variables: ${missingEnvs.join(', ')}`);
  process.exit(1);
}

// 0.1 Auto-run Prisma migrations on startup — never serve stale tables
import { execSync } from 'child_process';
if (process.env.NODE_ENV !== 'test') {
  try {
    logger.info('Running Prisma migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit', timeout: 30_000 });
    logger.info('Prisma migrations applied successfully');
  } catch (err: any) {
    logger.fatal({ err: err.message }, 'Prisma migrate deploy failed — refusing to start');
    process.exit(1);
  }
}

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http:", "https:", "ws:", "wss:"],
      mediaSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  xContentTypeOptions: true,
  xFrameOptions: { action: 'deny' },
}));
app.use(requestId);
app.use(express.json({ limit: '50mb' }));
app.use(clerkMiddleware({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
}));

// Request duration tracking middleware
app.use((req, res, next) => {
  const end = httpRequestDurationSeconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status: String(res.statusCode) });
  });
  next();
});

// Strict CORS — allow FRONTEND_URL only
const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  logger.fatal('FRONTEND_URL environment variable must be set for strict CORS policy');
  process.exit(1);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === FRONTEND_URL) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-KEY');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Prometheus metrics endpoint — C-002: gated behind METRICS_TOKEN bearer auth
app.get('/metrics', async (req, res) => {
  const metricsToken = process.env.METRICS_TOKEN;
  if (metricsToken) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${metricsToken}`) {
      res.status(401).set('WWW-Authenticate', 'Bearer realm="metrics"').end();
      return;
    }
  }
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Initialize HTTP Server explicitly to bind WebSockets securely
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST']
  }
});

// Socket.IO authentication middleware
const JWT_SECRET = process.env.JWT_SECRET;

io.use(async (socket, next) => {
  try {
    // Extract token from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }

    // Try API key first (X-API-KEY header)
    const apiKeyHeader = socket.handshake.auth?.apiKey;
    if (apiKeyHeader && typeof apiKeyHeader === 'string') {
      const keyHash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
      const keyRecord = await prismaUnfiltered.apiKey.findFirst({
        where: { keyHash },
        include: { tenant: true }
      });
      if (keyRecord && keyRecord.tenant.status === 'active') {
        (socket as any).tenantId = keyRecord.tenantId;
        (socket as any).userId = 'api-key-user';
        return next();
      }
      return next(new Error('Invalid API Key'));
    }

    // Verify Clerk JWT token
    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
    if (!CLERK_SECRET_KEY) {
      logger.error('CLERK_SECRET_KEY is missing for Socket.IO auth');
      return next(new Error('Server misconfigured'));
    }

    const decoded = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    const clerkId = decoded.sub;

    if (!clerkId) {
      return next(new Error('Invalid token: missing subject'));
    }

    const user = await prismaUnfiltered.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      return next(new Error('Invalid token: user not found'));
    }

    (socket as any).tenantId = user.tenantId;
    (socket as any).userId = user.id;
    next();
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Socket.IO auth failed');
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const tenantId = (socket as any).tenantId;
  const userId = (socket as any).userId;
  logger.info({ socketId: socket.id, tenantId, userId }, `Socket client connected`);

  // Auto-join tenant room on connection
  socket.join(tenantId);
  logger.info({ socketId: socket.id, tenantId }, `Socket client auto-joined tenant workspace`);

  // Allow joining additional rooms (validates tenant ownership)
  socket.on('join_tenant', (requestedTenantId: string) => {
    if (requestedTenantId !== tenantId) {
      logger.warn({ socketId: socket.id, requested: requestedTenantId, actual: tenantId }, `Socket client rejected: tenant mismatch`);
      socket.emit('error', { message: 'Unauthorized: tenant mismatch' });
      return;
    }
    socket.join(tenantId);
    logger.info({ socketId: socket.id, tenantId }, `Socket client joined tenant workspace`);
  });

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, `Socket client disconnected`);
  });
});

// Clerk Webhook (unauthenticated — uses svix signature verification)
app.use('/api/webhooks', webhookRouter);

// Main Auth Interface
app.use('/api/auth', authRateLimiter, authRouter);

// AI Provider listing (no auth needed — public info)
app.get('/api/providers', async (_req, res) => {
  res.json({ providers: ['openrouter'] });
});

// General API rate limiter — applies to all /api/* routes below
app.use('/api', apiRateLimiter);

// Legacy /api/whatsapp/instance/* routes removed (C-003) — use /api/workspaces instead
app.use('/api/whatsapp/instance', (_req, res) => {
  res.status(410).json({ error: 'Gone — use /api/workspaces for bot management' });
});

// WhatsApp Chat/Contacts/Messages API
app.use('/api/whatsapp', whatsappChatRouter);

// Workspace Management Interface
app.use('/api/workspaces', workspacesRouter);

// Conversation & Message API
app.use('/api/conversations', conversationsRouter);

// Lead Management API
app.use('/api/leads', leadsRouter);

// Analytics API
app.use('/api/analytics', analyticsRouter);

// Billing & Usage API
app.use('/api/billing', billingRouter);

// AI Bridge — health, config, test, generate
app.use('/api/ai', aiBridgeRouter);

// User Credentials Management
app.use('/api/credentials', credentialsRouter);

// Mount standard Unified Routers
app.use('/gateway', gatewayRouter);

// Sentry error handler (must be after all route registrations)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Infrastructure Health Checks
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', async (req, res) => {
  try {
    // Ping Redis
    await redisConnection.ping();
    // Ping Postgres
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      db: 'connected',
      redis: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      redis: 'disconnected'
    });
  }
});

// Universal request logging middleware (feeds debug dashboard + pino)
app.use(requestLoggerMiddleware);
// Legacy recordRequest for stats tracking
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health' && req.path !== '/metrics' && req.path !== '/ready') {
      recordRequest(res.statusCode, req.path, duration);
    }
  });
  next();
});

const PORT = Number(process.env.PORT) || 3000;

// Graceful shutdown — release port, close DB/Redis connections
function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');
  stopStalledConversationJob();
  server.close(() => {
    logger.info('HTTP server closed');
    prisma.$disconnect().catch(() => { });
    redisConnection.quit().catch(() => { });
    process.exit(0);
  });
  // Force kill after 10s if graceful shutdown hangs
  setTimeout(() => { process.exit(1); }, 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

let currentPort = PORT;

// Kill any leftover process on the port before binding
try {
  const { execSync } = require('child_process');
  execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`, { timeout: 2000 });
} catch { /* port was free or kill failed — try to listen anyway */ }

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    currentPort += 1;
    if (currentPort > PORT + 10) {
      logger.fatal({ port: PORT }, `Ports ${PORT}-${PORT + 10} all in use. Kill the old process first.`);
      process.exit(1);
    }
    logger.warn({ port: currentPort - 1, trying: currentPort }, `Port in use, retrying`);
    server.listen(currentPort);
  } else {
    logger.fatal({ err }, 'Server error');
    process.exit(1);
  }
});

server.listen(PORT, () => {
  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : PORT;
  logger.info({ port: actualPort }, `CRM V2 SaaS running securely on port ${actualPort}`);

  // Start debug server on port 9222
  startDebugServer();

  // Startup sync — reconcile bot statuses with platform APIs
  (async () => {
    try {
      const bots = await prismaUnfiltered.bot.findMany({
        where: { status: { notIn: ['connected', 'disconnected'] }, sessionName: { not: null } },
        select: { id: true, tenantId: true, sessionName: true, status: true, platform: true },
      });
      if (bots.length === 0) return;

      logger.info({ count: bots.length }, 'Syncing bot statuses with platform APIs');

      const { getConnectionState } = await import('./adapters/evolutionApi');

      await Promise.allSettled(
        bots.map(async (bot: any) => {
          try {
            // getConnectionState fetches live state AND updates the DB
            await getConnectionState(bot.sessionName!);
            logger.info({ botId: bot.id, sessionName: bot.sessionName }, 'Bot status synced on startup');
          } catch {
            // Platform API unreachable — keep DB status
          }
        })
      );
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Startup bot status sync failed');
    }

    startStalledConversationJob();
  })();
});
