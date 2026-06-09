import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import { clerkClient } from '@clerk/express';

const router = Router();

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    first_name?: string;
    last_name?: string;
    image_url?: string;
    public_metadata?: Record<string, unknown>;
    created_at: number;
    updated_at: number;
  };
}

router.post('/clerk', async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    logger.error('CLERK_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Verify webhook signature using svix
  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(JSON.stringify(req.body), {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    logger.error({ err }, 'Webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { type, data } = evt;
  logger.info({ type, userId: data.id }, 'Clerk webhook received');

  try {
    switch (type) {
      case 'user.created': {
        const email = data.email_addresses?.[0]?.email_address;
        if (!email) {
          logger.error('user.created webhook missing email');
          return res.status(400).json({ error: 'Email required' });
        }

        // Check if user already exists (idempotency)
        const existing = await prisma.user.findUnique({
          where: { clerkId: data.id }
        });
        if (existing) {
          logger.info({ clerkId: data.id }, 'User already synced');
          return res.status(200).json({ success: true, message: 'Already synced' });
        }

        // Create tenant + user in a transaction
        const result = await prisma.$transaction(async (tx) => {
          const tenantName = email.split('@')[0] || 'My Workspace';
          const tenant = await tx.tenant.create({
            data: {
              name: tenantName,
              status: 'active',
              plan: 'free',
            }
          });

          const user = await tx.user.create({
            data: {
              clerkId: data.id,
              email,
              tenantId: tenant.id,
              role: 'admin',
            }
          });

          return { tenant, user };
        });

        // Store tenantId in Clerk's public metadata so frontend can access it
        try {
          await clerkClient.users.updateUserMetadata(data.id, {
            publicMetadata: {
              tenantId: result.tenant.id,
              role: 'admin',
            }
          });
        } catch (metaErr) {
          logger.error({ metaErr, userId: data.id }, 'Failed to update Clerk metadata');
          // Non-fatal: user is created in DB, metadata can be updated later
        }

        logger.info({
          clerkId: data.id,
          tenantId: result.tenant.id,
          userId: result.user.id
        }, 'User synced from Clerk');

        return res.status(201).json({ success: true, tenantId: result.tenant.id });
      }

      case 'user.updated': {
        const email = data.email_addresses?.[0]?.email_address;
        if (!email) return res.status(200).json({ success: true });

        await prisma.user.updateMany({
          where: { clerkId: data.id },
          data: { email }
        });

        return res.status(200).json({ success: true });
      }

      case 'user.deleted': {
        // Soft-delete: deactivate the user's tenant
        const user = await prisma.user.findUnique({
          where: { clerkId: data.id }
        });

        if (user) {
          await prisma.tenant.update({
            where: { id: user.tenantId },
            data: { status: 'suspended' }
          });
          logger.info({ clerkId: data.id, tenantId: user.tenantId }, 'Tenant suspended (user deleted)');
        }

        return res.status(200).json({ success: true });
      }

      default:
        return res.status(200).json({ success: true, message: 'Unhandled event type' });
    }
  } catch (error) {
    logger.error({ error, type }, 'Webhook handler error');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
