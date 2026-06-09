import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import helmet from 'helmet';
import { Server } from 'socket.io';
import requestId from './middleware/requestId';
import { logger } from './config/logger';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimit';
import gatewayRouter from './routes/gateway';
import authRouter from './api/auth';
import whatsappRouter from './routes/whatsapp.routes';
import workspacesRouter from './routes/workspaces';
import webhookRouter from './routes/webhooks';
import adminRouter from './routes/admin';
import analyticsRouter from './routes/analytics';
import billingRouter from './routes/billing';
import conversationsRouter from './routes/conversations';
import leadsRouter from './routes/leads';
import aiBridgeRouter from './AiInteg/endpoints';
import credentialsRouter from './routes/credentials';
import workflowRouter from './routes/workflows';
import apiKeyRouter from './routes/apiKeys';
import teamRouter from './routes/team';
import eventRouter from './routes/events';
import './workers/index'; // Spawns the BullMQ worker in the background

import { redisConnection } from './queue/setup';
import { prisma } from './db/prisma';
import { register, httpRequestDurationSeconds } from './metrics';
import { startDebugServer, addLog, recordRequest } from './debug/server';
import { setDebugLogger } from './config/logger';
import { requestLoggerMiddleware } from './middleware/requestLogger';

dotenv.config();

// Wire Pino logger to debug server ring buffer
setDebugLogger(addLog);

import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}

// 0. Config Validation - Fail fast if critical env vars are missing
const requiredEnvs = ['DATABASE_URL', 'REDIS_URL', 'GATEWAY_SECURITY_TOKEN', 'JWT_SECRET', 'EVOLUTION_API_SECRET', 'EVOLUTION_API_KEY', 'EVOLUTION_API_URL'];
const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
if (missingEnvs.length > 0) {
  logger.fatal({ missingEnvs }, `Missing required environment variables: ${missingEnvs.join(', ')}`);
  process.exit(1);
}

// 0.1 Auto-run Prisma migrations on startup — never serve stale tables
import { execSync } from 'child_process';
try {
  logger.info('Running Prisma migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit', timeout: 30_000 });
  logger.info('Prisma migrations applied successfully');
} catch (err: any) {
  logger.fatal({ err: err.message }, 'Prisma migrate deploy failed — refusing to start');
  process.exit(1);
}

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http:", "https:", "ws:", "wss:"],
      mediaSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(requestId);
app.use(express.json());

// Request duration tracking middleware
app.use((req, res, next) => {
  const end = httpRequestDurationSeconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status: String(res.statusCode) });
  });
  next();
});

// CORS — allow frontend dev server (port 5173) and any origin in development
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-KEY');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Initialize HTTP Server explicitly to bind WebSockets securely
const server = http.createServer(app);
export const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, `Socket client connected`);

  // Real-time clients can join rooms mapped by their Tenant ID natively!
  socket.on('join_tenant', (tenantId: string) => {
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
  const { PROVIDER_LIST } = await import('./ai/providers');
  res.json({ providers: PROVIDER_LIST });
});

// General API rate limiter — applies to all /api/* routes below
app.use('/api', apiRateLimiter);

// Main SaaS External Proxy Interface
app.use('/api/whatsapp', whatsappRouter);

// Workspace Management Interface
app.use('/api/workspaces', workspacesRouter);

// Admin Panel (DLQ replay, queue management)
app.use('/admin', adminRouter);

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

// Workflow Management
app.use('/api/workflows', workflowRouter);

// API Key Management
app.use('/api/api-keys', apiKeyRouter);

// Team Management
app.use('/api/team', teamRouter);

// Event / Audit Log (read-only)
app.use('/api/events', eventRouter);

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
  server.close(() => {
    logger.info('HTTP server closed');
    prisma.$disconnect().catch(() => {});
    redisConnection.quit().catch(() => {});
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
        const bots = await prisma.bot.findMany({
          where: { status: { notIn: ['connected', 'disconnected'] }, sessionName: { not: null } },
          select: { id: true, tenantId: true, sessionName: true, status: true, platform: true },
        });
        if (bots.length === 0) return;

        logger.info({ count: bots.length }, 'Syncing bot statuses with platform APIs');

        const { getConnectionState } = await import('./adapters/evolutionApi');

        await Promise.allSettled(
          bots.map(async (bot) => {
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

    })();
});
