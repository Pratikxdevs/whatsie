/**
 * WhatsApp Adapter — thin wrapper used by the BullMQ worker.
 * Delegates to the central Evolution API adapter so there is only one place
 * to update if Evolution API endpoints change.
 */

import { sendText, getConnectionState } from './evolutionApi';
import { sendWithRateLimit } from '../rateLimiter';

export class WhatsAppAdapter {
  /**
   * Sends a plain text message.
   * Automatically throttled by the rate limiter (1 msg/sec).
   * @param sessionName — Evolution API instance name (bot.sessionName)
   * @param remoteJid — WhatsApp JID, e.g. "5511999999999@s.whatsapp.net"
   * @param text — message body
   */
  static async sendMessage(sessionName: string, remoteJid: string, text: string) {
    return sendWithRateLimit('whatsapp', async () => {
      try {
        return await sendText(sessionName, {
          number: remoteJid,
          text,
          delay: 500,
        });
      } catch (err: any) {
        const status = err?.response?.status || 'UNKNOWN';
        const details = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
        throw new Error(`Delivery failed [${status}]: ${details}`);
      }
    });
  }

  /**
   * Checks the health/connection state of the instance.
   * Also keeps Bot.status in sync in the database.
   * @param sessionName — Evolution API instance name (bot.sessionName)
   */
  static async healthCheck(sessionName: string) {
    try {
      const state = await getConnectionState(sessionName);
      return { status: 'ok', state };
    } catch (error: any) {
      return { status: 'error', error: error?.response?.data || error.message };
    }
  }
}
