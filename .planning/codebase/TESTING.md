# CrmV2 — Testing Approach & Conventions

## Test Framework

- **Vitest** (v4.1.6) as test runner
- **Supertest** (v7.2.2) for HTTP integration testing
- **@vitest/coverage-v8** for code coverage
- **vitest.config.ts** at project root

## Configuration (`vitest.config.ts`)

```typescript
{
  globals: true,        // describe/it/expect available without imports
  environment: 'node', // Node.js environment (not jsdom)
  include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  setupFiles: ['./src/__tests__/setup.ts'],
  coverage: {
    provider: 'v8',
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/__tests__/**', 'src/index.ts'],
  },
}
```

### Key Config Details

- **Globals enabled**: `describe`, `it`, `expect`, `vi` available without explicit imports (but most tests import them anyway for clarity)
- **Setup file**: `src/__tests__/setup.ts` — runs before all tests, sets up mocks and env vars
- **Coverage**: V8 provider, includes all `src/**/*.ts`, excludes test files and entry point

## Test File Locations

Tests live in two locations:

### 1. Co-located with source (`__tests__/` subdirectories)

```
src/schemas/__tests__/auth.test.ts
src/schemas/__tests__/leads.test.ts
src/schemas/__tests__/messages.test.ts
src/schemas/__tests__/credentials.test.ts
src/schemas/__tests__/bots.test.ts
src/schemas/__tests__/combined.test.ts

src/utils/__tests__/dates.test.ts
src/utils/__tests__/email.test.ts
src/utils/__tests__/phone.test.ts
src/utils/__tests__/url.test.ts
src/utils/__tests__/sanitize.test.ts
src/utils/__tests__/fileUpload.test.ts
```

### 2. Adjacent to source files

```
src/config/logger.test.ts
src/middleware/auth.test.ts
src/middleware/quota.test.ts
src/middleware/tenant.test.ts
src/metrics/metrics.test.ts
src/routes/admin.test.ts
src/routes/gateway.test.ts
src/services/workflowEngine.test.ts
src/services/sessionManager.test.ts
src/services/ruleEngine.test.ts
src/services/intentClassifier.test.ts
src/api/auth.test.ts
src/normalizer/whatsapp.test.ts
```

### 3. Centralized integration tests

```
src/__tests__/smoke.test.ts
src/__tests__/validate-middleware.test.ts
src/__tests__/schemas.test.ts
src/__tests__/utils.test.ts
src/__tests__/leads-api.test.ts
src/__tests__/conversations-api.test.ts
src/__tests__/analytics-api.test.ts
src/__tests__/billing-usage.test.ts
src/__tests__/response-router.test.ts
src/__tests__/integration/tenant-isolation.test.ts
src/__tests__/integration/whatsapp-pipeline.test.ts
```

## Test Setup (`src/__tests__/setup.ts`)

The setup file provides:

### Environment Variables

Sets test-safe defaults for all required env vars:
- `JWT_SECRET`, `GATEWAY_SECURITY_TOKEN`, `EVOLUTION_API_*`, `DATABASE_URL`, `REDIS_URL`, `NODE_ENV=test`

### Prisma Mock

Full mock of the Prisma client with all common model methods:
- `findFirst`, `findUnique`, `findMany`, `create`, `createMany`, `update`, `updateMany`, `upsert`, `delete`, `deleteMany`, `count`, `aggregate`, `groupBy`
- `$transaction` (invokes callback with mock), `$queryRaw`, `$executeRaw`, `$connect`, `$disconnect`
- Mock covers: tenant, user, bot, lead, conversation, message, workflow, workflowExecution, apiKey, event, billingUsage, aiLog, refreshToken
- Exported as `mockPrisma` for direct access in tests

### Redis Mock

In-memory `Map<string, string>` backing for Redis operations:
- `get`, `set`, `setex`, `del`, `incr`, `expire`, `setnx`, `lpush`, `lrange`, `ltrim`, `rpush`, `keys`, `ping`, `quit`
- Exported as `redisStore` for direct inspection

### BullMQ Mock

Mock Queue and Worker classes with:
- `add`, `addBulk`, `getJob`, `getJobs`, `getJobCounts`, `clean`, `close`

## Test Helpers (`src/__tests__/helpers.ts`)

Reusable factory functions for test data:

- `createTestTenant(overrides?)` — returns `{ id, name, plan, status, createdAt, updatedAt }`
- `createTestUser(overrides?)` — returns `{ id, tenantId, email, passwordHash, role, ... }`
- `createTestApiKey(tenantId?)` — returns `{ raw, hash, record }` with real SHA-256 hash
- `generateTestToken(payload?)` — signs a JWT with test secret, 1h expiry

## Test Patterns & Conventions

### Basic Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from './setup';
import { generateTestToken } from './helpers';

// Mock dependencies before imports
vi.mock('../config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { someFunction } from '../module';

describe('FeatureName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does something expected', async () => {
    // Arrange
    mockPrisma.model.method.mockResolvedValueOnce(data);
    
    // Act
    const result = await someFunction();
    
    // Assert
    expect(result).toEqual(expected);
  });
});
```

### Mocking Patterns

#### Module Mocking

```typescript
vi.mock('../db/prisma', () => ({
  prisma: { /* mock methods */ },
}));
```

#### Logger Mocking (almost universal)

```typescript
vi.mock('../config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
```

#### Per-Test Mock Overrides

```typescript
mockPrisma.lead.findMany.mockResolvedValueOnce(mockLeads);
```

#### Import After Mock

```typescript
vi.mock('../module');
import { fn } from '../module'; // imports the mocked version
```

### HTTP Testing (Supertest)

```typescript
import request from 'supertest';
import express from 'express';
import leadsRouter from '../routes/leads';

const app = express();
app.use(express.json());
app.use('/api/leads', leadsRouter);

it('returns leads', async () => {
  const res = await request(app)
    .get('/api/leads')
    .set('Authorization', `Bearer ${token}`);
  
  expect(res.status).toBe(200);
  expect(res.body.leads).toHaveLength(2);
});
```

### Schema Validation Testing

```typescript
import { registerSchema } from '../auth';

it('accepts valid input', () => {
  const result = registerSchema.safeParse({ email: 'user@example.com', password: 'Password1', tenantName: 'My Company' });
  expect(result.success).toBe(true);
});

it('rejects invalid email', () => {
  const result = registerSchema.safeParse({ email: 'not-email', password: 'Password1', tenantName: 'My Company' });
  expect(result.success).toBe(false);
});
```

### Middleware Testing

```typescript
function createMockReq(body: any = {}) {
  return { body, query: {}, params: {} } as unknown as Request;
}
function createMockRes() {
  const res = { statusCode: 200, body: null as any, status(code: number) { this.statusCode = code; return this; }, json(data: any) { this.body = data; return this; } };
  return res as unknown as Response;
}

it('passes valid body through', () => {
  const req = createMockReq({ name: 'John' });
  const res = createMockRes();
  const next = vi.fn();
  
  validateBody(schema)(req, res, next);
  expect(next).toHaveBeenCalled();
});
```

## Test Categories

### Unit Tests

- Pure function testing: `src/utils/__tests__/*.test.ts`
- Schema validation: `src/schemas/__tests__/*.test.ts`
- Service logic: `src/services/*.test.ts`
- Logger utilities: `src/config/logger.test.ts`

### Integration Tests

- API endpoint testing with Supertest: `src/__tests/*-api.test.ts`
- Tenant isolation verification: `src/__tests__/integration/tenant-isolation.test.ts`
- End-to-end pipeline: `src/__tests__/integration/whatsapp-pipeline.test.ts`
- Middleware integration: `src/__tests__/validate-middleware.test.ts`

### Smoke Tests

- `src/__tests__/smoke.test.ts` — verifies test infrastructure works
- Tests that vitest runs, helpers create valid objects, mocks are available

## Existing Test Coverage Summary

| Area | Test Files | Coverage |
|------|-----------|----------|
| Auth schemas | `schemas/__tests__/auth.test.ts` | Register, login, refresh, logout validation |
| Lead schemas | `schemas/__tests__/leads.test.ts` | Create/update lead validation |
| Bot schemas | `schemas/__tests__/bots.test.ts` | Bot CRUD validation |
| Message schemas | `schemas/__tests__/messages.test.ts` | Send message, media upload validation |
| Credential schemas | `schemas/__tests__/credentials.test.ts` | Provider credential validation |
| Auth middleware | `middleware/auth.test.ts` | JWT, API key, Clerk auth |
| Tenant middleware | `middleware/tenant.test.ts` | AsyncLocalStorage context |
| Quota middleware | `middleware/quota.test.ts` | Daily usage limits |
| Validate middleware | `__tests__/validate-middleware.test.ts` | Body/query/params validation |
| Leads API | `__tests__/leads-api.test.ts` | CRUD endpoints with Supertest |
| Conversations API | `__tests__/conversations-api.test.ts` | Conversation endpoints |
| Analytics API | `__tests__/analytics-api.test.ts` | Analytics endpoints |
| Billing | `__tests__/billing-usage.test.ts` | Usage recording |
| Admin routes | `routes/admin.test.ts` | Admin panel endpoints |
| Gateway | `routes/gateway.test.ts` | Webhook gateway |
| Workflow engine | `services/workflowEngine.test.ts` | Workflow triggers, steps, completion |
| Session manager | `services/sessionManager.test.ts` | Session state management |
| Rule engine | `services/ruleEngine.test.ts` | Automation rules |
| Intent classifier | `services/intentClassifier.test.ts` | AI intent detection |
| Logger | `config/logger.test.ts` | Pino logger config |
| Metrics | `metrics/metrics.test.ts` | Prometheus metrics |
| Tenant isolation | `integration/tenant-isolation.test.ts` | AsyncLocalStorage + RLS |
| WhatsApp pipeline | `integration/whatsapp-pipeline.test.ts` | Normalize → queue pipeline |
| Phone utils | `utils/__tests__/phone.test.ts` | Phone number parsing |
| Email utils | `utils/__tests__/email.test.ts` | Email validation |
| URL utils | `utils/__tests__/url.test.ts` | URL utilities |
| Date utils | `utils/__tests__/dates.test.ts` | Date formatting |
| Sanitize utils | `utils/__tests__/sanitize.test.ts` | Input sanitization |
| File upload | `utils/__tests__/fileUpload.test.ts` | File upload handling |
| Smoke | `__tests__/smoke.test.ts` | Test infrastructure |

## Running Tests

```bash
npm test              # vitest run — single pass
npm run test:watch    # vitest — watch mode
npm run test:coverage # vitest run --coverage — with V8 coverage report
```

## NPM Scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

## Coverage Configuration

- Provider: **V8** (`@vitest/coverage-v8`)
- Include: `src/**/*.ts`
- Exclude: test files, setup files, `src/index.ts`
- No coverage thresholds configured (no `statements/branches/functions/lines` minimums)
- No coverage reporters configured (defaults to text + html)
- Coverage output goes to `coverage/` directory (present in project root)
