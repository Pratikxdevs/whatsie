import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to declare mock variables accessible in vi.mock factory
const { mockPipeline, mockRedis } = vi.hoisted(() => {
  const mockPipeline = {
    lpush: vi.fn().mockReturnThis(),
    ltrim: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  };
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
    pipeline: vi.fn().mockReturnValue(mockPipeline),
  };
  return { mockPipeline, mockRedis };
});

vi.mock('../queue/setup', () => ({
  redisConnection: mockRedis,
}));

import { SessionManager } from './sessionManager';

describe('SessionManager', () => {
  const tenantId = 'tenant-1';
  const userId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pushMessage', () => {
    it('pushes message to Redis list and trims to 10', async () => {
      const message = { role: 'user' as const, content: 'Hello' };
      await SessionManager.pushMessage(tenantId, userId, message);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.lpush).toHaveBeenCalledWith(
        `context:${tenantId}:${userId}`,
        JSON.stringify(message)
      );
      expect(mockPipeline.ltrim).toHaveBeenCalledWith(`context:${tenantId}:${userId}`, 0, 9);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('getContext', () => {
    it('returns parsed messages in chronological order', async () => {
      const messages = [
        JSON.stringify({ role: 'assistant', content: 'Hi there' }),
        JSON.stringify({ role: 'user', content: 'Hello' }),
      ];
      mockRedis.lrange.mockResolvedValueOnce(messages);

      const result = await SessionManager.getContext(tenantId, userId);

      expect(mockRedis.lrange).toHaveBeenCalledWith(`context:${tenantId}:${userId}`, 0, 9);
      expect(result).toHaveLength(2);
      // Should be reversed (chronological order)
      expect(result[0].content).toBe('Hello');
      expect(result[1].content).toBe('Hi there');
    });

    it('returns empty array when no context exists', async () => {
      mockRedis.lrange.mockResolvedValueOnce([]);
      const result = await SessionManager.getContext(tenantId, userId);
      expect(result).toEqual([]);
    });
  });

  describe('setWorkflowState', () => {
    it('stores state with 24h TTL', async () => {
      const state = { conversationState: 'in_flow' as const, currentWorkflowId: 'wf-1' };
      await SessionManager.setWorkflowState(tenantId, userId, state);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `state:${tenantId}:${userId}`,
        86400,
        JSON.stringify(state)
      );
    });
  });

  describe('getWorkflowState', () => {
    it('returns parsed state from Redis', async () => {
      const state = { conversationState: 'idle' as const };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(state));

      const result = await SessionManager.getWorkflowState(tenantId, userId);
      expect(result).toEqual(state);
    });

    it('returns empty object when no state exists', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await SessionManager.getWorkflowState(tenantId, userId);
      expect(result).toEqual({});
    });
  });

  describe('clearWorkflowState', () => {
    it('deletes the state key from Redis', async () => {
      await SessionManager.clearWorkflowState(tenantId, userId);
      expect(mockRedis.del).toHaveBeenCalledWith(`state:${tenantId}:${userId}`);
    });
  });
});
