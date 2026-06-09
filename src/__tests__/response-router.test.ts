import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from './setup';

// Mock dependencies before importing ResponseRouter
vi.mock('../adapters/whatsapp.adapter', () => ({
  WhatsAppAdapter: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../adapters/telegramAdapter', () => ({
  sendMessage: vi.fn().mockResolvedValue({ status: 'sent', message_id: 1, chat_id: 123 }),
}));

vi.mock('../adapters/discordAdapter', () => ({
  sendMessage: vi.fn().mockResolvedValue(undefined),
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isReady: vi.fn().mockReturnValue(true),
  getClient: vi.fn(),
}));

vi.mock('../metrics', () => ({
  messagesSentTotal: { inc: vi.fn() },
  register: { contentType: 'text/plain', metrics: vi.fn().mockResolvedValue('') },
  httpRequestDurationSeconds: { startTimer: vi.fn().mockReturnValue(vi.fn()) },
}));

vi.mock('../services/sessionManager', () => ({
  SessionManager: {
    pushMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../rateLimiter', () => ({
  sendWithRateLimit: vi.fn().mockImplementation((_p: string, fn: () => Promise<any>) => fn()),
}));

vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { ResponseRouter } from '../router/index';
import { WhatsAppAdapter } from '../adapters/whatsapp.adapter';
import * as TelegramAdapter from '../adapters/telegramAdapter';
import * as DiscordAdapter from '../adapters/discordAdapter';
import { NormalizedMessage } from '../normalizer/types';

function createNormalizedMessage(overrides: Partial<NormalizedMessage> = {}): NormalizedMessage {
  return {
    tenantId: 'tenant-1',
    platform: 'whatsapp',
    userId: 'user-123',
    message: { text: 'Hello', attachments: [], quickReplies: null },
    type: 'text',
    timestamp: new Date().toISOString(),
    metadata: {
      raw: {},
      replyTo: null,
      isForwarded: false,
      mentions: [],
      chatId: 'chat-123',
      ...((overrides.metadata as any) || {}),
    },
    ...overrides,
  };
}

describe('ResponseRouter.dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.message.create.mockResolvedValue({ id: 'msg-out-001' });
    mockPrisma.message.update.mockResolvedValue({ id: 'msg-out-001' });
    mockPrisma.bot.findFirst.mockResolvedValue({ id: 'bot-1', sessionName: 'bot_testinstance', status: 'connected' });
  });

  it('dispatches WhatsApp message via WhatsAppAdapter', async () => {
    const msg = createNormalizedMessage({ platform: 'whatsapp', userId: '55119999@s.whatsapp.net' });

    const result = await ResponseRouter.dispatch(msg, 'conv-1', 'Reply text');

    expect(WhatsAppAdapter.sendMessage).toHaveBeenCalledWith('bot_testinstance', '55119999@s.whatsapp.net', 'Reply text');
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg-out-001');
  });

  it('dispatches Telegram message via TelegramAdapter.sendMessage with chatId', async () => {
    const msg = createNormalizedMessage({
      platform: 'telegram',
      userId: 'tg-user-1',
      metadata: {
        raw: {},
        replyTo: null,
        isForwarded: false,
        mentions: [],
        chatId: 'tg-chat-999',
      },
    });

    await ResponseRouter.dispatch(msg, 'conv-2', 'Telegram reply');

    expect(TelegramAdapter.sendMessage).toHaveBeenCalledWith('bot_testinstance', 'tg-chat-999', 'Telegram reply');
  });

  it('falls back to userId when chatId is missing for Telegram', async () => {
    const msg = createNormalizedMessage({
      platform: 'telegram',
      userId: 'tg-user-fallback',
      metadata: {
        raw: {},
        replyTo: null,
        isForwarded: false,
        mentions: [],
      },
    });

    await ResponseRouter.dispatch(msg, 'conv-3', 'Fallback reply');

    expect(TelegramAdapter.sendMessage).toHaveBeenCalledWith('bot_testinstance', 'tg-user-fallback', 'Fallback reply');
  });

  it('throws on unsupported platform', async () => {
    const msg = createNormalizedMessage({ platform: 'slack' as any });

    await expect(ResponseRouter.dispatch(msg, 'conv-x', 'text')).rejects.toThrow(
      'Unsupported platform: slack',
    );
  });

  it('persists outbound message to prisma', async () => {
    const msg = createNormalizedMessage({ tenantId: 'tenant-abc' });

    await ResponseRouter.dispatch(msg, 'conv-persist', 'Stored message');

    expect(mockPrisma.message.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-abc',
        conversationId: 'conv-persist',
        direction: 'out',
        content: 'Stored message',
        messageType: 'text',
        metadata: { systemDispatched: true },
      },
    });
  });

  it('updates message delivery status after sending', async () => {
    const msg = createNormalizedMessage();

    await ResponseRouter.dispatch(msg, 'conv-1', 'Delivered');

    expect(mockPrisma.message.update).toHaveBeenCalledWith({
      where: { id: 'msg-out-001' },
      data: {
        metadata: expect.objectContaining({ systemDispatched: true }),
      },
    });
  });

  it('dispatches Discord message via DiscordAdapter.sendMessage with channelId', async () => {
    mockPrisma.bot.findFirst.mockResolvedValue({ id: 'dc-bot-1', sessionName: 'dc_session', status: 'connected' });

    const msg = createNormalizedMessage({
      platform: 'discord',
      userId: 'dc-user-1',
      metadata: {
        raw: {},
        replyTo: null,
        isForwarded: false,
        mentions: [],
        channelId: 'dc-channel-999',
      },
    });

    await ResponseRouter.dispatch(msg, 'conv-dc-1', 'Discord reply');

    expect(DiscordAdapter.sendMessage).toHaveBeenCalledWith('dc-channel-999', 'Discord reply', 'dc-bot-1');
  });

  it('throws for Discord when no connected bot found', async () => {
    mockPrisma.bot.findFirst.mockResolvedValue(null);

    const msg = createNormalizedMessage({
      platform: 'discord',
      userId: 'dc-user-1',
      metadata: {
        raw: {},
        replyTo: null,
        isForwarded: false,
        mentions: [],
        channelId: 'dc-channel-1',
      },
    });

    await expect(ResponseRouter.dispatch(msg, 'conv-dc-2', 'text')).rejects.toThrow(
      'No connected Discord bot found',
    );
  });

  it('throws for Discord when channelId is missing in metadata', async () => {
    mockPrisma.bot.findFirst.mockResolvedValue({ id: 'dc-bot-1', status: 'connected' });

    const msg = createNormalizedMessage({
      platform: 'discord',
      userId: 'dc-user-1',
      metadata: {
        raw: {},
        replyTo: null,
        isForwarded: false,
        mentions: [],
      },
    });

    await expect(ResponseRouter.dispatch(msg, 'conv-dc-3', 'text')).rejects.toThrow(
      'No channelId in message metadata',
    );
  });
});
