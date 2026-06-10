import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import * as EvoApi from '../adapters/evolutionApi';

const router = Router();

router.use(authenticateToken);

async function findSessionName(tenantId: string): Promise<string | null> {
  const bot = await prisma.bot.findFirst({
    where: { tenantId, platform: 'whatsapp' },
    select: { sessionName: true },
  });
  return bot?.sessionName ?? null;
}

router.get('/chats', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const sessionName = await findSessionName(user.tenantId);
    if (!sessionName) {
      return res.status(404).json({ error: 'No WhatsApp bot found for this tenant' });
    }
    const data = await EvoApi.findChats(sessionName);
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to fetch chats');
    return res.status(500).json({
      error: 'Failed to fetch chats',
      details: error?.response?.data || error.message,
    });
  }
});

router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const sessionName = await findSessionName(user.tenantId);
    if (!sessionName) {
      return res.status(404).json({ error: 'No WhatsApp bot found for this tenant' });
    }
    const whereId = typeof req.query.q === 'string' ? req.query.q : undefined;
    const data = await EvoApi.findContacts(sessionName, whereId);
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to fetch contacts');
    return res.status(500).json({
      error: 'Failed to fetch contacts',
      details: error?.response?.data || error.message,
    });
  }
});

router.get('/messages/:jid', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const sessionName = await findSessionName(user.tenantId);
    if (!sessionName) {
      return res.status(404).json({ error: 'No WhatsApp bot found for this tenant' });
    }
    const jid = Array.isArray(req.params.jid) ? req.params.jid[0] : req.params.jid;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const data = await EvoApi.findMessages(sessionName, { remoteJid: jid, page, offset });
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to fetch messages');
    return res.status(500).json({
      error: 'Failed to fetch messages',
      details: error?.response?.data || error.message,
    });
  }
});

router.post('/read', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const sessionName = await findSessionName(user.tenantId);
    if (!sessionName) {
      return res.status(404).json({ error: 'No WhatsApp bot found for this tenant' });
    }
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }
    const data = await EvoApi.markMessagesRead(sessionName, messages);
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to mark messages read');
    return res.status(500).json({
      error: 'Failed to mark messages as read',
      details: error?.response?.data || error.message,
    });
  }
});

router.post('/typing', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const sessionName = await findSessionName(user.tenantId);
    if (!sessionName) {
      return res.status(404).json({ error: 'No WhatsApp bot found for this tenant' });
    }
    const { number, presence, delay } = req.body;
    if (!number || !presence) {
      return res.status(400).json({ error: 'number and presence are required' });
    }
    const data = await EvoApi.sendPresenceToChat(sessionName, { number, presence, delay });
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to send typing indicator');
    return res.status(500).json({
      error: 'Failed to send typing indicator',
      details: error?.response?.data || error.message,
    });
  }
});

router.get('/profile/:jid', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const sessionName = await findSessionName(user.tenantId);
    if (!sessionName) {
      return res.status(404).json({ error: 'No WhatsApp bot found for this tenant' });
    }
    const jid = typeof req.params.jid === 'string' ? req.params.jid : Array.isArray(req.params.jid) ? req.params.jid[0] : '';
    const data = await EvoApi.fetchProfilePicture(sessionName, jid);
    return res.status(200).json({ pictureUrl: data });
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to fetch profile picture');
    return res.status(500).json({
      error: 'Failed to fetch profile picture',
      details: error?.response?.data || error.message,
    });
  }
});

router.post('/block', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const sessionName = await findSessionName(user.tenantId);
    if (!sessionName) {
      return res.status(404).json({ error: 'No WhatsApp bot found for this tenant' });
    }
    const { number, status } = req.body;
    if (!number || !status) {
      return res.status(400).json({ error: 'number and status are required' });
    }
    const data = await EvoApi.updateBlockStatus(sessionName, { number, status });
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to update block status');
    return res.status(500).json({
      error: 'Failed to update block status',
      details: error?.response?.data || error.message,
    });
  }
});

router.post('/archive', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const sessionName = await findSessionName(user.tenantId);
    if (!sessionName) {
      return res.status(404).json({ error: 'No WhatsApp bot found for this tenant' });
    }
    const { lastMessage, chat, archive } = req.body;
    if (!lastMessage || !chat || archive === undefined) {
      return res.status(400).json({ error: 'lastMessage, chat, and archive are required' });
    }
    const data = await EvoApi.archiveChat(sessionName, { lastMessage, chat, archive });
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to archive chat');
    return res.status(500).json({
      error: 'Failed to archive chat',
      details: error?.response?.data || error.message,
    });
  }
});

router.delete('/message', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const sessionName = await findSessionName(user.tenantId);
    if (!sessionName) {
      return res.status(404).json({ error: 'No WhatsApp bot found for this tenant' });
    }
    const { id, remoteJid, fromMe } = req.body;
    if (!id || !remoteJid || fromMe === undefined) {
      return res.status(400).json({ error: 'id, remoteJid, and fromMe are required' });
    }
    const data = await EvoApi.deleteMessageForEveryone(sessionName, { id, remoteJid, fromMe });
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'Failed to delete message');
    return res.status(500).json({
      error: 'Failed to delete message',
      details: error?.response?.data || error.message,
    });
  }
});

export default router;
