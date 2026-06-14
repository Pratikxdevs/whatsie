import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import * as EvoApi from '../adapters/evolutionApi';
import { logger } from '../config/logger';
import { io } from '../index';
import { validateBody } from '../middleware/validate';
import { createBotSchema } from '../schemas/bots';
import { enrichError } from '../errors/recovery';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Helper to map DB Bot schema to Frontend Workspace schema
const mapBotToWorkspace = (bot: any) => {
  const config = bot.config && typeof bot.config === 'object' ? bot.config : {};
  return {
    id: bot.id,
    name: bot.displayName,
    platform: bot.platform || 'whatsapp',
    session_id: bot.sessionName || bot.id,
    bot_active: bot.status === 'active' || bot.status === 'connected',
    status: bot.status || 'starting',
    whatsapp_status: bot.status || 'starting',
    system_prompt: config.system_prompt || null,
    ai_engine: config.ai_engine || null,
    api_key: config.api_key || null,
    temperature: config.temperature ?? null,
    max_tokens: config.max_tokens ?? null,
    model: config.model || null,
    created_at: bot.createdAt.toISOString(),
    updated_at: bot.updatedAt.toISOString(),
  };
};

// GET /api/workspaces - Lists all bots as workspaces
// Syncs each bot's status with Evolution API before returning
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const bots = await prisma.bot.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    // Sync status for bots that have a sessionName (connected to platform APIs)
    const botsWithSession = bots.filter((b: any) => b.sessionName && b.status !== 'disconnected');
    if (botsWithSession.length > 0) {
      await Promise.allSettled(
        botsWithSession.map(async (bot: any) => {
          try {
              // WhatsApp — query Evolution API status
              const stateRes = await EvoApi.getConnectionState(bot.sessionName!);
              const state = stateRes.instance?.state;
              const newStatus = 
                state === 'open' ? 'connected' : 
                state === 'close' ? 'disconnected' : 
                state === 'connecting' ? 'starting' : 
                bot.status;
              if (newStatus !== bot.status) {
                await prisma.bot.updateMany({ where: { id: bot.id }, data: { status: newStatus } });
                bot.status = newStatus;
              }
            } catch {
            // Platform API unreachable — keep DB status
          }
        })
      );
    }

    return res.json({ workspaces: bots.map(mapBotToWorkspace) });
  } catch (err: any) {
    logger.error({ err }, 'Workspaces route error fetching workspaces');
    return res.status(500).json(enrichError('DB_002', err.message));
  }
});

// POST /api/workspaces - Create a new bot / Evolution API instance
// Only persists to DB after Evolution API confirms the instance is created
router.post('/', validateBody(createBotSchema), async (req, res) => {
  try {
    const { name, system_prompt, ai_engine, api_key, platform, bot_token, temperature, max_tokens, model } = req.body;
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const userId = (req as AuthenticatedRequest).user!.id;

    // Only set userId if user actually exists in DB
    let validUserId: string | undefined;
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (userExists) validUserId = userId;
    }

    const botPlatform = platform || 'whatsapp';
    const appUrl = process.env.APP_URL || `http://host.docker.internal:${process.env.PORT || 3000}`;

    // -----------------------------------------------------------------------
    // WhatsApp platform — use Evolution API (existing flow)
    // -----------------------------------------------------------------------
    // Use a temp sessionName for the Evolution API call (no DB record yet)
    const tempSessionName = `whatsapp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // 1. Call Evolution API FIRST — only create DB record if this succeeds
    try {
      await EvoApi.createInstance({
        instanceName: tempSessionName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhookUrl: `${appUrl}/gateway/whatsapp/${tenantId}`,
      });
      logger.info({ sessionName: tempSessionName }, 'Evolution API instance created successfully');
    } catch (evoErr: any) {
      logger.error({ err: evoErr.response?.data || evoErr.message }, 'Evolution API instance creation failed — bot NOT created');
      return res.status(502).json(enrichError('WA_006', evoErr.response?.data?.message || evoErr.message || 'Evolution API unreachable'));
    }

    // 2. Evolution API confirmed — now create the DB record
    const bot = await prisma.bot.create({
      data: {
        tenantId,
        userId: validUserId || undefined,
        displayName: name || 'New AI Agent',
        platform: 'whatsapp',
        status: 'pending_qr',
        sessionName: tempSessionName,
        config: {
          system_prompt: system_prompt || null,
          ai_engine: ai_engine || null,
          api_key: api_key || null,
          temperature: temperature ?? 0.7,
          max_tokens: max_tokens ?? 1024,
          model: model || null,
        }
      }
    });

    logger.info({ botId: bot.id, sessionName: tempSessionName }, 'Bot created in DB after Evolution API confirmation');
    return res.status(201).json({ workspace: mapBotToWorkspace(bot) });
  } catch (err: any) {
    logger.error({ err }, 'Workspaces route error creating workspace');
    if (err.code === 'P2002') return res.status(409).json(enrichError('DB_003', err.message));
    return res.status(500).json(enrichError('SYS_005', err.message));
  }
});

// PUT /api/workspaces/:id - Update workspace configuration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const { name, system_prompt, ai_engine, api_key, temperature, max_tokens, model } = req.body;

    const bot = await prisma.bot.findFirst({ where: { id, tenantId } });
    if (!bot) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    const currentConfig = bot.config && typeof bot.config === 'object' ? (bot.config as any) : {};
    const updatedConfig = {
      ...currentConfig,
      system_prompt: system_prompt !== undefined ? system_prompt : currentConfig.system_prompt,
      ai_engine: ai_engine !== undefined ? ai_engine : currentConfig.ai_engine,
      api_key: api_key !== undefined ? api_key : currentConfig.api_key,
      temperature: temperature !== undefined ? temperature : currentConfig.temperature,
      max_tokens: max_tokens !== undefined ? max_tokens : currentConfig.max_tokens,
      model: model !== undefined ? model : currentConfig.model,
    };

    const updatedBot = await prisma.bot.update({
      where: { id },
      data: {
        displayName: name || bot.displayName,
        config: updatedConfig
      }
    });

    return res.json({ workspace: mapBotToWorkspace(updatedBot) });
  } catch (err: any) {
    logger.error({ err }, 'Workspaces route error updating workspace');
    return res.status(500).json(enrichError('DB_006', err.message));
  }
});

// DELETE /api/workspaces/:id - Delete a bot / instance
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;

    const bot = await prisma.bot.findFirst({ where: { id, tenantId } });
    if (!bot) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    const sessionName = bot.sessionName;

    // 1. Disconnect from platform API
    if (sessionName) {
      try {
        await EvoApi.deleteInstance(sessionName);
        logger.info({ sessionName }, 'Deleted Evolution API instance');
      } catch (delErr: any) {
        logger.error({ sessionName, err: delErr.response?.data || delErr.message }, 'Platform instance deletion failed');
      }
    }

    // 2. Delete the DB record
    await prisma.bot.deleteMany({ where: { id, tenantId } });

    // 3. Security Audit Log
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: 'bot_deleted',
        actorId: (req as AuthenticatedRequest).user?.id || 'unknown',
        targetId: id,
        details: { sessionName, platform: bot.platform }
      }
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Workspaces route error deleting workspace');
    return res.status(500).json(enrichError('DB_006', err.message));
  }
});

// POST /api/workspaces/:id/start — Connect / start a bot instance
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;

    const bot = await prisma.bot.findFirst({ where: { id, tenantId } });
    if (!bot) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    const sessionName = bot.sessionName;
    if (!sessionName) {
      return res.status(400).json({ error: 'Bot has no session name. Recreate the bot.' });
    }

    const appUrl = process.env.APP_URL || `http://host.docker.internal:${process.env.PORT || 3000}`;

    // -----------------------------------------------------------------------
    // WhatsApp — Request connection via Evolution API (returns QR code)
    // -----------------------------------------------------------------------
    let startError = false;
    try {
      const connectRes = await EvoApi.connectInstance(sessionName);

      let qrCode = connectRes.base64 || connectRes.qrcode?.base64;
      if (qrCode) {
        if (!qrCode.startsWith('data:image/')) {
          qrCode = `data:image/png;base64,${qrCode}`;
        }
        await prisma.bot.updateMany({ where: { id }, data: { status: 'pending_qr' } });
        return res.json({ sessionInfo: { status: 'pending_qr' }, screenshotUrl: qrCode });
      }
    } catch (err: any) {
      startError = true;
      const errData = err.response?.data || {};
      if (JSON.stringify(errData).includes('already connected')) {
        await prisma.bot.updateMany({ where: { id }, data: { status: 'connected' } });
        return res.json({ sessionInfo: { status: 'connected' }, screenshotUrl: null });
      }
      logger.error({ sessionName, err: err.message }, 'Start bot failed');
      await prisma.bot.updateMany({ where: { id }, data: { status: 'error' } }).catch(() => {});
      return res.status(502).json(enrichError('WA_003', err.message));
    }

    // No QR returned — check connection state directly, or re-trigger QR
    if (!startError) {
      // Check if already connected
      try {
        const stateRes = await EvoApi.getConnectionState(sessionName);
        if (stateRes.instance?.state === 'open') {
          await prisma.bot.updateMany({ where: { id }, data: { status: 'connected' } });
          return res.json({ sessionInfo: { status: 'connected' }, screenshotUrl: null });
        }
      } catch { /* fall through to starting state */ }

      await prisma.bot.updateMany({ where: { id }, data: { status: 'starting' } });
      return res.json({ sessionInfo: { status: 'starting' }, screenshotUrl: null });
    }
  } catch (err: any) {
    logger.error({ err }, 'Workspaces route error starting workspace');
    return res.status(500).json(enrichError('WA_003', err.message));
  }
});

// POST /api/workspaces/:id/stop — Disconnect a bot instance
router.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;

    const bot = await prisma.bot.findFirst({ where: { id, tenantId } });
    if (!bot) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    const sessionName = bot.sessionName;
    if (!sessionName) {
      // No session — just mark as disconnected
      await prisma.bot.updateMany({ where: { id }, data: { status: 'disconnected' } });
      return res.json({ status: 'disconnected' });
    }

    // Logout via platform API
    try {
      await EvoApi.logoutInstance(sessionName);
    } catch (err: any) {
      logger.error({ sessionName, err: err.message }, 'Logout call failed');
      // If Evo API says it's not connected or not found, treat it as a success since our goal is to disconnect
      if (err.response?.status === 404 || err.response?.status === 400) {
        logger.info({ sessionName }, 'Instance already disconnected or missing in Evolution API, proceeding with local disconnect');
      } else {
        await prisma.bot.updateMany({ where: { id }, data: { status: 'error' } }).catch(() => {});
        return res.status(500).json(enrichError('WA_002', err.message));
      }
    }

    await prisma.bot.updateMany({ where: { id }, data: { status: 'disconnected' } });
    io.to(tenantId).emit('bot_status_change', { botId: id, status: 'disconnected', platform: bot.platform });
    return res.json({ status: 'disconnected' });
  } catch (err: any) {
    logger.error({ err }, 'Workspaces route error stopping workspace');
    return res.status(500).json(enrichError('WA_002', err.message));
  }
});

// GET /api/workspaces/:id/connection-status - Check connection and QR state
router.get('/:id/connection-status', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;

    const bot = await prisma.bot.findFirst({ where: { id, tenantId } });
    if (!bot) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    const sessionName = bot.sessionName;
    if (!sessionName) {
      return res.json({ sessionInfo: { status: 'starting' }, screenshotUrl: null });
    }

    // -----------------------------------------------------------------------
    // WhatsApp — query Evolution API connection state
    // -----------------------------------------------------------------------
    // 1. Query connection state via adapter
    try {
      const stateRes = await EvoApi.getConnectionState(sessionName);

      const state = stateRes.instance?.state;
      if (state === 'open') {
        // Update DB status if it has changed
        if (bot.status !== 'connected') {
          await prisma.bot.updateMany({
            where: { id },
            data: { status: 'connected' }
          });
        }
        return res.json({ sessionInfo: { status: 'connected' }, screenshotUrl: null });
      }
    } catch (err: any) {
      logger.warn({ sessionName, err: err.message }, 'Could not fetch connection state');
    }

    // 2. Bot is starting/pending_qr but not connected — re-trigger QR generation
    if (bot.status === 'starting' || bot.status === 'pending_qr') {
      try {
        const connectRes = await EvoApi.connectInstance(sessionName);
        let qrCode = connectRes.base64 || connectRes.qrcode?.base64;
        if (qrCode) {
          if (!qrCode.startsWith('data:image/')) {
            qrCode = `data:image/png;base64,${qrCode}`;
          }
          await prisma.bot.updateMany({ where: { id }, data: { status: 'pending_qr' } });
          return res.json({ sessionInfo: { status: 'pending_qr' }, screenshotUrl: qrCode });
        }
      } catch (connectErr: any) {
        // If Evolution says "already connected", update status
        const errData = connectErr.response?.data || {};
        if (JSON.stringify(errData).includes('already connected')) {
          await prisma.bot.updateMany({ where: { id }, data: { status: 'connected' } });
          return res.json({ sessionInfo: { status: 'connected' }, screenshotUrl: null });
        }
        logger.warn({ sessionName, err: connectErr.message }, 'Could not re-trigger QR');
      }
    }

    // 3. Report current DB status
    return res.json({ sessionInfo: { status: bot.status || 'starting' }, screenshotUrl: null });
  } catch (err: any) {
    logger.error({ err }, 'Workspaces route error checking status');
    return res.status(500).json(enrichError('WA_001', err.message));
  }
});

// POST /api/workspaces/:id/validate-key — Validate AI API key stored in bot config
router.post('/:id/validate-key', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;

    const bot = await prisma.bot.findFirst({ where: { id, tenantId } });
    if (!bot) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    const config = bot.config && typeof bot.config === 'object' ? (bot.config as any) : {};
    const apiKey = req.body?.key || config.api_key;
    const provider = req.body?.provider || config.ai_engine || 'openrouter';

    if (!apiKey) {
      return res.json({ valid: false, error: 'No API key configured' });
    }

    // Minimal validation: check key is non-empty and has a known prefix
    const prefixes: Record<string, string[]> = {
      openrouter: ['sk-or-'],
      groq: ['gsk_'],
      openai: ['sk-'],
    };
    const knownPrefixes = prefixes[provider] || [];
    const hasValidPrefix = knownPrefixes.length === 0 || knownPrefixes.some((p) => apiKey.startsWith(p));

    if (!hasValidPrefix) {
      return res.json({ valid: false, error: `API key does not look like a valid ${provider} key` });
    }

    return res.json({ valid: true, provider, model: config.model || null });
  } catch (err: any) {
    logger.error({ err }, 'Workspaces route error validating key');
    return res.status(500).json(enrichError('AUTH_005', err.message));
  }
});

export default router;
