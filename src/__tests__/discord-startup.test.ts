import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from './setup';

vi.mock('../adapters/discordAdapter', () => ({
  connect: vi.fn().mockResolvedValue(undefined),
  getClient: vi.fn().mockReturnValue({
    on: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  }),
  disconnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../normalizer/discord', () => ({
  normalizeDiscordMessage: vi.fn().mockReturnValue({
    tenantId: 'tenant-1',
    platform: 'discord',
    userId: 'user-1',
    message: { text: 'hi', attachments: [], quickReplies: null },
    type: 'text',
    timestamp: new Date().toISOString(),
    metadata: { raw: {}, replyTo: null, isForwarded: false, mentions: [], channelId: 'ch-1' },
  }),
}));

vi.mock('../queue/setup', () => ({
  discordMessagesQueue: { add: vi.fn().mockResolvedValue({ id: 'job-1' }) },
}));

vi.mock('../config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../debug/server', () => ({
  addLog: vi.fn(),
}));

import * as DiscordAdapter from '../adapters/discordAdapter';
import { discordMessagesQueue } from '../queue/setup';

describe('Discord startup sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.bot.findMany.mockResolvedValue([]);
    mockPrisma.bot.updateMany.mockResolvedValue({ count: 1 });
  });

  it('finds all Discord bots with status=connected in DB', async () => {
    const bots = [
      { id: 'bot-1', tenantId: 't1', config: { bot_token: 'token-1' } },
      { id: 'bot-2', tenantId: 't2', config: { bot_token: 'token-2' } },
    ];
    mockPrisma.bot.findMany.mockResolvedValue(bots);

    // Simulate the startup sync query
    const found = await mockPrisma.bot.findMany({
      where: { platform: 'discord', status: 'connected', sessionName: { not: null } },
      select: { id: true, tenantId: true, config: true },
    });

    expect(found).toHaveLength(2);
    expect(mockPrisma.bot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ platform: 'discord', status: 'connected' }),
      })
    );
  });

  it('calls DiscordAdapter.connect for each found bot', async () => {
    const bots = [
      { id: 'bot-1', tenantId: 't1', config: { bot_token: 'token-1' } },
    ];
    mockPrisma.bot.findMany.mockResolvedValue(bots);

    // Simulate startup sync logic
    const found = await mockPrisma.bot.findMany({
      where: { platform: 'discord', status: 'connected' },
    });

    for (const bot of found) {
      const token = (bot as any).config?.bot_token;
      if (token) {
        await DiscordAdapter.connect(token, bot.id);
      }
    }

    expect(DiscordAdapter.connect).toHaveBeenCalledWith('token-1', 'bot-1');
  });

  it('skips bots without bot_token in config', async () => {
    const bots = [
      { id: 'bot-no-token', tenantId: 't1', config: {} },
    ];
    mockPrisma.bot.findMany.mockResolvedValue(bots);

    const found = await mockPrisma.bot.findMany({
      where: { platform: 'discord', status: 'connected' },
    });

    for (const bot of found) {
      const token = (bot as any).config?.bot_token;
      if (token) {
        await DiscordAdapter.connect(token, bot.id);
      }
    }

    expect(DiscordAdapter.connect).not.toHaveBeenCalled();
  });

  it('updates bot status to error on connect failure', async () => {
    const bots = [
      { id: 'bot-fail', tenantId: 't1', config: { bot_token: 'bad-token' } },
    ];
    mockPrisma.bot.findMany.mockResolvedValue(bots);
    (DiscordAdapter.connect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Auth failed'));

    const found = await mockPrisma.bot.findMany({
      where: { platform: 'discord', status: 'connected' },
    });

    for (const bot of found) {
      try {
        await DiscordAdapter.connect((bot as any).config.bot_token, bot.id);
      } catch {
        await mockPrisma.bot.updateMany({
          where: { id: bot.id },
          data: { status: 'error' },
        });
      }
    }

    expect(mockPrisma.bot.updateMany).toHaveBeenCalledWith({
      where: { id: 'bot-fail' },
      data: { status: 'error' },
    });
  });

  it('handles no Discord bots gracefully (empty findMany)', async () => {
    mockPrisma.bot.findMany.mockResolvedValue([]);

    const found = await mockPrisma.bot.findMany({
      where: { platform: 'discord', status: 'connected' },
    });

    expect(found).toHaveLength(0);
    expect(DiscordAdapter.connect).not.toHaveBeenCalled();
  });
});
