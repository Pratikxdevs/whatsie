---
title: Testing
last_mapped_commit: f683cc9578043d8141583bd2d2d84c7ebcaea9d4
last_updated: 2026-06-09
---

# Testing

## Framework
- **Vitest** v4.1.6 with `@vitest/coverage-v8` for coverage
- **Supertest** v7.2.2 for HTTP endpoint testing
- **Node environment** (not jsdom)
- Global test APIs enabled (`globals: true`) — `describe`, `it`, `expect`, `vi` available without imports
- TypeScript via built-in Vitest transform (no separate ts-node in test runner)

## Structure
- **Test file locations follow two conventions:**
  1. **Co-located:** `src/<module>/<name>.test.ts` — for unit tests of a specific module (e.g., `src/services/intentClassifier.test.ts`, `src/middleware/auth.test.ts`)
  2. **Centralized:** `src/__tests__/` — for integration/API tests (e.g., `src/__tests__/leads-api.test.ts`, `src/__tests__/billing-usage.test.ts`)
- **Integration tests** live in `src/__tests__/integration/` (e.g., `tenant-isolation.test.ts`, `whatsapp-pipeline.test.ts`)
- **Test setup** in `src/__tests__/setup.ts` — env vars, Prisma mock, Redis mock, BullMQ mock, Discord.js mock
- **Test helpers** in `src/__tests__/helpers.ts` — factories for test tenants, users, API keys, JWT tokens
- **Smoke test** in `src/__tests__/smoke.test.ts` — verifies test infrastructure works
- File inclusion pattern: `src/**/*.test.ts` and `src/**/*.spec.ts` (no `.spec.ts` files exist currently)
- ~53 test files total across the codebase

## Mocking
- **Prisma:** Centralized mock in `setup.ts` via `vi.mock('../db/prisma')` — every model gets a `createMockModel()` with all standard Prisma methods (`findFirst`, `findMany`, `create`, `update`, `delete`, etc.) as `vi.fn()` stubs. Exported as `mockPrisma` for direct manipulation in tests (e.g., `mockPrisma.lead.findMany.mockResolvedValueOnce(...)`)
- **Redis (ioredis):** Mocked with an in-memory `Map<string, string>` backing store; mock implements `get`, `set`, `setex`, `del`, `incr`, `expire`, `ping`, `quit`, `on`, `connect`
- **BullMQ:** `Queue` and `Worker` mocked — `Queue.add` returns a mock job ID; `Worker` constructor returns an object with `on` and `close` stubs
- **Discord.js:** `Client` class mocked with stubs for `login`, `destroy`, `isReady`, `on`, `once`, `channels.fetch`
- **Logger:** `vi.mock('../config/logger')` replaces `logger` with an object of `vi.fn()` stubs (`info`, `error`, `warn`, `debug`)
- **Per-test mock reset:** `beforeEach(() => vi.clearAllMocks())` is standard in all test files
- **Selective mock resolution:** Tests use `mockResolvedValueOnce()` for scenario-specific overrides while keeping default stubs
- **No MSW or nock** — external HTTP calls are mocked at the adapter/service layer via Prisma and BullMQ mocks, not at the network level

## Coverage
- **Provider:** V8 (via `@vitest/coverage-v8`)
- **Include:** `src/**/*.ts`
- **Exclude:** `src/**/*.test.ts`, `src/**/*.spec.ts`, `src/__tests__/**`, `src/index.ts`
- **No explicit coverage thresholds** configured in `vitest.config.ts` or `package.json`
- Coverage report generated via `npm run test:coverage`

## Running Tests
```bash
npm test              # vitest run — single run
npm run test:watch    # vitest — watch mode
npm run test:coverage # vitest run --coverage
```

**CI pipeline** (`.github/workflows/ci.yml`):
1. `npx tsc --noEmit` — typecheck (serves as lint step)
2. `npm test` — runs all Vitest tests
3. `npm run build` — ensures production build succeeds

CI services: PostgreSQL 15, Redis 7 on ubuntu-latest with Node 20.
