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

    // 4. Update delivery status
    await prisma.message.update({
      where: { id: outboundMessage.id },
      data: {
        metadata: { systemDispatched: true, deliveredAt: new Date().toISOString() },
      },
    });

    return { success: true, messageId: outboundMessage.id };
  }
}
