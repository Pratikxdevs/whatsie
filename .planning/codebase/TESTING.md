# Testing

_Last updated: 2026-06-14_

## Testing Framework

**Backend:** Vitest ^4.1.6
- Config: `vitest.config.ts` at project root
- Environment: `node`
- Coverage: `@vitest/coverage-v8`
- HTTP testing: `supertest` ^7.2.2
- Pattern: `src/**/*.test.ts`, `src/**/*.spec.ts`
- Setup file: `src/__tests__/setup.ts`

**Frontend:** No test framework configured (no Vitest/Jest in frontend package.json).

---

## Test Commands

```bash
# Run all tests once
npm test                          # vitest run

# Watch mode
npm run test:watch                # vitest (watch)

# Coverage report
npm run test:coverage             # vitest run --coverage
```

---

## Test Organization

Tests are distributed across three locations (inconsistently):

| Location                   | Count  | Purpose                            |
|----------------------------|--------|------------------------------------|
| `src/__tests__/`           | 16 files | API endpoint + integration tests |
| `src/schemas/__tests__/`   | 5 files  | Zod schema validation tests      |
| `src/services/*.test.ts`   | 4 files  | Service unit tests               |
| `src/middleware/*.test.ts` | 2 files  | Middleware unit tests            |
| `src/utils/__tests__/`     | 6 files  | Utility function tests           |
| Co-located `*.test.ts`     | 5 files  | Logger, metrics, gateway, etc.   |

**Total test files: ~38**

---

## Test Coverage by Area

### ✅ Well Tested

| Area                         | Files                                         |
|------------------------------|-----------------------------------------------|
| Schema validation            | auth, bots, leads, credentials, messages schemas |
| Utility functions            | dates, email, phone, url, sanitize, fileUpload |
| Services                     | IntentClassifier, RuleEngine, SessionManager, WorkflowEngine |
| Normalizer                   | WhatsApp webhook normalization                |
| Middleware                   | quota, tenant middleware                      |
| API endpoints                | auth, leads, conversations, analytics, billing, AI |
| Integration                  | tenant isolation, whatsapp pipeline           |

### ⚠️ Partially Tested

| Area                     | Notes                                              |
|--------------------------|----------------------------------------------------|
| Gateway route            | `gateway.test.ts` exists but limited HMAC scenarios |
| Metrics                  | `metrics.test.ts` exists — basic coverage          |
| Logger                   | `logger.test.ts` — PII redaction tested            |

### ❌ Not Tested (No test files)

| Area                         | Gap                                           |
|------------------------------|-----------------------------------------------|
| BullMQ Worker pipeline       | `src/workers/index.ts` — no test file         |
| Evolution API adapter        | `src/adapters/evolutionApi.ts` — no test file |
| WhatsApp adapter             | `src/adapters/whatsapp.adapter.ts` — no test  |
| AI Orchestrator              | `src/ai/orchestrator.ts` — no test file       |
| AI Bridge endpoints          | `src/AiInteg/` — no test files                |
| CRM service                  | `src/crm/crmService.ts` — no test file        |
| Billing/usage recording      | `src/billing/recordUsage.ts` — no test        |
| Stalled conversations job    | `src/jobs/stalledConversations.ts` — no test  |
| DLQ worker                   | `src/workers/dlq.ts` — no test file           |
| Frontend components          | No frontend test suite exists                 |

---

## Test Duplication Issue

There is significant test file duplication between `src/__tests__/` and other locations:

| Tests in `src/__tests__/`     | Duplicate at                           |
|-------------------------------|----------------------------------------|
| `src/__tests__/utils/*.test.ts` | `src/utils/__tests__/*.test.ts`      |
| `src/__tests__/schemas/*.test.ts` | `src/schemas/__tests__/*.test.ts`  |

Both are picked up by Vitest's glob pattern `src/**/*.test.ts`. This causes duplicate test runs and potentially conflicting coverage counts.

---

## Test Setup

`src/__tests__/setup.ts` — global test bootstrap (mocks, env setup).
`src/__tests__/helpers.ts` — shared helper functions for test data creation.

---

## Integration Tests

| File                                      | What it tests                              |
|-------------------------------------------|--------------------------------------------|
| `integration/tenant-isolation.test.ts`    | Cross-tenant data access prevention        |
| `integration/whatsapp-pipeline.test.ts`   | End-to-end webhook → queue → dispatch flow |

---

## Known Test Gaps

1. **No frontend tests** — entirely untested; no Vitest/Jest configured in `frontend/`
2. **Worker pipeline** — the 13-step BullMQ processor has no unit or integration test
3. **Evolution API adapter** — no mock-based tests for any of the 40+ functions
4. **AI orchestrator** — JSON parse failure paths and OpenRouter error handling untested
5. **Duplicate test files** — `src/__tests__/utils/` and `src/utils/__tests__/` contain the same tests
6. **Socket.IO** — no tests for the Socket.IO auth middleware or room join logic
7. **Startup reconciliation** — the bot status sync on boot is untested

---

## CI/CD

No CI/CD configuration found (no `.github/workflows/`, no `Dockerfile`, no `docker-compose.yml` in project root). Tests must be run manually.
