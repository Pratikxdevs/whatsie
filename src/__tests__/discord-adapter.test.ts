import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../debug/server', () => ({
  addLog: vi.fn(),
}));

vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import * as DiscordAdapter from '../adapters/discordAdapter';

describe('DiscordAdapter', () => {
  beforeEach(async () => {
    // Clean up any stored clients between tests
    await DiscordAdapter.disconnect('bot-1').catch(() => {});
    await DiscordAdapter.disconnect('bot-2').catch(() => {});
  });

  describe('connect', () => {
    it('creates Client and stores in Map', async () => {
      await DiscordAdapter.connect('test-token', 'bot-1');

      const client = DiscordAdapter.getClient('bot-1');
      expect(client).toBeDefined();
      expect(client!.isReady()).toBe(true);
    });

    it('disconnects existing client before creating new one', async () => {
      await DiscordAdapter.connect('token-1', 'bot-1');
      const firstClient = DiscordAdapter.getClient('bot-1');

      await DiscordAdapter.connect('token-2', 'bot-1');

      const secondClient = DiscordAdapter.getClient('bot-1');
      expect(secondClient).toBeDefined();
      expect(firstClient!.destroy).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('calls destroy and removes from Map', async () => {
      await DiscordAdapter.connect('test-token', 'bot-1');
      const client = DiscordAdapter.getClient('bot-1');

      await DiscordAdapter.disconnect('bot-1');

      expect(client!.destroy).toHaveBeenCalled();
      expect(DiscordAdapter.getClient('bot-1')).toBeUndefined();
    });

    it('no-op if client does not exist', async () => {
      await expect(DiscordAdapter.disconnect('non-existent')).resolves.not.toThrow();
      expect(DiscordAdapter.getClient('non-existent')).toBeUndefined();
    });
  });

  describe('getClient', () => {
    it('returns client from Map', async () => {
      await DiscordAdapter.connect('test-token', 'bot-1');

      const client = DiscordAdapter.getClient('bot-1');
      expect(client).toBeDefined();
    });

    it('returns undefined if not found', () => {
      expect(DiscordAdapter.getClient('non-existent')).toBeUndefined();
    });
  });

  describe('isReady', () => {
    it('returns true when client is ready', async () => {
      await DiscordAdapter.connect('test-token', 'bot-1');

      expect(DiscordAdapter.isReady('bot-1')).toBe(true);
    });

    it('returns false when client does not exist', () => {
      expect(DiscordAdapter.isReady('non-existent')).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('returns connected true with tag when ready', async () => {
      await DiscordAdapter.connect('test-token', 'bot-1');

      const result = DiscordAdapter.healthCheck('bot-1');
      expect(result.connected).toBe(true);
      expect(result.tag).toBe('TestBot#1234');
    });

    it('returns connected false when client does not exist', () => {
      const result = DiscordAdapter.healthCheck('non-existent');
      expect(result.connected).toBe(false);
      expect(result.tag).toBeUndefined();
    });
  });

  describe('sendMessage', () => {
    it('fetches channel and sends text', async () => {
      await DiscordAdapter.connect('test-token', 'bot-1');
      const client = DiscordAdapter.getClient('bot-1') as any;

      await DiscordAdapter.sendMessage('channel-123', 'Hello world', 'bot-1');

      expect(client.channels.fetch).toHaveBeenCalledWith('channel-123');
    });

    it('throws if client not connected', async () => {
      await expect(
        DiscordAdapter.sendMessage('channel-123', 'text', 'non-existent')
      ).rejects.toThrow('Discord client not found for bot non-existent');
    });

    it('throws if channel is not text-based', async () => {
      await DiscordAdapter.connect('test-token', 'bot-1');
      const client = DiscordAdapter.getClient('bot-1') as any;
      client.channels.fetch = vi.fn().mockResolvedValue({
        isTextBased: vi.fn().mockReturnValue(false),
        send: vi.fn(),
      });

      await expect(
        DiscordAdapter.sendMessage('voice-channel', 'text', 'bot-1')
      ).rejects.toThrow('not a text channel');
    });

    it('throws if channel fetch returns null', async () => {
      await DiscordAdapter.connect('test-token', 'bot-1');
      const client = DiscordAdapter.getClient('bot-1') as any;
      client.channels.fetch = vi.fn().mockResolvedValue(null);

      await expect(
        DiscordAdapter.sendMessage('missing-channel', 'text', 'bot-1')
      ).rejects.toThrow('not a text channel');
    });
  });
});
