/**
 * Response Router — central outbound dispatch.
 *
 * Normalizes platform-specific send logic so the worker pipeline
 * stays platform-agnostic. Handles:
 *   1. Session context window push (assistant reply)
 *   2. Outbound message persistence (PostgreSQL)
 *   3. Platform adapter selection + rate-limited send
 *   4. Delivery status update
 */

import { NormalizedMessage } from '../normalizer/types';
import { WhatsAppAdapter } from '../adapters/whatsapp.adapter';
import { SessionManager } from '../services/sessionManager';
import { prisma } from '../db/prisma';
import { messagesSentTotal } from '../metrics';
import { io } from '../index';

export class ResponseRouter {
  /**
   * Dispatch an outbound reply through the correct platform adapter.
   */
  static async dispatch(
    msg: NormalizedMessage,
    conversationId: string,
    responseText: string,
  ): Promise<{ success: boolean; messageId: string }> {
    // 1. Push assistant reply to session context window
    await SessionManager.pushMessage(msg.tenantId, msg.userId, {
      role: 'assistant',
      content: responseText,
    });

    // 2. Persist outbound message to PostgreSQL
    const outboundMessage = await prisma.message.create({
      data: {
        tenantId: msg.tenantId,
        conversationId,
        direction: 'out',
        content: responseText,
        messageType: 'text',
        metadata: { systemDispatched: true },
      },
    });

    // 3. Select platform adapter and send (rate-limited)
    try {
      switch (msg.platform) {
        case 'whatsapp': {
          const bot = await prisma.bot.findFirst({
            where: { tenantId: msg.tenantId, status: 'connected', platform: 'whatsapp' },
          });
          if (!bot?.sessionName) {
            throw new Error(`No connected WhatsApp bot found for tenant ${msg.tenantId}`);
          }
          await WhatsAppAdapter.sendMessage(bot.sessionName, msg.userId, responseText);
          messagesSentTotal.inc({ platform: 'whatsapp', tenantId: msg.tenantId });
          break;
        }

        default:
          throw new Error(`Unsupported platform: ${msg.platform}`);
      }
    } catch (error) {
      // Mark as failed in DB so UI updates, then re-throw so BullMQ can retry
      await prisma.message.update({
        where: { id: outboundMessage.id },
        data: {
          status: 'failed',
          metadata: { systemDispatched: true, error: (error as Error).message },
        },
      });

      // Emit failed message to UI immediately
      try {
        io.to(msg.tenantId).emit('new_message', {
          conversationId,
          message: {
            id: outboundMessage.id,
            direction: 'out',
            content: responseText,
            status: 'failed',
            createdAt: new Date().toISOString(),
          },
        });
      } catch (e) {}

      // Auto-disconnect bot if delivery failed due to unauthorized / session error
      try {
        const errorMsg = (error as Error).message || '';
        if (
          errorMsg.includes('[401]') ||
          errorMsg.includes('[400]') ||
          errorMsg.includes('[403]') ||
          errorMsg.includes('unauthorized') ||
          errorMsg.includes('not found') ||
          errorMsg.includes('logged out')
        ) {
          const bot = await prisma.bot.findFirst({
            where: { tenantId: msg.tenantId, platform: msg.platform, status: 'connected' },
          });
          if (bot) {
            await prisma.bot.update({
              where: { id: bot.id },
              data: { status: 'disconnected' },
            });
            io.to(msg.tenantId).emit('bot_status_change', {
              botId: bot.id,
              status: 'disconnected',
              platform: msg.platform,
            });
          }
        } else {
          // For other/timeout errors, asynchronously trigger a health check to reconcile status
          const bot = await prisma.bot.findFirst({
            where: { tenantId: msg.tenantId, platform: msg.platform, status: 'connected' },
          });
          if (bot?.sessionName) {
            WhatsAppAdapter.healthCheck(bot.sessionName).then((res) => {
              if (res.status === 'ok') {
                const state = res.state?.instance?.state;
                const finalStatus = 
                  state === 'open' ? 'connected' : 
                  state === 'close' ? 'disconnected' : 
                  state === 'connecting' ? 'starting' : 
                  'disconnected';
                if (finalStatus !== 'connected') {
                  io.to(msg.tenantId).emit('bot_status_change', {
                    botId: bot.id,
                    status: finalStatus,
                    platform: msg.platform,
                  });
                }
              }
            }).catch(() => {});
          }
        }
      } catch (e) {}

      throw error;
    }

    // 4. Update delivery status
    await prisma.message.update({
      where: { id: outboundMessage.id },
      data: {
        status: 'sent',
        metadata: { systemDispatched: true, deliveredAt: new Date().toISOString() },
      },
    });

    return { success: true, messageId: outboundMessage.id };
  }
}
