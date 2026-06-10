import { Router, Request, Response, NextFunction } from 'express';
import { normalizeWhatsAppWebhook } from '../normalizer/whatsapp';
import { whatsappQueue, redisConnection } from '../queue/setup';
import { io } from '../index';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import { messagesReceivedTotal } from '../metrics';

const router = Router();

// Rate limiting middleware using Redis (Layer 5)
const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.params.tenantId as string;
  if (!tenantId) return next();

  const rateLimitKey = `ratelimit:webhook:${tenantId}`;
  
  try {
    const current = await redisConnection.incr(rateLimitKey);
    if (current === 1) {
      await redisConnection.expire(rateLimitKey, 1); // 1 second window
    }

    if (current > 100) { // 100 webhooks/second
      return res.status(429).json({ error: 'Too Many Requests' });
    }
    next();
  } catch (err) {
    logger.error({ err }, 'RateLimiter error');
    next();
  }
};

// Signature Validator for WhatsApp (Layer 2)
const verifyWhatsAppSignature = (req: Request, res: Response, next: NextFunction) => {
  // Skip signature verification in dev mode (Evolution API v2.3.7 doesn't send x-hub-signature)
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    return next();
  }

  const signature = req.headers['x-hub-signature'] || req.headers['authorization'];
  const secret = process.env.EVOLUTION_API_SECRET!;

  if (!signature) {
    return res.status(401).json({ error: 'Missing Signature' });
  }

  if (typeof signature === 'string' && signature.startsWith('sha256=')) {
    const hash = crypto.createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (`sha256=${hash}` !== signature) {
      return res.status(401).json({ error: 'Invalid Signature' });
    }
  }

  next();
};

// Tenant Authentication Middleware (Layer 0 & 2)
const authenticateTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.params.tenantId as string;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if ((tenant as any).status !== 'active') {
      return res.status(403).json({ error: 'Tenant suspended' });
    }

    next();
  } catch (err) {
    logger.error({ err }, 'Gateway tenant auth error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

router.post(
  '/whatsapp/:tenantId',
  rateLimitMiddleware,
  verifyWhatsAppSignature,
  async (req: Request, res: Response) => {
    // Return 200 OK immediately as per Layer 2 rule: "Return 200 OK within 3 seconds (queue async processing)"
    res.status(200).send('OK');

    try {
      const rawPayload = req.body;
      const tenantId = req.params.tenantId as string;

      const eventType = rawPayload.event || "";

      // 1. Broadcast specific non-CRM events dynamically via Sockets to the Front-end
      if (eventType === "qrcode.updated" || eventType === "connection.update") {
        logger.info({ eventType, tenantId }, 'Broadcasting event to tenant room');
        io.to(tenantId).emit(eventType, rawPayload);

        // Update bot status in DB when connection state changes
        if (eventType === "connection.update") {
          const connState = rawPayload.data?.state || rawPayload.state;
          const sessionName = rawPayload.instance || rawPayload.key?.remoteJid?.split(':')[0];
          if (connState && sessionName) {
            const newStatus = connState === 'open' ? 'connected'
              : connState === 'close' ? 'disconnected'
              : connState === 'connecting' ? 'starting'
              : null;
            if (newStatus) {
              prisma.bot.updateMany({
                where: { sessionName },
                data: { status: newStatus },
              }).then(async () => {
                // Look up botId so frontend can match by ID
                const bot = await prisma.bot.findFirst({
                  where: { sessionName },
                  select: { id: true },
                });
                if (bot) {
                  io.to(tenantId).emit('bot_status_change', {
                    botId: bot.id,
                    status: newStatus,
                  });
                }
              }).catch((err) => {
                logger.warn({ sessionName, connState, err: err.message }, 'Failed to update bot status from connection.update');
              });
            }
          }
        }

        return;
      }

      // 2. Only process actual message events
      if (eventType !== "messages.upsert") {
        return; 
      }

      // 3. Extract Message ID for Idempotency
      const messageId = rawPayload?.data?.key?.id;
      if (!messageId) {
        logger.warn('Gateway received payload without message ID, skipping');
        return;
      }

      // 4. Redis Idempotency Check
      const idempotencyKey = `idempotency:whatsapp:${messageId}`;
      const isDuplicate = await redisConnection.setnx(idempotencyKey, "processed");
      
      if (isDuplicate === 0) {
        logger.info({ messageId }, 'Duplicate webhook detected, skipping');
        return;
      }
      
      // Set TTL for 24 hours to keep Redis clean
      await redisConnection.expire(idempotencyKey, 86400);

      // 5. Normalize and Queue incoming Chat interactions identically
      const normalizedMessage = normalizeWhatsAppWebhook(tenantId, rawPayload);
      await whatsappQueue.add('incoming-message', normalizedMessage);

      // 6. Early real-time notification — worker will emit the full message with conversationId
      io.to(tenantId).emit('new_message', {
        conversationId: null,
        message: {
          direction: 'in',
          content: normalizedMessage.message?.text || '',
          platform: 'whatsapp',
          createdAt: new Date().toISOString(),
        },
      });

      logger.info({ tenantId }, 'Normalized WhatsApp webhook injected');

      // Metrics
      messagesReceivedTotal.inc({ platform: 'whatsapp', tenantId });

    } catch (err) {
      logger.error({ err }, 'Fatal error processing WhatsApp webhook');
    }
  }
);

export default router;
