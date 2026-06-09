import { redisConnection } from '../queue/setup';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SessionState {
  currentWorkflowId?: string | null;
  currentStepIndex?: number | null;
  conversationState?: 'idle' | 'in_flow' | 'waiting_input';
  variables?: Record<string, any>;
  lastMessageAt?: string;
}

export class SessionManager {
  static async pushMessage(tenantId: string, userId: string, message: ChatMessage): Promise<void> {
    const key = `context:${tenantId}:${userId}`;
    const stringified = JSON.stringify(message);

    const pipeline = redisConnection.pipeline();
    pipeline.lpush(key, stringified);
    pipeline.ltrim(key, 0, 9);
    await pipeline.exec();
  }

  static async getContext(tenantId: string, userId: string): Promise<ChatMessage[]> {
    const key = `context:${tenantId}:${userId}`;
    const rawMessages = await redisConnection.lrange(key, 0, 9);
    return rawMessages.map(item => JSON.parse(item) as ChatMessage).reverse();
  }

  // --- WORKFLOW STATE MANAGEMENT ---
  
  static async setWorkflowState(tenantId: string, userId: string, state: SessionState): Promise<void> {
    const key = `state:${tenantId}:${userId}`;
    // Expiration set loosely to 24 hrs for state cache 
    await redisConnection.setex(key, 86400, JSON.stringify(state));
  }

  static async getWorkflowState(tenantId: string, userId: string): Promise<SessionState> {
    const key = `state:${tenantId}:${userId}`;
    const data = await redisConnection.get(key);
    if (!data) return {};
    return JSON.parse(data) as SessionState;
  }

  static async clearWorkflowState(tenantId: string, userId: string): Promise<void> {
    const key = `state:${tenantId}:${userId}`;
    await redisConnection.del(key);
  }
}
