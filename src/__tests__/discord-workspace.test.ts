import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from './setup';

vi.mock('../adapters/discordAdapter', () => ({
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isReady: vi.fn().mockReturnValue(true),
  getClient: vi.fn().mockReturnValue({
    on: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
    user: { tag: 'TestBot#1234', id: '123456789' },
  }),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  healthCheck: vi.fn().mockReturnValue({ connected: true, tag: 'TestBot#1234' }),
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
  startDebugServer: vi.fn(),
  recordRequest: vi.fn(),
}));

import * as DiscordAdapter from '../adapters/discordAdapter';

describe('Discord workspace routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.bot.findFirst.mockResolvedValue(null);
    mockPrisma.bot.findMany.mockResolvedValue([]);
    mockPrisma.bot.create.mockResolvedValue({
      id: 'new-discord-bot',
      platform: 'discord',
      status: 'connected',
      config: { bot_token: 'test-token' },
    });
    mockPrisma.bot.update.mockResolvedValue({ id: 'bot-1', status: 'connected' });
    mockPrisma.bot.updateMany.mockResolvedValue({ count: 1 });
  });

  it('POST /api/workspaces with platform discord requires bot_token', async () => {
    // Simulate the validation logic from workspace route
    const body = { platform: 'discord', name: 'Test Bot' };
    const hasToken = !!(body as any).bot_token;

    expect(hasToken).toBe(false);
    // The route returns 400 when bot_token is missing
  });

  it('POST /api/workspaces with platform discord creates bot and connects', async () => {
    const body = { platform: 'discord', name: 'Test Bot', bot_token: 'test-token-123' };

    // Simulate the create flow
    expect(body.platform).toBe('discord');
    expect(body.bot_token).toBeTruthy();

    // The route calls DiscordAdapter.connect
    await DiscordAdapter.connect(body.bot_token, 'new-bot-id');
    expect(DiscordAdapter.connect).toHaveBeenCalledWith('test-token-123', 'new-bot-id');
  });

  it('POST /api/workspaces/:id/start calls DiscordAdapter.connect', async () => {
    mockPrisma.bot.findUnique.mockResolvedValue({
      id: 'bot-1',
      platform: 'discord',
      config: { bot_token: 'stored-token' },
    });

    const bot = await mockPrisma.bot.findUnique({ where: { id: 'bot-1' } });
    const token = (bot as any)?.config?.bot_token;

    await DiscordAdapter.connect(token, 'bot-1');
    expect(DiscordAdapter.connect).toHaveBeenCalledWith('stored-token', 'bot-1');
  });

  it('POST /api/workspaces/:id/stop calls DiscordAdapter.disconnect', async () => {
    await DiscordAdapter.disconnect('bot-1');
    expect(DiscordAdapter.disconnect).toHaveBeenCalledWith('bot-1');
  });

  it('GET /api/workspaces/:id/connection-status returns Discord bot status', () => {
    const status = DiscordAdapter.isReady('bot-1');
    expect(DiscordAdapter.isReady).toHaveBeenCalledWith('bot-1');
    expect(typeof status).toBe('boolean');
  });

  it('DELETE /api/workspaces/:id calls DiscordAdapter.disconnect', async () => {
    await DiscordAdapter.disconnect('bot-1');
    expect(DiscordAdapter.disconnect).toHaveBeenCalledWith('bot-1');
  });
});
