import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from './setup';

vi.mock('../adapters/discordAdapter', () => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isReady: vi.fn().mockReturnValue(true),
  getClient: vi.fn().mockReturnValue({
    on: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  }),
  sendMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../adapters/whatsapp.adapter', () => ({
  WhatsAppAdapter: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../adapters/telegramAdapter', () => ({
  sendMessage: vi.fn().mockResolvedValue({ status: 'sent', message_id: 1, chat_id: 123 }),
  sendMessageToUser: vi.fn().mockResolvedValue({ status: 'sent' }),
}));

vi.mock('../adapters/twitter.adapter', () => ({
  TwitterAdapter: {
    sendMessage: vi.fn().mockResolvedValue({}),
    sendTweetReply: vi.fn().mockResolvedValue({}),
    postTweet: vi.fn().mockResolvedValue({}),
  },
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

vi.mock('../debug/server', () => ({
  addLog: vi.fn(),
}));

vi.mock('../metrics', () => ({
  messagesSentTotal: { inc: vi.fn() },
  register: { contentType: 'text/plain', metrics: vi.fn().mockResolvedValue('') },
  httpRequestDurationSeconds: { startTimer: vi.fn().mockReturnValue(vi.fn()) },
}));

import { ResponseRouter } from '../router/index';
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

describe('ResponseRouter.dispatch — Discord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.message.create.mockResolvedValue({ id: 'msg-out-001' });
    mockPrisma.message.update.mockResolvedValue({ id: 'msg-out-001' });
  });

  it('dispatches Discord message via DiscordAdapter.sendMessage', async () => {
    mockPrisma.bot.findFirst.mockResolvedValue({ id: 'dc-bot-1', status: 'connected', platform: 'discord' });

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

  it('throws if no connected Discord bot found', async () => {
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

    await expect(
      ResponseRouter.dispatch(msg, 'conv-dc-2', 'text')
    ).rejects.toThrow('No connected Discord bot found');
  });

  it('throws if channelId is missing in metadata', async () => {
    mockPrisma.bot.findFirst.mockResolvedValue({ id: 'dc-bot-1', status: 'connected', platform: 'discord' });

    const msg = createNormalizedMessage({
      platform: 'discord',
      userId: 'dc-user-1',
      metadata: {
        raw: {},
        replyTo: null,
        isForwarded: false,
        mentions: [],
        // No channelId
      },
    });

    await expect(
      ResponseRouter.dispatch(msg, 'conv-dc-3', 'text')
    ).rejects.toThrow('No channelId in message metadata');
  });

  it('persists outbound message for Discord', async () => {
    mockPrisma.bot.findFirst.mockResolvedValue({ id: 'dc-bot-1', status: 'connected', platform: 'discord' });

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

    const result = await ResponseRouter.dispatch(msg, 'conv-dc-4', 'Persisted');

    expect(mockPrisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        conversationId: 'conv-dc-4',
        direction: 'out',
        content: 'Persisted',
      }),
    });
    expect(result.success).toBe(true);
  });
});
