/**
 * AI Bridge API Endpoints
 *
 * Mount these routes on the backend to expose bridge functionality:
 *   import aiBridgeRouter from '../AiInteg/endpoints';
 *   app.use('/api/ai', aiBridgeRouter);
 *
 * Endpoints:
 *   GET  /api/ai/health     — Bridge health check
 *   POST /api/ai/verify     — Verify OpenRouter API Key and fetch/normalize models
 *   GET  /api/ai/config     — Show resolved AI config (no secrets)
 *   POST /api/ai/test       — Send a test message through the AI
 *   POST /api/ai/generate   — Generate AI response (no send)
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { generateAiResponse } from '../ai/orchestrator';
import { resolveAiConfig, validateAiConfig } from './config';
import { bridgeHealthCheck } from './bridge';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/ai/health
 * Returns health status of all bridge components. (Public)
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await bridgeHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * POST /api/ai/verify
 * Verifies an OpenRouter API key and fetches/normalizes available models.
 * PUBLIC — no auth required. Just validates a key against OpenRouter.
 * Body: { apiKey: string }
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const apiKey = req.body.apiKey?.trim();
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Call OpenRouter API key info and models list in parallel
    const [keyRes, modelsRes] = await Promise.allSettled([
      axios.get('https://openrouter.ai/api/v1/auth/key', {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://whatsie.ai',
          'X-Title': 'Whatsie CRM'
        },
        timeout: 8000
      }),
      axios.get('https://openrouter.ai/api/v1/models', {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://whatsie.ai',
          'X-Title': 'Whatsie CRM'
        },
        timeout: 8000
      })
    ]);

    if (keyRes.status === 'rejected') {
      const errorReason = keyRes.reason;
      logger.warn({ error: errorReason?.message }, 'OpenRouter key validation failed');
      if (errorReason?.response?.status === 401 || errorReason?.response?.status === 403) {
        return res.status(200).json({ status: 'invalid', credits: 0, availableModels: [] });
      }
      return res.status(502).json({ error: 'Failed to verify key with OpenRouter: ' + (errorReason?.message || 'unknown error') });
    }

    const keyData = keyRes.value.data;
    const limit = keyData.data?.limit ?? null;
    const usage = keyData.data?.usage ?? 0;
    const credits = limit === null ? 9999 : (limit - usage);

    if (credits <= 0) {
      return res.status(200).json({ status: 'no_credits', credits, availableModels: [] });
    }

    if (modelsRes.status === 'rejected') {
      const errorReason = modelsRes.reason;
      logger.warn({ error: errorReason?.message }, 'OpenRouter models fetch failed');
      return res.status(502).json({ error: 'Failed to fetch models from OpenRouter: ' + (errorReason?.message || 'unknown error') });
    }

    const modelsData = modelsRes.value.data;
    const rawModels = Array.isArray(modelsData.data) ? modelsData.data : [];

    const availableModels = rawModels.map((m: any) => {
      const parts = m.id.split('/');
      const providerSlug = parts[0] || 'unknown';
      return {
        id: m.id,
        name: m.name || m.id,
        context_length: m.context_length || 0,
        pricing: {
          prompt: m.pricing?.prompt || '0',
          completion: m.pricing?.completion || '0'
        },
        providerSlug
      };
    });

    res.json({ status: 'valid', credits, availableModels });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to run AI verify endpoint');
    res.status(500).json({ error: err.message });
  }
});

// Protect all downstream AI integration routes
router.use((req, res, next) => {
  authenticateToken(req as any, res, next);
});



/**
 * GET /api/ai/config
 * Shows resolved AI config (hides API key).
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const config = await resolveAiConfig(tenantId);
    const validation = validateAiConfig(config);

    res.json({
      provider: config.provider,
      model: config.model,
      apiKeySet: !!config.apiKey,
      apiKeyPreview: config.apiKey ? `${config.apiKey.slice(0, 8)}...` : 'NOT SET',
      baseURL: config.baseURL,
      systemPrompt: config.systemPrompt.slice(0, 100) + (config.systemPrompt.length > 100 ? '...' : ''),
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      valid: validation.valid,
      error: validation.error,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/test
 * Send a test message and get AI response.
 * Body: { message: string }
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const start = Date.now();
    const response = await generateAiResponse(tenantId, 'test-user', message);
    const duration = Date.now() - start;

    res.json({
      input: message,
      output: response,
      duration: `${duration}ms`,
      provider: (await resolveAiConfig(tenantId)).provider,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/generate
 * Generate AI response without sending to platform.
 * Body: { message: string, conversationId?: string }
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user!.tenantId;
    const { message, conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userId = conversationId || 'api-user';
    const response = await generateAiResponse(tenantId, userId, message);

    res.json({ response });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
