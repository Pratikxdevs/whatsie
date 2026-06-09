import { NormalizedMessage } from './types';

/**
 * Normalizes an incoming Evolution API WhatsApp Webhook payload
 * safely converting it into the internal NormalizedMessage format.
 */
export function normalizeWhatsAppWebhook(
  tenantId: string, 
  rawPayload: any
): NormalizedMessage {
  // Extract standard EvoAPI properties. 
  const messageData = rawPayload?.data?.message || {};
  const remoteJid = rawPayload?.data?.key?.remoteJid || 'unknown';
  
  // Detect all media types
  const textMsg = messageData?.conversation || messageData?.extendedTextMessage?.text || null;
  const imageMsg = messageData?.imageMessage;
  const videoMsg = messageData?.videoMessage;
  const audioMsg = messageData?.audioMessage;
  const documentMsg = messageData?.documentMessage;
  const locationMsg = messageData?.locationMessage;
  const stickerMsg = messageData?.stickerMessage;

  // Build attachments array from all media types
  const attachments: NormalizedMessage['message']['attachments'] = [];

  if (imageMsg) {
    attachments.push({
      type: 'image',
      url: imageMsg.url || '',
      mimeType: imageMsg.mimetype || 'image/jpeg',
      size: imageMsg.fileLength || 0,
    });
  }

  if (videoMsg) {
    attachments.push({
      type: 'video',
      url: videoMsg.url || '',
      mimeType: videoMsg.mimetype || 'video/mp4',
      size: videoMsg.fileLength || 0,
    });
  }

  if (audioMsg) {
    attachments.push({
      type: 'audio',
      url: audioMsg.url || '',
      mimeType: audioMsg.mimetype || 'audio/ogg',
      size: audioMsg.fileLength || 0,
    });
  }

  if (documentMsg) {
    attachments.push({
      type: 'document',
      url: documentMsg.url || '',
      mimeType: documentMsg.mimetype || 'application/octet-stream',
      size: documentMsg.fileLength || 0,
      fileName: documentMsg.fileName || 'document',
    });
  }

  if (locationMsg) {
    attachments.push({
      type: 'location',
      url: '',
      mimeType: '',
      size: 0,
      latitude: locationMsg.degreesLatitude || 0,
      longitude: locationMsg.degreesLongitude || 0,
    });
  }

  if (stickerMsg) {
    attachments.push({
      type: 'sticker',
      url: stickerMsg.url || '',
      mimeType: stickerMsg.mimetype || 'image/webp',
      size: stickerMsg.fileLength || 0,
    });
  }

  // Determine primary message type
  let type: NormalizedMessage['type'] = 'text';
  if (imageMsg) type = 'image';
  else if (videoMsg) type = 'video';
  else if (audioMsg) type = 'audio';
  else if (documentMsg) type = 'file';
  else if (locationMsg) type = 'location';
  else if (stickerMsg) type = 'sticker';

  const normalized: NormalizedMessage = {
    tenantId,
    platform: 'whatsapp',
    userId: remoteJid, // Could strip @s.whatsapp.net here or later in CRM
    message: {
      text: textMsg,
      attachments,
      quickReplies: null
    },
    type,
    timestamp: new Date().toISOString(),
    metadata: {
      raw: rawPayload,
      replyTo: null,
      isForwarded: !!messageData?.extendedTextMessage?.contextInfo?.isForwarded,
      mentions: []
    }
  };

  return normalized;
}

/**
 * Renders an Outbound message mapping the unified response output 
 * tightly into the JSON format explicitly expected by Evolution API.
 */
export function renderOutboundWhatsApp(text: string, remoteJid: string) {
  return {
    number: remoteJid,
    textMessage: { text },
    options: {
      delay: 1200,
      presence: 'composing'
    }
  };
}
