import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { WhatsAppAdapter } from '../adapters/whatsapp.adapter';
import * as evoApi from '../adapters/evolutionApi';
import { validateBody } from '../middleware/validate';
import { sendMessageSchema } from '../schemas/messages';
import { validateBase64Upload } from '../utils/fileUpload';
import { createAppError, ErrorCode } from '../errors/codes';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/conversations
 * List conversations for the authenticated tenant.
 * Query params: status (open/closed), platform, leadId, page (default 1), limit (default 20)
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const { status, platform, leadId } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (platform) where.platform = platform;
    if (leadId) where.leadId = leadId;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              status: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              content: true,
              direction: true,
              createdAt: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    return res.json({ conversations, total, page, limit });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * GET /api/conversations/:id/messages
 * Get messages for a conversation (tenant-scoped).
 * Query params: page (default 1), limit (default 50)
 */
router.get('/:id/messages', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const skip = (page - 1) * limit;

    // Verify the conversation belongs to this tenant
    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId },
    });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where: { conversationId: id } }),
    ]);

    return res.json({ messages, total, page, limit });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Send a message in a conversation (creates outbound message record + dispatches via adapter).
 */
router.post('/:id/messages', validateBody(sendMessageSchema), async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const id = req.params.id as string;
    const { content, messageType } = req.body;

    // Verify the conversation belongs to this tenant (include lead for context)
    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId },
      include: { lead: true },
    });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Determine initial send status — will be updated to 'sent' if dispatch succeeds
    let sendStatus: string = 'pending';
    let platformMessageId: string | undefined;

    // Attempt to dispatch via Evolution API for WhatsApp conversations
    if (conversation.platform === 'whatsapp' && conversation.externalUserId) {
      try {
        const bot = await prisma.bot.findFirst({
          where: { tenantId, status: 'connected', platform: 'whatsapp' },
        });

        if (bot?.sessionName) {
          // WhatsApp JID format: phone@s.whatsapp.net
          const remoteJid = conversation.externalUserId.includes('@')
            ? conversation.externalUserId
            : `${conversation.externalUserId}@s.whatsapp.net`;

          const evoResult = await WhatsAppAdapter.sendMessage(bot.sessionName, remoteJid, content);
          sendStatus = 'sent';
          // Evolution API returns the message key with id
          if (evoResult?.key?.id) {
            platformMessageId = evoResult.key.id;
          }
        }
      } catch (sendErr: any) {
        logger.error({ err: sendErr }, '[conversations] Failed to dispatch message via WhatsApp');
        return res.status(500).json({ error: 'Failed to send message', details: sendErr?.message || String(sendErr) });
      }
    }

    const message = await prisma.message.create({
      data: {
        tenantId,
        conversationId: id,
        direction: 'out',
        content,
        messageType,
        platformMessageId: platformMessageId ?? undefined,
        metadata: { sendStatus },
      },
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    return res.json({ message });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * POST /api/conversations/:id/media
 * Send a media message (image, audio, document) in a conversation.
 * Accepts JSON with base64-encoded file data to avoid adding multer dependency.
 */
router.post('/:id/media', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const { id } = req.params;
    const { base64, messageType, fileName, mimeType } = req.body;

    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json(createAppError(ErrorCode.API_004, 'base64 is required'));
    }

    if (!messageType || !['image', 'audio', 'document', 'video'].includes(messageType)) {
      return res.status(400).json(createAppError(ErrorCode.API_004, 'messageType must be image, audio, document, or video'));
    }

    // Validate base64 media (MIME type + size)
    const validation = validateBase64Upload(base64);
    if (!validation.valid) {
      return res.status(400).json(createAppError(ErrorCode.API_004, validation.error!));
    }

    // Verify the conversation belongs to this tenant
    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId },
      include: { lead: true },
    });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Build content description for the DB record
    const content = fileName || `[${messageType}]`;

    // Attempt to dispatch via Evolution API for WhatsApp conversations
    let sendStatus: string = 'pending';
    let platformMessageId: string | undefined;

    if (conversation.platform === 'whatsapp' && conversation.externalUserId) {
      try {
        const bot = await prisma.bot.findFirst({
          where: { tenantId, status: 'connected', platform: 'whatsapp' },
        });

        if (bot?.sessionName) {
          // WhatsApp JID format: phone@s.whatsapp.net
          const remoteJid = conversation.externalUserId.includes('@')
            ? conversation.externalUserId
            : `${conversation.externalUserId}@s.whatsapp.net`;

          // Determine the Evolution API mediatype from the messageType
          const evoMediaType = messageType as 'image' | 'audio' | 'document' | 'video';

          // Resolve MIME type — fallback to generic types if not provided
          const resolvedMime = mimeType || `${messageType}/octet-stream`;

          if (messageType === 'audio') {
            // Evolution API uses sendWhatsAppAudio for voice notes
            const evoResult = await evoApi.sendAudio(bot.sessionName, {
              number: remoteJid,
              audio: base64,
              delay: 1200,
            });
            sendStatus = 'sent';
            if (evoResult?.key?.id) {
              platformMessageId = evoResult.key.id;
            }
          } else {
            // image, video, document all go through sendMedia
            const evoResult = await evoApi.sendMedia(bot.sessionName, {
              number: remoteJid,
              mediatype: evoMediaType,
              mimetype: resolvedMime,
              media: base64,
              caption: '',
              fileName: fileName || undefined,
              delay: 1200,
            });
            sendStatus = 'sent';
            if (evoResult?.key?.id) {
              platformMessageId = evoResult.key.id;
            }
          }
        }
      } catch (sendErr: any) {
        logger.error({ err: sendErr }, '[conversations] Failed to dispatch media via WhatsApp');
        return res.status(500).json({ error: 'Failed to send media', details: sendErr?.message || String(sendErr) });
      }
    }

    const message = await prisma.message.create({
      data: {
        tenantId,
        conversationId: id,
        direction: 'out',
        content,
        messageType,
        platformMessageId: platformMessageId ?? undefined,
        metadata: {
          sendStatus,
          fileName: fileName || null,
          mimeType: mimeType || null,
          hasMedia: true,
        },
      },
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    return res.json({ message });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * PATCH /api/conversations/:id/status
 * Open or close a conversation.
 * Body: { status: 'open' | 'closed' }
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'status must be "open" or "closed"' });
    }

    const conversation = await prisma.conversation.findFirst({ where: { id, tenantId } });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { status },
    });

    return res.json({ conversation: updated });
  } catch (err: any) {
    logger.error({ err }, '[conversations] PATCH status error');
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * DELETE /api/conversations/:id
 * Soft-delete a conversation by closing it (hard delete not supported).
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const { id } = req.params;

    const conversation = await prisma.conversation.findFirst({ where: { id, tenantId } });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Soft-delete: close the conversation rather than hard delete to preserve message history
    await prisma.conversation.update({ where: { id }, data: { status: 'closed' } });

    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, '[conversations] DELETE error');
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

export default router;
