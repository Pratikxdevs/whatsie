# TESTING.md — Testing Strategy & Patterns

**Project:** CrmV2 — Multi-Platform AI CRM Bot SaaS  
**Date:** 2026-06-15  
**Root:** `/home/clutch/Desktop/Whatsie`

---

## Test Runner

| Aspect | Details |
|--------|---------|
| **Framework** | Vitest 4.1.6 |
| **Config** | `vitest.config.ts` |
| **Mode** | Globals enabled (`describe`, `it`, `expect`, `vi` available without import) |
| **Environment** | Node (`environment: 'node'`) |
| **Coverage** | `@vitest/coverage-v8` (V8 native) |

### Vitest Config (`vitest.config.ts`)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/__tests__/**', 'src/index.ts'],
    },
  },
});
```

---

## Scripts

| Command | Action |
|---------|--------|
| `npm test` | `vitest run` — single run |
| `npm run test:watch` | `vitest` — watch mode |
| `npm run test:coverage` | `vitest run --coverage` — coverage report |

---

## Test File Layout

```
src/
├── __tests__/                     # Integration + API tests
│   ├── setup.ts                   #   Global test setup (all mocks)
│   ├── helpers.ts                 #   Shared test utilities
│   ├── smoke.test.ts              #   Health check / startup test
│   ├── ai-api.test.ts             #   AI bridge endpoint tests
│   ├── analytics-api.test.ts      #   Analytics endpoint tests
│   ├── billing-usage.test.ts      #   Billing endpoint tests
│   ├── conversations-api.test.ts  #   Conversation endpoint tests
│   ├── leads-api.test.ts          #   Lead endpoint tests
│   ├── normalizer.test.ts         #   Message normalizer tests
│   ├── schemas.test.ts            #   Zod schema validation tests
│   ├── utils.test.ts              #   Utility function tests
│   ├── validate-middleware.test.ts #   Validation middleware tests
│   ├── integration/               #   Multi-component integration tests
│   └── utils/                     #   Test-specific utilities
│
├── services/                      # Co-located unit tests
│   ├── intentClassifier.test.ts   #   Intent classification tests
│   ├── ruleEngine.test.ts         #   Rule engine tests
│   ├── sessionManager.test.ts     #   Session manager tests
│   └── workflowEngine.test.ts     #   Workflow engine tests
│
├── middleware/
│   └── quota.test.ts              #   Quota enforcement tests
│
├── config/
│   └── logger.test.ts             #   Logger PII redaction tests
│
└── routes/
    └── gateway.test.ts            #   Gateway route tests
```

---

## Mocking Infrastructure

### Test Setup (`src/__tests__/setup.ts`)

The setup file runs before all tests and installs the following mocks:

| Mock | Strategy | Details |
|------|----------|---------|
| **Prisma** | Auto-mocked model | Creates mock for all 14 models with `vi.fn()` returning default values |
| **Clerk** | Middleware injection | Injects `req.auth = { userId: 'clerk-test-user-id' }` |
| **Auth Middleware** | Partial override | Injects fake `req.user` with known UUIDs |
| **ioredis** | In-memory Map store | Simulates Redis KV operations via `redisStore` |
| **BullMQ** | Function mocks | Mocks `Queue`, `Worker`, `QueueEvents` constructors |

### Mock Details

#### Prisma Mock

```typescript
const createMockModel = () => ({
  findFirst: vi.fn().mockResolvedValue(null),
  findUnique: vi.fn().mockResolvedValue(null),
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  upsert: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
  // ... etc
});
```

#### Auth Middleware Override

```typescript
vi.mock('../middleware/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    authenticateToken: (req, res, next) => {
      req.user = { id: 'user-test-uuid-...', tenantId: 'tenant-test-uuid-...' };
      next();
    },
  };
});
```

#### Redis Mock

```typescript
const redisStore = new Map<string, string>(); // shared across all tests
vi.mock('ioredis', () => ({ default: MockRedis }));
```

---

## Test Patterns

### Unit Test Pattern (Co-located)

```typescript
// src/services/intentClassifier.test.ts
import { IntentClassifier } from './intentClassifier';

describe('IntentClassifier', () => {
  it('should classify "hello" as greeting', () => {
    const result = IntentClassifier.classify('hello');
    expect(result.intent).toBe('greeting');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

### API Integration Test Pattern

```typescript
// src/__tests__/analytics-api.test.ts
import supertest from 'supertest';

describe('Analytics API', () => {
  it('GET /api/analytics/overview returns tenant stats', async () => {
    const app = await buildApp(); // test app setup
    const res = await supertest(app)
      .get('/api/analytics/overview')
      .set('Authorization', 'Bearer test-token');
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('messagesSent');
  });
});
```

### Mock Direct Access

Tests export mocks for direct control:

```typescript
// Test setup exports
export { mockPrisma, redisStore };
```

---

## Test Execution Details

### Supertest with Mocks

API tests use `supertest` against the Express app with mocked Prisma/Redis:

```typescript
import supertest from 'supertest';
import { mockPrisma } from './setup';

// Prisma returns controlled data per test
mockPrisma.lead.findMany.mockResolvedValue([{ id: 'lead-1', status: 'new' }]);
```

### Environment Variables

Set in `setup.ts` for all tests:

```
EVOLUTION_API_SECRET = test-evolution-secret
EVOLUTION_API_KEY = test-evolution-key
DATABASE_URL = postgresql://test:test@localhost:5432/test
NODE_ENV = test
CLERK_SECRET_KEY = test-clerk-secret
API_KEY_PEPPER = test-pepper
// ... etc
```

---

## Coverage Configuration

| Aspect | Setting |
|--------|---------|
| **Provider** | `v8` |
| **Include** | `src/**/*.ts` |
| **Exclude** | test files (`*.test.ts`, `*.spec.ts`, `__tests__/`), `src/index.ts` |
| **Entry point excluded** | `src/index.ts` (side-effect heavy, requires full infra) |

---

## Known Testing Gaps

1. **Worker tests** — `src/workers/index.ts` has no dedicated tests (relies on manual/end-to-end testing)
2. **Adapter tests** — `src/adapters/evolutionApi.ts` has no unit tests (requires Evolution API running)
3. **AI orchestrator tests** — No tests for `src/ai/orchestrator.ts`
4. **End-to-end tests** — No E2E test suite covering full message flow
5. **Integration tests** — `src/__tests__/integration/` directory exists but content not verified
6. **Webhook tests** — No dedicated tests for `src/routes/webhooks.ts`
