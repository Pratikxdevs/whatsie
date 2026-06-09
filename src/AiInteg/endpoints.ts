/**
 * AI Bridge API Endpoints
 *
 * Mount these routes on the backend to expose bridge functionality:
 *   import aiBridgeRouter from '../AiInteg/endpoints';
 *   app.use('/api/ai', aiBridgeRouter);
 *
 * Endpoints:
 *   GET  /api/ai/health     — Bridge health check
 *   POST /api/ai/test       — Send a test message through the AI
 *   GET  /api/ai/config     — Show resolved AI config (no secrets)
 *   POST /api/ai/generate   — Generate AI response (no send)
 */

import { Router, Request, Response } from 'express';
import { generateAiResponse } from '../ai/orchestrator';
import { resolveAiConfig, validateAiConfig } from './config';
import { bridgeHealthCheck } from './bridge';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/ai/health
 * Returns health status of all bridge components.
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
