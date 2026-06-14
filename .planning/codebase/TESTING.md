# TESTING
**Updated:** 2026-06-15
**Project:** CrmV2 — Whatsie WhatsApp AI CRM

## Test Runner
- **Vitest** with `@vitest/coverage-v8`
- **HTTP testing**: `supertest`
- **No vitest.config.ts found** at project root — config likely inlined in package.json scripts
- **Test command**: `npm test` or `npx vitest run`

## Test Locations

### Integration + API Tests (`src/__tests__/`)
| File | What it tests |
|------|--------------|
| `ai-api.test.ts` | AI endpoint behavior (verify, test, generate) |
| `analytics-api.test.ts` | Analytics route responses |
| `billing-usage.test.ts` | Billing usage recording and API |
| `conversations-api.test.ts` | Conversation fetch, send, media |
| `leads-api.test.ts` | Lead CRUD operations |
| `normalizer.test.ts` | WhatsApp webhook payload normalization |
| `schemas.test.ts` | Zod schema validation |
| `smoke.test.ts` | Basic server startup smoke test |
| `utils.test.ts` | Shared utility aggregation |
| `validate-middleware.test.ts` | Zod validation middleware |
| `helpers.ts` | Shared test setup helpers |
| `setup.ts` | Test environment initialization |

### Integration Tests (`src/__tests__/integration/`)
| File | What it tests |
|------|--------------|
| `tenant-isolation.test.ts` | Cross-tenant data access blocked |
| `whatsapp-pipeline.test.ts` | E2E: webhook → normalize → queue → worker → AI → dispatch |

### Utility Unit Tests (`src/__tests__/utils/`)
| File | What it tests |
|------|--------------|
| `dates.test.ts` | Date utilities |
| `email.test.ts` | Email validation |
| `fileUpload.test.ts` | File upload validation |
| `phone.test.ts` | Phone number formatting |
| `sanitize.test.ts` | HTML sanitization |
| `url.test.ts` | URL utilities |

### Colocated Service Tests
| File | What it tests |
|------|--------------|
| `src/services/intentClassifier.test.ts` | Intent classification from NLP rules |
| `src/services/ruleEngine.test.ts` | Rule matching and evaluation |
| `src/services/sessionManager.test.ts` | Per-contact session lifecycle |
| `src/services/workflowEngine.test.ts` | Workflow step execution |
| `src/config/logger.test.ts` | Logger config (pino) |
| `src/metrics/metrics.test.ts` | Prometheus metrics registration |
| `src/middleware/quota.test.ts` | Per-tenant quota enforcement |

### Schema Tests
| File | What it tests |
|------|--------------|
| `src/schemas/__tests__/auth.test.ts` | Auth schemas (login, register, etc.) |
| `src/schemas/__tests__/bots.test.ts` | Bot create/update schemas |
| `src/schemas/__tests__/credentials.test.ts` | Credential schemas |
| `src/schemas/__tests__/leads.test.ts` | Lead schemas |
| `src/schemas/__tests__/messages.test.ts` | Message send/media schemas |

## Total Test Count
- **18 test files** in `src/__tests__/`
- **10+ colocated** test files across services, schemas, config, middleware
- **Total**: ~28+ test files

## Test Patterns
```typescript
// Supertest pattern
import request from 'supertest';
import app from '../index';

describe('GET /api/workspaces', () => {
  it('returns 401 without auth', async () => {
    await request(app).get('/api/workspaces').expect(401);
  });
});
```

## Coverage Status
- **Well tested**: Services (intent, rule, session, workflow), schemas, utils, quota middleware
- **Moderate coverage**: Analytics, billing, conversation, lead APIs
- **Gap — not tested**:
  - Error recovery system (`src/errors/recovery.ts`) — no unit tests for recovery map
  - Debug server (`src/debug/server.ts`) — no tests for ring buffer or dashboard
  - AI bridge (`src/AiInteg/bridge.ts`) — no unit tests (complex pipeline)
  - Prisma logger extension (`src/debug/prismaLogger.ts`) — no tests
  - Frontend services (`errorLog.ts`, `errorRecovery.ts`, `socketManager.ts`) — no frontend tests
  - Rate limiter (`src/rateLimiter/`) — no tests
  - Billing usage recording (`src/billing/recordUsage.ts`) — minimal coverage

## What to Add Next
1. Unit tests for `enrichError()` + `getRecovery()` in recovery.ts
2. Integration test: auth failure → enriched error shape validation
3. Unit tests for `addLog()` + category derivation in debug/server.ts
4. Frontend: Vitest + React Testing Library for errorRecovery dispatch
