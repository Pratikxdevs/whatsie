/**
 * AI Bridge — Complete message flow orchestration
 *
 * Handles the full lifecycle:
 *   1. Receive inbound message (from worker)
 *   2. Load/create lead and conversation from DB
 *   3. Generate AI response via configured provider
 *   4. Dispatch response via platform adapter
 *   5. Persist everything to DB
 *   6. Emit Socket.IO events for real-time UI updates
 */

import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import { generateAiResponse } from '../ai/orchestrator';
import { runStructuralizer } from '../ai/structuralizer';
import { ResponseRouter } from '../router/index';
import { NormalizedMessage } from '../normalizer/types';

export interface BridgeResult {
  success: boolean;
  conversationId: string;
  leadId: string;
  aiResponse: string | null;
  sentToPlatform: boolean;
  error?: string;
}

/**
 * Process an inbound message through the full AI bridge pipeline.
 */
export async function processInboundMessage(
  msg: NormalizedMessage,
): Promise<BridgeResult> {
  const log = logger.child({ tenantId: msg.tenantId, userId: msg.userId });

  try {
    // ── Step 1: Upsert Lead ──────────────────────────────────────────
    let lead = await prisma.lead.findFirst({
      where: { tenantId: msg.tenantId, phone: msg.userId },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          tenantId: msg.tenantId,
          phone: msg.userId,
          source: msg.platform,
          status: 'new',
        },
      });
    }

    // ── Step 2: Upsert Conversation ──────────────────────────────────
    let conversation = await prisma.conversation.findFirst({
      where: {
        tenantId: msg.tenantId,
        leadId: lead.id,
        platform: msg.platform,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          tenantId: msg.tenantId,
          leadId: lead.id,
          platform: msg.platform,
          externalUserId: msg.userId,
          status: 'active',
        },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: 'active', lastMessageAt: new Date() },
      });
    }

    // ── Step 3: Persist Inbound Message ──────────────────────────────
    const messageText = msg.message.text || '[media]';
    const inboundMsg = await prisma.message.create({
      data: {
        tenantId: msg.tenantId,
        conversationId: conversation.id,
        direction: 'in',
        content: messageText,
        messageType: 'text',
        metadata: { platform: msg.platform },
      },
    });

    log.info({ conversationId: conversation.id, leadId: lead.id }, 'Inbound message persisted');

    // Emit real-time event
    try {
      const { io: socketIo } = await import('../index');
      socketIo.to(msg.tenantId).emit('new_message', {
        conversationId: conversation.id,
        message: {
          id: inboundMsg.id,
          content: inboundMsg.content,
          direction: 'in',
          createdAt: inboundMsg.createdAt,
        },
      });
    } catch (err) {
      log.warn({ err }, 'Failed to emit inbound Socket.IO event');
    }

    // ── Step 4: Generate AI Response ─────────────────────────────────
    let aiResponse: string | null = null;
    try {
      aiResponse = await generateAiResponse(
        msg.tenantId,
        msg.userId,
        messageText,
      );
      log.info({ responseLength: aiResponse?.length }, 'AI response generated');
    } catch (err: any) {
      log.error({ err: err.message }, 'AI response generation failed');
      aiResponse = "I'm having trouble processing your request. Please try again.";
    }

    // ── Step 5: Send Response via Platform (with retry) ──────────────
    let sentToPlatform = false;
    if (aiResponse) {
      const tryDispatch = async () => ResponseRouter.dispatch(msg, conversation.id, aiResponse!);
      try {
        const result = await tryDispatch();
        sentToPlatform = result.success;
        log.info({ messageId: result.messageId }, 'Response dispatched to platform');
      } catch (firstErr: any) {
        log.warn({ err: firstErr.message }, 'First dispatch attempt failed — retrying in 2s');
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const result = await tryDispatch();
          sentToPlatform = result.success;
          log.info({ messageId: result.messageId }, 'Response dispatched to platform (retry)');
        } catch (finalErr: any) {
          log.error({ err: finalErr.message }, 'Failed to dispatch response after retry');
          // Mark outbound message as failed in DB
          try {
            await prisma.message.updateMany({
              where: { conversationId: conversation.id, direction: 'out', content: aiResponse! },
              data: { metadata: { platform: msg.platform, sendFailed: true } as any },
            });
          } catch (_) {}
          // Notify dashboard via Socket.IO
          try {
            const { io: socketIo } = await import('../index');
            socketIo.to(msg.tenantId).emit('message_send_failed', {
              conversationId: conversation.id,
              leadId: lead.id,
              error: finalErr.message,
            });
          } catch (_) {}
        }
      }
    }

    // ── Step 6: Trigger Background Structuralizer ────────────────────
    runStructuralizer(msg.tenantId, lead.id, conversation.id).catch(err => {
      log.error({ err: err.message }, 'Background structuralizer failed');
    });

    return {
      success: true,
      conversationId: conversation.id,
      leadId: lead.id,
      aiResponse,
      sentToPlatform,
    };
  } catch (err: any) {
    log.error({ err: err.message }, 'Bridge pipeline failed');
    return {
      success: false,
      conversationId: '',
      leadId: '',
      aiResponse: null,
      sentToPlatform: false,
      error: err.message,
    };
  }
}

/**
 * Health check for the AI bridge.
 */
export async function bridgeHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, { status: string; error?: string }>;
}> {
  const components: Record<string, { status: string; error?: string }> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    components.database = { status: 'ok' };
  } catch (err: any) {
    components.database = { status: 'error', error: err.message };
  }

  try {
    const config = await (await import('./config')).resolveAiConfig('test-tenant-id');
    components.aiProvider = config.apiKey ? { status: 'ok' } : { status: 'error', error: 'No API key' };
  } catch (err: any) {
    components.aiProvider = { status: 'error', error: err.message };
  }

  try {
    const evoUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8081';
    const res = await fetch(`${evoUrl}/instance/fetchInstances`, {
      headers: { apikey: process.env.EVOLUTION_API_KEY || '' },
      signal: AbortSignal.timeout(5000),
    });
    components.evolutionApi = { status: res.ok ? 'ok' : 'error' };
  } catch (err: any) {
    components.evolutionApi = { status: 'error', error: err.message };
  }

  const allOk = Object.values(components).every(c => c.status === 'ok');
  return { status: allOk ? 'healthy' : 'degraded', components };
}
