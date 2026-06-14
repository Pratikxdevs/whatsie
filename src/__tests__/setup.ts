/// <reference types="vitest/globals" />
// Test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.GATEWAY_SECURITY_TOKEN = 'test-gateway-token';
process.env.EVOLUTION_API_SECRET = 'test-evolution-secret';
process.env.EVOLUTION_API_KEY = 'test-evolution-key';
process.env.EVOLUTION_API_URL = 'http://localhost:8080';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = 'https://test.example.com';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';
process.env.CLERK_PUBLISHABLE_KEY = 'test-clerk-publishable';
process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
process.env.API_KEY_PEPPER = 'test-pepper';
process.env.DEBUG_TOKEN = 'test-debug-token';

// Prisma mock
const createMockModel = () => ({
  findFirst: vi.fn().mockResolvedValue(null),
  findUnique: vi.fn().mockResolvedValue(null),
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({}),
  createMany: vi.fn().mockResolvedValue({ count: 0 }),
  update: vi.fn().mockResolvedValue({}),
  updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  upsert: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
  deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  count: vi.fn().mockResolvedValue(0),
  aggregate: vi.fn().mockResolvedValue({}),
  groupBy: vi.fn().mockResolvedValue([]),
});

const mockPrisma = {
  tenant: createMockModel(),
  user: createMockModel(),
  bot: createMockModel(),
  lead: createMockModel(),
  conversation: createMockModel(),
  message: createMockModel(),
  workflow: createMockModel(),
  workflowExecution: createMockModel(),
  apiKey: createMockModel(),
  event: createMockModel(),
  billingUsage: createMockModel(),
  aiLog: createMockModel(),
  refreshToken: createMockModel(),
  $transaction: vi.fn().mockImplementation(async (fn: Function) => fn(mockPrisma)),
  $queryRaw: vi.fn().mockResolvedValue([]),
  $executeRaw: vi.fn().mockResolvedValue(0),
  $executeRawUnsafe: vi.fn().mockResolvedValue(0),
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../db/prisma', () => ({
  prisma: mockPrisma,
  prismaUnfiltered: mockPrisma,
}));

// Mock Clerk — injects a fake req.auth for downstream middleware
vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (req: any, _res: any, next: any) => {
    req.auth = { userId: 'clerk-test-user-id' };
    next();
  },
  verifyToken: vi.fn().mockResolvedValue({ sub: 'clerk-test-user-id' }),
  requireAuth: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock authenticateToken — injects a standard test user so route tests don't need Clerk/DB
vi.mock('../middleware/auth', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    authenticateToken: (req: any, res: any, next: any) => {
      if (!req.headers.authorization && !req.headers['x-api-key'] && !req.auth) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      req.user = {
        id: 'user-test-uuid-0000-0000-000000000001',
        tenantId: 'tenant-test-uuid-0000-0000-000000000001',
        role: 'admin',
      };
      next();
    },
  };
});

// Redis mock
const redisStore = new Map<string, string>();

vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => ({
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
    set: vi.fn().mockImplementation((key: string, value: string) => {
      redisStore.set(key, value);
      return Promise.resolve('OK');
    }),
    setex: vi.fn().mockImplementation((key: string, _ttl: number, value: string) => {
      redisStore.set(key, value);
      return Promise.resolve('OK');
    }),
    del: vi.fn().mockImplementation((key: string) => {
      redisStore.delete(key);
      return Promise.resolve(1);
    }),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    setnx: vi.fn().mockResolvedValue(1),
    lpush: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
    ltrim: vi.fn().mockResolvedValue('OK'),
    rpush: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
    call: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  }));
  return { default: MockRedis };
});

// BullMQ mock
vi.mock('bullmq', () => {
  const mockQueue = {
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id', data: {} }),
    addBulk: vi.fn().mockResolvedValue([]),
    getJob: vi.fn().mockResolvedValue(null),
    getJobs: vi.fn().mockResolvedValue([]),
    getJobCounts: vi.fn().mockResolvedValue({}),
    clean: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };

  const mockWorker = vi.fn().mockImplementation(function(_name: string, _processor: Function) {
    return {
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
  });

  return {
    Queue: vi.fn().mockImplementation(() => mockQueue),
    Worker: mockWorker,
    QueueEvents: vi.fn().mockImplementation(function() {
      return {
        on: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

// Discord.js mock
vi.mock('discord.js', () => {
  class MockClient {
    login = vi.fn().mockResolvedValue('token');
    destroy = vi.fn();
    isReady = vi.fn().mockReturnValue(true);
    on = vi.fn();
    once = vi.fn();
    user = { tag: 'TestBot#1234', id: '123456789' };
    channels = {
      fetch: vi.fn().mockResolvedValue({
        isTextBased: vi.fn().mockReturnValue(true),
        send: vi.fn().mockResolvedValue({ id: 'msg-1' }),
      }),
    };
  }
  return {
    Client: MockClient,
    GatewayIntentBits: { Guilds: 1, GuildMessages: 2, DirectMessages: 4, MessageContent: 8 },
    ChannelType: { GuildText: 0, DM: 1 },
  };
});

// Export mocks for direct access in tests
export { mockPrisma, redisStore };
