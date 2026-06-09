import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../debug/server', () => ({ addLog: vi.fn() }));
vi.mock('../config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { normalizeDiscordMessage } from '../normalizer/discord';

// Discord.js Collection extends Map with array-like methods (.map, .filter, etc.)
function createMockCollection(entries: [string, any][] = []) {
  const map = new Map(entries);
  return Object.assign(map, {
    map: (fn: (value: any, key: string) => any) => Array.from(map.values()).map((v, i) => fn(v, Array.from(map.keys())[i])),
    filter: (fn: (value: any, key: string) => boolean) => {
      const result = new Map();
      map.forEach((v, k) => { if (fn(v, k)) result.set(k, v); });
      return result;
    },
  });
}

function createMockMessage(overrides: Record<string, any> = {}) {
  return {
    id: 'msg-123',
    content: 'Hello world',
    author: { id: 'user-456', username: 'testuser', bot: false },
    channelId: 'channel-789',
    guildId: 'guild-101',
    createdTimestamp: Date.now(),
    attachments: createMockCollection(),
    mentions: { users: createMockCollection() },
    reference: null,
    ...overrides,
  };
}

describe('normalizeDiscordMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps text message to NormalizedMessage with platform discord', () => {
    const message = createMockMessage();
    const result = normalizeDiscordMessage('tenant-1', message as any);

    expect(result.platform).toBe('discord');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.message.text).toBe('Hello world');
    expect(result.type).toBe('text');
  });

  it('sets userId to message.author.id', () => {
    const message = createMockMessage({ author: { id: 'user-999', username: 'u', bot: false } });
    const result = normalizeDiscordMessage('tenant-1', message as any);

    expect(result.userId).toBe('user-999');
  });

  it('sets metadata channelId, guildId, messageId', () => {
    const message = createMockMessage();
    const result = normalizeDiscordMessage('tenant-1', message as any);

    expect(result.metadata.channelId).toBe('channel-789');
    expect(result.metadata.guildId).toBe('guild-101');
    expect(result.metadata.messageId).toBe('msg-123');
  });

  it('throws on bot messages (author.bot === true)', () => {
    const message = createMockMessage({ author: { id: 'bot-1', username: 'BotUser', bot: true } });

    expect(() => normalizeDiscordMessage('tenant-1', message as any)).toThrow('Ignoring bot message');
  });

  it('classifies image attachments', () => {
    const attachments = createMockCollection([
      ['a1', { url: 'https://cdn.test/img.png', contentType: 'image/png', size: 1024, name: 'img.png' }],
    ]);
    const message = createMockMessage({ attachments });
    const result = normalizeDiscordMessage('tenant-1', message as any);

    expect(result.type).toBe('image');
    expect(result.message.attachments[0].type).toBe('image');
    expect(result.message.attachments[0].url).toBe('https://cdn.test/img.png');
  });

  it('classifies video attachments', () => {
    const attachments = createMockCollection([
      ['a2', { url: 'https://cdn.test/vid.mp4', contentType: 'video/mp4', size: 2048, name: 'vid.mp4' }],
    ]);
    const message = createMockMessage({ attachments });
    const result = normalizeDiscordMessage('tenant-1', message as any);

    expect(result.type).toBe('video');
    expect(result.message.attachments[0].type).toBe('video');
  });

  it('classifies audio attachments', () => {
    const attachments = createMockCollection([
      ['a3', { url: 'https://cdn.test/audio.mp3', contentType: 'audio/mpeg', size: 512, name: 'audio.mp3' }],
    ]);
    const message = createMockMessage({ attachments });
    const result = normalizeDiscordMessage('tenant-1', message as any);

    expect(result.type).toBe('audio');
    expect(result.message.attachments[0].type).toBe('audio');
  });

  it('sets replyTo from message.reference.messageId', () => {
    const message = createMockMessage({
      reference: { messageId: 'original-msg-456' },
    });
    const result = normalizeDiscordMessage('tenant-1', message as any);

    expect(result.metadata.replyTo).toBe('original-msg-456');
  });

  it('sets replyTo to null when no reference', () => {
    const message = createMockMessage({ reference: null });
    const result = normalizeDiscordMessage('tenant-1', message as any);

    expect(result.metadata.replyTo).toBeNull();
  });

  it('extracts mentions from message.mentions.users', () => {
    const users = createMockCollection([
      ['u1', { id: 'mentioned-user-1' }],
      ['u2', { id: 'mentioned-user-2' }],
    ]);
    const message = createMockMessage({ mentions: { users } });
    const result = normalizeDiscordMessage('tenant-1', message as any);

    expect(result.metadata.mentions).toEqual(['mentioned-user-1', 'mentioned-user-2']);
  });

  it('handles message with empty content (text = null)', () => {
    const message = createMockMessage({ content: '' });
    const result = normalizeDiscordMessage('tenant-1', message as any);

    expect(result.message.text).toBeNull();
  });

  it('handles message with no attachments (empty collection)', () => {
    const message = createMockMessage({ attachments: new Map() });
    const result = normalizeDiscordMessage('tenant-1', message as any);

    expect(result.message.attachments).toEqual([]);
    expect(result.type).toBe('text');
  });
});
