/**
 * Evolution API v2.3 — Complete Adapter
 *
 * Every endpoint from the Postman collection is exposed as a typed function.
 * Key operations (create/delete instance) are synced to the Prisma DB (Bot model).
 * All calls flow through a single axios client with automatic apikey injection.
 */

import axios, { AxiosInstance } from 'axios';
import { prisma } from '../db/prisma';
import { createProxiedClient } from '../middleware/httpProxy';

// ---------------------------------------------------------------------------
// Shared HTTP client
// ---------------------------------------------------------------------------
const EVO_URL  = process.env.EVOLUTION_API_URL || 'http://localhost:8081';
const EVO_KEY  = process.env.EVOLUTION_API_KEY || '';

const evo: AxiosInstance = createProxiedClient({
  baseURL: EVO_URL,
  headers: {
    'apikey': EVO_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
  proxy: { logPrefix: '[EVO]', maxRetries: 2, cacheTtlMs: 10_000 },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CreateInstanceOptions {
  instanceName: string;
  qrcode?: boolean;
  integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS';
  /** DB context — when provided the created instance is saved to Bot table */
  tenantId?: string;
  webhookUrl?: string;
  /** Platform identifier for the Bot record (defaults to 'whatsapp') */
  platform?: string;
}

export interface SendTextOptions {
  number: string;
  text: string;
  delay?: number;
  quoted?: { key: { id: string }; message?: { conversation: string } };
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
}

export interface SendMediaOptions {
  number: string;
  mediatype: 'image' | 'video' | 'document' | 'audio';
  mimetype: string;
  caption?: string;
  media: string; // URL or base64
  fileName?: string;
  delay?: number;
}

export interface SendAudioOptions {
  number: string;
  audio: string; // URL or base64
  delay?: number;
  encoding?: boolean;
}

export interface SendLocationOptions {
  number: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  delay?: number;
}

export interface SendContactOptions {
  number: string;
  contact: Array<{
    fullName: string;
    wuid: string;
    phoneNumber: string;
    organization?: string;
    email?: string;
    url?: string;
  }>;
}

export interface SendReactionOptions {
  key: { remoteJid: string; fromMe: boolean; id: string };
  reaction: string;
}

export interface SendPollOptions {
  number: string;
  name: string;
  selectableCount: number;
  values: string[];
  delay?: number;
}

export interface SendListOptions {
  number: string;
  title: string;
  description: string;
  buttonText: string;
  footerText?: string;
  sections: Array<{
    title: string;
    rows: Array<{ title: string; description?: string; rowId: string }>;
  }>;
  delay?: number;
}

export interface SendButtonOptions {
  number: string;
  title: string;
  description?: string;
  footer?: string;
  buttons: Array<{
    type: 'reply' | 'copy' | 'url' | 'call' | 'pix';
    displayText: string;
    id?: string;
    copyCode?: string;
    url?: string;
    phoneNumber?: string;
  }>;
}

export interface PrivacySettings {
  readreceipts?: 'all' | 'none';
  profile?: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  status?: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  online?: 'all' | 'match_last_seen';
  last?: 'all' | 'contacts' | 'contact_blacklist' | 'none';
  groupadd?: 'all' | 'contacts' | 'contact_blacklist';
}

// ---------------------------------------------------------------------------
// ── INSTANCE ──────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

/**
 * Creates a WhatsApp instance on Evolution API.
 * If `tenantId` is supplied, also upserts a Bot record in the database.
 */
export async function createInstance(opts: CreateInstanceOptions) {
  const payload: Record<string, any> = {
    instanceName: opts.instanceName,
    qrcode: opts.qrcode ?? true,
    integration: opts.integration ?? 'WHATSAPP-BAILEYS',
  };

  if (opts.webhookUrl) {
    payload.webhook = {
      url: opts.webhookUrl,
      byEvents: false,
      base64: false,
      headers: { 
        'Content-Type': 'application/json',
        'authorization': `Bearer ${process.env.EVOLUTION_API_SECRET}` 
      },
      events: [
        'QRCODE_UPDATED',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'MESSAGES_DELETE',
        'SEND_MESSAGE',
        'CONNECTION_UPDATE',
      ],
    };
  }

  const { data } = await evo.post('/instance/create', payload);

  // DB sync — upsert Bot row when caller provides tenantId
  if (opts.tenantId) {
    // Extract only safe metadata from Evolution API response (no secrets)
    const evoMetadata = data && typeof data === 'object' ? {
      instance: data.instance,
      instanceId: data.instanceId,
      owner: data.owner,
      integration: data.integration,
      status: data.status,
    } : {};

    await prisma.bot.upsert({
      where: { sessionName: opts.instanceName },
      update: { status: 'starting', updatedAt: new Date() },
      create: {
        tenantId: opts.tenantId,
        displayName: opts.instanceName,
        platform: opts.platform || 'whatsapp',
        sessionName: opts.instanceName,
        status: 'pending_qr',
        config: evoMetadata,
      },
    });
  }

  return data;
}

/** Fetch all or a specific instance */
export async function fetchInstances(instanceName?: string) {
  const params: Record<string, string> = {};
  if (instanceName) params.instanceName = instanceName;
  const { data } = await evo.get('/instance/fetchInstances', { params });
  return data;
}

/** Returns the QR code image needed to connect the instance */
export async function connectInstance(instanceName: string, number?: string) {
  const params: Record<string, string> = {};
  if (number) params.number = number;
  const { data } = await evo.get(`/instance/connect/${instanceName}`, { params });
  return data;
}

/** Restart an instance */
export async function restartInstance(instanceName: string) {
  const { data } = await evo.post(`/instance/restart/${instanceName}`);
  return data;
}

/** Set global presence (available / unavailable) */
export async function setPresence(instanceName: string, presence: 'available' | 'unavailable') {
  const { data } = await evo.post(`/instance/setPresence/${instanceName}`, { presence });
  return data;
}

/** Get connection state */
export async function getConnectionState(instanceName: string) {
  const { data } = await evo.get(`/instance/connectionState/${instanceName}`);

  // Evolution API returns state at data.instance.state
  const state = data?.instance?.state;
  const newStatus = 
    state === 'open' ? 'connected' : 
    state === 'close' ? 'disconnected' : 
    state === 'connecting' ? 'starting' : 
    undefined;

  // DB sync — only write if we got a definitive state and it changed
  if (newStatus) {
    const bot = await prisma.bot.findFirst({ where: { sessionName: instanceName }, select: { status: true } });
    if (bot && bot.status !== newStatus) {
      await prisma.bot.updateMany({
        where: { sessionName: instanceName },
        data: { status: newStatus },
      });
    }
  }

  return data;
}

/** Logout (disconnect) instance — does NOT delete it from Evolution */
export async function logoutInstance(instanceName: string) {
  const { data } = await evo.delete(`/instance/logout/${instanceName}`);

  await prisma.bot.updateMany({
    where: { sessionName: instanceName },
    data: { status: 'disconnected' },
  });

  return data;
}

/**
 * Permanently deletes an instance from Evolution API.
 * Also removes the Bot row from the database.
 */
export async function deleteInstance(instanceName: string) {
  const { data } = await evo.delete(`/instance/delete/${instanceName}`);

  await prisma.bot.deleteMany({ where: { sessionName: instanceName } });

  return data;
}

// ---------------------------------------------------------------------------
// ── PROXY ─────────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export async function setProxy(
  instanceName: string,
  opts: { enabled: boolean; host: string; port: string; protocol: string; username?: string; password?: string }
) {
  const { data } = await evo.post(`/proxy/set/${instanceName}`, opts);
  return data;
}

export async function findProxy(instanceName: string) {
  const { data } = await evo.get(`/proxy/find/${instanceName}`);
  return data;
}

// ---------------------------------------------------------------------------
// ── SETTINGS ──────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export interface BotSettings {
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  syncFullHistory?: boolean;
  readStatus?: boolean;
}

export async function setSettings(instanceName: string, settings: BotSettings) {
  const { data } = await evo.post(`/settings/set/${instanceName}`, settings);

  // DB sync — merge settings into existing bot config (never overwrite)
  const bot = await prisma.bot.findFirst({ where: { sessionName: instanceName } });
  const existingConfig = bot?.config && typeof bot.config === 'object' ? (bot.config as Record<string, any>) : {};
  await prisma.bot.updateMany({
    where: { sessionName: instanceName },
    data: { config: { ...existingConfig, ...settings } as any },
  });

  return data;
}

export async function findSettings(instanceName: string) {
  const { data } = await evo.get(`/settings/find/${instanceName}`);
  return data;
}

// ---------------------------------------------------------------------------
// ── SEND MESSAGE ──────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

/** Send a plain text WhatsApp message */
export async function sendText(instanceName: string, opts: SendTextOptions) {
  const { data } = await evo.post(`/message/sendText/${instanceName}`, opts);
  return data;
}

/** Send a media message (image, video, document) by URL or base64 */
export async function sendMedia(instanceName: string, opts: SendMediaOptions) {
  const { data } = await evo.post(`/message/sendMedia/${instanceName}`, opts);
  return data;
}

/** Send a WhatsApp narrated audio (voice note) */
export async function sendAudio(instanceName: string, opts: SendAudioOptions) {
  const { data } = await evo.post(`/message/sendWhatsAppAudio/${instanceName}`, opts);
  return data;
}

/** Send a PTV (picture-in-picture video) */
export async function sendPtv(instanceName: string, opts: { number: string; video: string; delay?: number }) {
  const { data } = await evo.post(`/message/sendPtv/${instanceName}`, opts);
  return data;
}

/** Send a WhatsApp Status / Story */
export async function sendStatus(
  instanceName: string,
  opts: {
    type: 'text' | 'image' | 'video' | 'audio';
    content: string;
    caption?: string;
    backgroundColor?: string;
    font?: 1 | 2 | 3 | 4 | 5;
    allContacts?: boolean;
    statusJidList?: string[];
  }
) {
  const { data } = await evo.post(`/message/sendStatus/${instanceName}`, opts);
  return data;
}

/** Send a sticker */
export async function sendSticker(instanceName: string, opts: { number: string; sticker: string; delay?: number }) {
  const { data } = await evo.post(`/message/sendSticker/${instanceName}`, opts);
  return data;
}

/** Send a location pin */
export async function sendLocation(instanceName: string, opts: SendLocationOptions) {
  const { data } = await evo.post(`/message/sendLocation/${instanceName}`, opts);
  return data;
}

/** Send a contact card */
export async function sendContact(instanceName: string, opts: SendContactOptions) {
  const { data } = await evo.post(`/message/sendContact/${instanceName}`, opts);
  return data;
}

/** React to a message with an emoji */
export async function sendReaction(instanceName: string, opts: SendReactionOptions) {
  const { data } = await evo.post(`/message/sendReaction/${instanceName}`, opts);
  return data;
}

/** Send a poll */
export async function sendPoll(instanceName: string, opts: SendPollOptions) {
  const { data } = await evo.post(`/message/sendPoll/${instanceName}`, opts);
  return data;
}

/** Send a list picker */
export async function sendList(instanceName: string, opts: SendListOptions) {
  const { data } = await evo.post(`/message/sendList/${instanceName}`, opts);
  return data;
}

/** Send reply buttons */
export async function sendButtons(instanceName: string, opts: SendButtonOptions) {
  const { data } = await evo.post(`/message/sendButtons/${instanceName}`, opts);
  return data;
}

// ---------------------------------------------------------------------------
// ── CALL ─────────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

/** Trigger a fake incoming call */
export async function fakeCall(instanceName: string, opts: { number: string; isVideo?: boolean; callDuration?: number }) {
  const { data } = await evo.post(`/call/offer/${instanceName}`, opts);
  return data;
}

// ---------------------------------------------------------------------------
// ── CHAT ──────────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

/** Check if numbers are registered on WhatsApp */
export async function checkWhatsAppNumbers(instanceName: string, numbers: string[]) {
  const { data } = await evo.post(`/chat/whatsappNumbers/${instanceName}`, { numbers });
  return data;
}

/** Mark messages as read */
export async function markMessagesRead(
  instanceName: string,
  messages: Array<{ remoteJid: string; fromMe: boolean; id: string }>
) {
  const { data } = await evo.post(`/chat/markMessageAsRead/${instanceName}`, { readMessages: messages });
  return data;
}

/** Archive or unarchive a chat */
export async function archiveChat(
  instanceName: string,
  opts: {
    lastMessage: { key: { remoteJid: string; fromMe: boolean; id: string } };
    chat: string;
    archive: boolean;
  }
) {
  const { data } = await evo.post(`/chat/archiveChat/${instanceName}`, opts);
  return data;
}

/** Mark a chat as unread */
export async function markChatUnread(
  instanceName: string,
  opts: { lastMessage: { key: { remoteJid: string; fromMe: boolean; id: string } }; chat: string }
) {
  const { data } = await evo.post(`/chat/markChatUnread/${instanceName}`, opts);
  return data;
}

/** Delete a message for everyone */
export async function deleteMessageForEveryone(
  instanceName: string,
  opts: { id: string; remoteJid: string; fromMe: boolean; participant?: string }
) {
  const { data } = await evo.delete(`/chat/deleteMessageForEveryone/${instanceName}`, { data: opts });
  return data;
}

/** Fetch a contact's profile picture URL */
export async function fetchProfilePicture(instanceName: string, number: string) {
  const { data } = await evo.post(`/chat/fetchProfilePictureUrl/${instanceName}`, { number });
  return data;
}

/** Get base64 content of a media message */
export async function getMediaBase64(instanceName: string, messageId: string, convertToMp4 = false) {
  const { data } = await evo.post(`/chat/getBase64FromMediaMessage/${instanceName}`, {
    message: { key: { id: messageId } },
    convertToMp4,
  });
  return data;
}

/** Edit / update a sent message */
export async function updateMessage(
  instanceName: string,
  opts: { number: string; key: { remoteJid: string; fromMe: boolean; id: string }; text: string }
) {
  const { data } = await evo.post(`/chat/updateMessage/${instanceName}`, opts);
  return data;
}

/** Send typing / recording presence to a number */
export async function sendPresenceToChat(
  instanceName: string,
  opts: { number: string; delay?: number; presence: 'composing' | 'recording' | 'paused' }
) {
  const { data } = await evo.post(`/chat/sendPresence/${instanceName}`, opts);
  return data;
}

/** Block or unblock a contact */
export async function updateBlockStatus(
  instanceName: string,
  opts: { number: string; status: 'block' | 'unblock' }
) {
  const { data } = await evo.post(`/message/updateBlockStatus/${instanceName}`, opts);
  return data;
}

/** Find contacts */
export async function findContacts(instanceName: string, whereId?: string) {
  const body = whereId ? { where: { id: whereId } } : { where: {} };
  const { data } = await evo.post(`/chat/findContacts/${instanceName}`, body);
  return data;
}

/** Find messages with optional pagination */
export async function findMessages(
  instanceName: string,
  opts: { remoteJid?: string; page?: number; offset?: number }
) {
  const body: Record<string, any> = { where: {} };
  if (opts.remoteJid) body.where.key = { remoteJid: opts.remoteJid };
  if (opts.page) body.page = opts.page;
  if (opts.offset) body.offset = opts.offset;
  const { data } = await evo.post(`/chat/findMessages/${instanceName}`, body);
  return data;
}

/** Find chats */
export async function findChats(instanceName: string) {
  const { data } = await evo.post(`/chat/findChats/${instanceName}`);
  return data;
}

// ---------------------------------------------------------------------------
// ── LABEL ─────────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export async function findLabels(instanceName: string) {
  const { data } = await evo.get(`/label/findLabels/${instanceName}`);
  return data;
}

export async function handleLabel(
  instanceName: string,
  opts: { number: string; labelId: string; action: 'add' | 'remove' }
) {
  const { data } = await evo.post(`/label/handleLabel/${instanceName}`, opts);
  return data;
}

// ---------------------------------------------------------------------------
// ── PROFILE SETTINGS ──────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export async function fetchBusinessProfile(instanceName: string, number: string) {
  const { data } = await evo.post(`/chat/fetchBusinessProfile/${instanceName}`, { number });
  return data;
}

export async function fetchProfile(instanceName: string, number: string) {
  const { data } = await evo.post(`/chat/fetchProfile/${instanceName}`, { number });
  return data;
}

export async function updateProfileName(instanceName: string, name: string) {
  const { data } = await evo.post(`/chat/updateProfileName/${instanceName}`, { name });
  return data;
}

export async function updateProfileStatus(instanceName: string, status: string) {
  const { data } = await evo.post(`/chat/updateProfileStatus/${instanceName}`, { status });
  return data;
}

export async function updateProfilePicture(instanceName: string, pictureUrl: string) {
  const { data } = await evo.post(`/chat/updateProfilePicture/${instanceName}`, { picture: pictureUrl });
  return data;
}

export async function removeProfilePicture(instanceName: string) {
  const { data } = await evo.delete(`/chat/removeProfilePicture/${instanceName}`);
  return data;
}

export async function fetchPrivacySettings(instanceName: string) {
  const { data } = await evo.get(`/chat/fetchPrivacySettings/${instanceName}`);
  return data;
}

export async function updatePrivacySettings(instanceName: string, settings: PrivacySettings) {
  const { data } = await evo.post(`/chat/updatePrivacySettings/${instanceName}`, settings);
  return data;
}

// ---------------------------------------------------------------------------
// ── GROUP ─────────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export async function createGroup(
  instanceName: string,
  opts: { subject: string; description?: string; participants: string[] }
) {
  const { data } = await evo.post(`/group/create/${instanceName}`, opts);
  return data;
}

export async function updateGroupPicture(instanceName: string, groupJid: string, imageUrl: string) {
  const { data } = await evo.post(`/group/updateGroupPicture/${instanceName}`, { image: imageUrl }, {
    params: { groupJid }
  });
  return data;
}
