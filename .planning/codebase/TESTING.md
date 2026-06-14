# TESTING.md — Test Structure & Coverage
**Last mapped:** 2026-06-14

---

## Framework

- **Vitest** `^4.1.6` with coverage via `@vitest/coverage-v8`
- **supertest** `^7.2.2` — HTTP integration tests
- Test files: `src/__tests__/*.test.ts`

---

## Test Files

| File | Focus |
|------|-------|
| `src/__tests__/smoke.test.ts` | Basic route health checks |
| `src/__tests__/analytics-api.test.ts` | Analytics endpoints |
| `src/__tests__/billing-usage.test.ts` | Billing usage recording |
| `src/__tests__/conversations-api.test.ts` | Conversations CRUD |
| `src/__tests__/leads-api.test.ts` | Leads CRUD |
| `src/__tests__/ai-api.test.ts` | AI integration endpoints |
| `src/__tests__/schemas.test.ts` | Zod schema validation |
| `src/__tests__/utils.test.ts` | Utility functions |
| `src/__tests__/validate-middleware.test.ts` | Validation middleware |
| `src/normalizer/whatsapp.test.ts` | ⚠️ In wrong directory |
| `src/metrics/metrics.test.ts` | Prometheus metrics |
| `src/services/*.test.ts` | Service unit tests (3 files) |

---

## Test Setup (`src/__tests__/setup.ts`)

- Mocks all Prisma model methods (`findFirst`, `findMany`, `create`, etc.)
- Sets required env vars to test values
- Sets `TELEGRAM_BOT_TOKEN` / `TELEGRAM_WEBHOOK_SECRET` — dead env vars (Telegram removed)
- Does NOT set `API_KEY_PEPPER`, `CLERK_SECRET_KEY` — these will cause startup failures in integration tests

---

## ⚠️ Test Coverage Gaps

1. **No E2E tests** — no test covers the full webhook→worker→AI→outbound pipeline
2. **No Socket.IO tests** — real-time events untested
3. **`src/__tests__/conversations-api.test.ts`** references Telegram env vars — stale tests
4. **`src/__tests__/analytics-api.test.ts`** references Telegram env vars — stale tests
5. **Worker pipeline** (`src/workers/index.ts`) has **zero tests**
6. **Frontend has no tests** — no Vitest/Jest config in `frontend/`
7. **Coverage artifacts** — `coverage/` directory exists in repo root (should be gitignored and empty in CI)

---

## Running Tests

```bash
npm test               # vitest run
npm run test:coverage  # vitest run --coverage
```
