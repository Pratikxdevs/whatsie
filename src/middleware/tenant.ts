import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import crypto from 'crypto';
import { logger } from '../config/logger';

export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

export const tenantAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Extract API key from header or path param
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'X-API-KEY header is required' });
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const keyRecord = await prisma.apiKey.findFirst({
      where: { keyHash },
      include: { tenant: true }
    });

    if (!keyRecord) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    if ((keyRecord.tenant as any).status !== 'active') {
      return res.status(403).json({ error: 'Tenant is suspended or inactive' });
    }

    tenantContext.run({ tenantId: keyRecord.tenantId }, () => {
      next();
    });
  } catch (error) {
    logger.error({ error }, 'Tenant middleware error validating API key');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
