import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import * as EvoApi from '../adapters/evolutionApi';

const router = Router();

// GET /api/whatsapp/health — Check Evolution API reachability (no auth)
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const instances = await EvoApi.fetchInstances();
    const count = Array.isArray(instances) ? instances.length : 0;
    return res.json({ status: 'ok', instances: count });
  } catch (error: any) {
    return res.status(503).json({ status: 'unavailable', error: error.message });
  }
});

router.use(authenticateToken);

router.get('/chats', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const bots = await prisma.bot.findMany({
      where: { tenantId: user.tenantId, platform: 'whatsapp' },
      select: { sessionName: true, displayName: true },
    });

    if (!bots.length) {
      return res.status(200).json([]);
    }

    let allChats: any[] = [];
    await Promise.allSettled(
      bots.map(async (bot) => {
        if (!bot.sessionName) return;
        try {
          const data = await EvoApi.findChats(bot.sessionName);
          if (Array.isArray(data)) {
            const taggedChats = data.map(chat => ({
              ...chat,
              sessionName: bot.sessionName,
              botName: bot.displayName,
            }));
            allChats.push(...taggedChats);
          }
        } catch (e: any) {
          logger.warn(`Failed to fetch chats for bot ${bot.sessionName}: ${e.message}`);
        }
      })
    );

    // Sort combined chats by last message timestamp (descending)
    allChats.sort((a, b) => {
      const aTime = a.lastMessageTimestamp || a.timestamp || 0;
      const bTime = b.lastMessageTimestamp || b.timestamp || 0;
      return bTime - aTime;
    });

    return res.status(200).json(allChats);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to fetch chats');
    return res.status(500).json({ error: 'Failed to fetch chats', details: error?.response?.data || error.message });
  }
});

router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const bots = await prisma.bot.findMany({
      where: { tenantId: user.tenantId, platform: 'whatsapp' },
      select: { sessionName: true },
    });

    if (!bots.length) return res.status(200).json([]);

    let allContacts: any[] = [];
    const whereId = typeof req.query.q === 'string' ? req.query.q : undefined;

    await Promise.allSettled(
      bots.map(async (bot) => {
        if (!bot.sessionName) return;
        try {
          const data = await EvoApi.findContacts(bot.sessionName, whereId);
          if (Array.isArray(data)) {
            const taggedContacts = data.map(contact => ({ ...contact, sessionName: bot.sessionName }));
            allContacts.push(...taggedContacts);
          }
        } catch (e: any) {
          logger.warn(`Failed to fetch contacts for bot ${bot.sessionName}: ${e.message}`);
        }
      })
    );

    // Deduplicate by remoteJid
    const uniqueContacts = Array.from(new Map(allContacts.map(c => [c.id || c.remoteJid, c])).values());

    return res.status(200).json(uniqueContacts);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to fetch contacts');
    return res.status(500).json({ error: 'Failed to fetch contacts', details: error?.response?.data || error.message });
  }
});

router.get('/messages/:jid', async (req: Request, res: Response) => {
  try {
    const sessionName = typeof req.query.sessionName === 'string' ? req.query.sessionName : undefined;
    if (!sessionName) return res.status(400).json({ error: 'sessionName query parameter is required' });

    const jid = Array.isArray(req.params.jid) ? req.params.jid[0] : req.params.jid;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    
    const data = await EvoApi.findMessages(sessionName, { remoteJid: jid, page, offset });
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to fetch messages');
    return res.status(500).json({ error: 'Failed to fetch messages', details: error?.response?.data || error.message });
  }
});

router.post('/send', async (req: Request, res: Response) => {
  try {
    const { sessionName, number: rawNumber, text } = req.body;
    if (!sessionName || !rawNumber || !text) {
      return res.status(400).json({ error: 'sessionName, number, and text are required' });
    }
    // Strip JID suffix — Evolution API expects plain phone number digits only
    const number = typeof rawNumber === 'string' ? rawNumber.replace(/@.*$/, '') : rawNumber;
    const data = await EvoApi.sendText(sessionName, { number, text });
    return res.status(200).json(data);
  } catch (error: any) {
    const upstreamStatus = error?.response?.status;
    const errorDetails = error?.response?.data ? error.response.data : error.message;
    logger.error({ err: errorDetails, upstreamStatus }, 'Failed to send message');
    // Pass through 4xx from upstream (e.g. number not on WhatsApp) — don't mask as 500
    if (upstreamStatus && upstreamStatus >= 400 && upstreamStatus < 500) {
      return res.status(upstreamStatus).json({ error: 'Failed to send message', details: errorDetails });
    }
    return res.status(500).json({ error: 'Failed to send message', details: typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails) });
  }
});

router.post('/media', async (req: Request, res: Response) => {
  try {
    const { sessionName, number: rawNumber, base64, mediatype, mimetype, fileName, caption } = req.body;
    if (!sessionName || !rawNumber || !base64 || !mediatype || !mimetype) {
      return res.status(400).json({ error: 'sessionName, number, base64, mediatype, and mimetype are required' });
    }
    // Strip JID suffix — Evolution API expects plain phone number digits only
    const number = typeof rawNumber === 'string' ? rawNumber.replace(/@.*$/, '') : rawNumber;
    const data = await EvoApi.sendMedia(sessionName, {
      number,
      media: base64,
      mediatype,
      mimetype,
      fileName,
      caption,
      delay: 500,
    });
    return res.status(200).json(data);
  } catch (error: any) {
    const upstreamStatus = error?.response?.status;
    const errorDetails = error?.response?.data || error.message;
    logger.error({ err: errorDetails, upstreamStatus }, 'Failed to send media');
    if (upstreamStatus && upstreamStatus >= 400 && upstreamStatus < 500) {
      return res.status(upstreamStatus).json({ error: 'Failed to send media', details: errorDetails });
    }
    return res.status(500).json({ error: 'Failed to send media', details: String(errorDetails) });
  }
});

router.post('/read', async (req: Request, res: Response) => {
  try {
    const { sessionName, messages } = req.body;
    if (!sessionName || !Array.isArray(messages)) return res.status(400).json({ error: 'sessionName and messages array are required' });
    const data = await EvoApi.markMessagesRead(sessionName, messages);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to mark messages read' });
  }
});

router.post('/typing', async (req: Request, res: Response) => {
  try {
    const { sessionName, number, presence, delay } = req.body;
    if (!sessionName || !number || !presence) return res.status(400).json({ error: 'sessionName, number, and presence required' });
    const data = await EvoApi.sendPresenceToChat(sessionName, { number, presence, delay });
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to send typing indicator' });
  }
});

router.get('/profile/:jid', async (req: Request, res: Response) => {
  try {
    const sessionName = typeof req.query.sessionName === 'string' ? req.query.sessionName : undefined;
    if (!sessionName) return res.status(400).json({ error: 'sessionName query parameter is required' });
    const jid = Array.isArray(req.params.jid) ? req.params.jid[0] : req.params.jid;
    const data = await EvoApi.fetchProfilePicture(sessionName, jid);
    return res.status(200).json({ pictureUrl: data });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch profile picture' });
  }
});

router.post('/block', async (req: Request, res: Response) => {
  try {
    const { sessionName, number, status } = req.body;
    if (!sessionName || !number || !status) return res.status(400).json({ error: 'Missing required parameters' });
    const data = await EvoApi.updateBlockStatus(sessionName, { number, status });
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update block status' });
  }
});

router.post('/archive', async (req: Request, res: Response) => {
  try {
    const { sessionName, lastMessage, chat, archive } = req.body;
    if (!sessionName || !lastMessage || !chat || archive === undefined) return res.status(400).json({ error: 'Missing parameters' });
    const data = await EvoApi.archiveChat(sessionName, { lastMessage, chat, archive });
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to archive chat' });
  }
});

router.delete('/message', async (req: Request, res: Response) => {
  try {
    const { sessionName, id, remoteJid, fromMe } = req.body;
    if (!sessionName || !id || !remoteJid || fromMe === undefined) return res.status(400).json({ error: 'Missing parameters' });
    const data = await EvoApi.deleteMessageForEveryone(sessionName, { id, remoteJid, fromMe });
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
