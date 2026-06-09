import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

const EVO_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8081';
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

// Protect all routes with our dual-mode authentication
router.use(authenticateToken);

/**
 * Creates a new WhatsApp instance on the Evolution API.
 */
router.post('/instance/create', async (req: Request, res: Response) => {
  try {
    // We use tenantId to namespace the instance name. 
    // This guarantees no two tenants can accidentally clash instance names.
    const user = (req as any).user;
    const instanceName = `tenant_${user.tenantId}_bot`;
    const appUrl = process.env.APP_URL || `http://host.docker.internal:${process.env.PORT || 3000}`;

    // Evolution API v2 expects a specific payload for instance creation
    const payload = {
      instanceName,
      token: user.tenantId, // Use tenantId as the instance auth token
      qrcode: true, // We want the QR code returned as base64
      integration: "WHATSAPP-BAILEYS",
      webhook: `${appUrl}/gateway/whatsapp/${user.tenantId}`,
      webhook_by_events: false,
      webhook_base64: false,
      events: [
        "QRCODE_UPDATED",
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "MESSAGES_DELETE",
        "SEND_MESSAGE",
        "CONNECTION_UPDATE"
      ]
    };

    const response = await axios.post(`${EVO_URL}/instance/create`, payload, {
      headers: {
        'apikey': EVO_KEY,
        'Content-Type': 'application/json'
      }
    });

    return res.status(200).json({
      message: 'Instance created successfully',
      instance: response.data.instance,
      qrcode: response.data.qrcode
    });
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'WhatsApp proxy error creating instance');
    return res.status(500).json({ 
      error: 'Failed to create instance',
      details: error?.response?.data || error.message 
    });
  }
});

/**
 * Fetches the connection state of the instance (returns QR if disconnected)
 */
router.get('/instance/connectionState', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const instanceName = `tenant_${user.tenantId}_bot`;

    const response = await axios.get(`${EVO_URL}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': EVO_KEY
      }
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'WhatsApp proxy error fetching connection state');
    return res.status(500).json({ 
      error: 'Failed to fetch connection state',
      details: error?.response?.data || error.message 
    });
  }
});

/**
 * Logs out and deletes the instance
 */
router.delete('/instance/logout', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const instanceName = `tenant_${user.tenantId}_bot`;

    const response = await axios.delete(`${EVO_URL}/instance/logout/${instanceName}`, {
      headers: {
        'apikey': EVO_KEY
      }
    });

    return res.status(200).json({ message: 'Instance logged out successfully' });
  } catch (error: any) {
    logger.error({ err: error?.response?.data || error.message }, 'WhatsApp proxy error logging out instance');
    return res.status(500).json({ 
      error: 'Failed to logout instance',
      details: error?.response?.data || error.message 
    });
  }
});

export default router;
