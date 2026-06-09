/**
 * CRM Service — Layer 7
 *
 * Handles all PostgreSQL persistence for leads, conversations, messages,
 * and the Event audit log as defined in the phase architecture spec.
 */

import { prisma } from '../db/prisma';
import { NormalizedMessage } from '../normalizer/types';
import { logger } from '../config/logger';

// ---------------------------------------------------------------------------
// Inbound message processing (called by worker — step 8 of spec)
// ---------------------------------------------------------------------------
export async function processInboundMessageDbUpdates(normalized: NormalizedMessage) {
  const { tenantId, userId, platform, message, type } = normalized;

  // 1. Upsert Lead — tenantId scoped, phone is the external identity
  let lead = await prisma.lead.findFirst({
    where: { tenantId, phone: userId },
  });

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        tenantId,
        phone: userId,
        status: 'new',
        source: platform,
        attributes: {},
      },
    });
  }

  // 2. Upsert Conversation — one per (tenant, lead, platform, externalUser)
  let conversation = await prisma.conversation.findFirst({
    where: { tenantId, leadId: lead.id, platform, externalUserId: userId },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        tenantId,
        leadId: lead.id,
        platform,
        externalUserId: userId,
        lastMessageAt: new Date(),
      },
    });
  } else {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
  }

  // 3. Build content fallback based on message type
  const contentFallback = message.text || (
    type === 'image' ? '[Image]' :
    type === 'video' ? '[Video]' :
    type === 'audio' ? '[Audio]' :
    type === 'file' ? '[Document]' :
    type === 'location' ? '[Location]' :
    type === 'sticker' ? '[Sticker]' :
    '[Media]'
  );

  // 4. Extract media URL and location coords from first attachment for frontend access
  const firstAttachment = message.attachments?.[0];
  const mediaUrl = firstAttachment?.url || undefined;
  const fileName = (firstAttachment as any)?.fileName || undefined;
  const latitude = (firstAttachment as any)?.latitude ?? undefined;
  const longitude = (firstAttachment as any)?.longitude ?? undefined;

  // 5. Persist inbound Message
  const newMessage = await prisma.message.create({
    data: {
      tenantId,
      conversationId: conversation.id,
      direction: 'in',
      content: contentFallback,
      messageType: type,
      platformMessageId: normalized.metadata?.messageId,
      metadata: {
        ...(normalized.metadata?.raw as object || {}),
        ...(mediaUrl ? { mediaUrl } : {}),
        ...(fileName ? { fileName } : {}),
        ...(latitude != null ? { latitude } : {}),
        ...(longitude != null ? { longitude } : {}),
      },
    },
  });

  return { lead, conversation, newMessage };
}

// ---------------------------------------------------------------------------
// Event audit log — spec step 8: "Log event in events table"
// ---------------------------------------------------------------------------
export async function logEvent(
  tenantId: string,
  leadId: string,
  type: string,
  payload: Record<string, any> = {},
) {
  try {
    // prisma.event requires `npx prisma generate` after schema changes.
    // This guard prevents crashing the pipeline if the client is stale.
    const p = prisma as any;
    if (typeof p.event?.create === 'function') {
      return await p.event.create({
        data: { tenantId, type, payload: { leadId, ...payload } },
      });
    }
  } catch (err) {
    logger.warn({ err }, 'CRM logEvent skipped — run prisma generate to enable Event table');
  }
}

// ---------------------------------------------------------------------------
// Lead / Conversation status transitions (called by rule engine / workflows)
// ---------------------------------------------------------------------------
export async function updateLeadConversationStatus(
  tenantId: string,
  leadId: string,
  conversationId: string,
  status: string,
) {
  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { status } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { status } }),
  ]);
}
