# Phase 1: Foundation Hardening - Research

**Researched:** 2026-05-19
**Domain:** Security, authentication, tenant isolation, test infrastructure
**Confidence:** HIGH

## Summary

Phase 1 addresses critical security and isolation gaps in the CrmV2 backend. The codebase has a functional WhatsApp message pipeline (gateway -> normalizer -> queue -> worker -> AI -> CRM -> response), but the security layer is largely bypassed or missing. Six files contain hardcoded fallback secrets, the tenant middleware silently passes unauthenticated requests, the workspaces route has zero auth middleware, JWT tokens expire in 24 hours with no refresh mechanism, and there are zero tests.

The core architecture is sound -- the layered pipeline, Prisma schema with tenantId on every table, and the existing ApiKey model provide a solid foundation. The fixes are surgical: remove fallback values and fail-fast on missing env vars, make the tenant middleware reject instead of skip, wire authenticateToken into workspaces routes, add refresh token generation/verification to the auth endpoints, create RLS policies via Prisma migration, and bootstrap a Vitest test suite.

**Primary recommendation:** Fix tenant middleware and auth wiring first (they are prerequisites for everything else), then remove hardcoded secrets, then add RLS, then build tests that verify the security posture.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| JWT authentication | API / Backend | -- | Token issuance and verification is backend-only |
| API key validation | API / Backend | Database / Storage | Keys hashed in DB, verified in middleware |
| Tenant isolation (RLS) | Database / Storage | API / Backend | PostgreSQL enforces at row level; app sets session var |
| Webhook signature verification | API / Backend | -- | HMAC validation is request-processing logic |
| Input validation | API / Backend | -- | Schema validation before business logic |
| Test infrastructure | Build / Tooling | -- | Vitest config, test files, coverage |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.1.6 | Test framework | Fastest for TypeScript, native ESM/CJS support, Jest-compatible API |
| @vitest/coverage-v8 | ^4.1.6 | Code coverage | V8-native coverage, no instrumentation overhead |
| supertest | ^7.2.2 | HTTP assertion testing | De facto standard for Express route testing |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bcryptjs | ^3.0.3 | API key hashing | Already in deps; use for key creation, SHA-256 for lookup |
| jsonwebtoken | ^9.0.3 | JWT sign/verify | Already in deps; extend for refresh tokens |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest + ts-jest | Jest works but is 3-5x slower for TypeScript; Vitest has native TS support and is the modern choice |
| supertest | node:test + http | More manual; supertest handles server lifecycle automatically |

**Installation:**
```bash
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
```

**Version verification:** Verified against npm registry on 2026-05-19.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| vitest | npm | ~4 yrs | ~15M/wk | github.com/vitest-dev/vitest | [OK] | Approved |
| @vitest/coverage-v8 | npm | ~4 yrs | ~10M/wk | github.com/vitest-dev/vitest | [OK] | Approved |
| supertest | npm | ~12 yrs | ~5M/wk | github.com/ladjs/supertest | [OK] | Approved |
| @types/supertest | npm | ~8 yrs | ~3M/wk | github.com/DefinitelyTyped/DefinitelyTyped | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## File-by-File Analysis

### 1. `src/middleware/tenant.ts` -- Tenant Context Middleware

**Lines 16-21: Silent skip on missing API key**
```typescript
if (!apiKey) {
  // If we don't have an API key, we skip this middleware's strict rejection
  return next();  // BUG: passes through without tenant context
}
```

**What's wrong:** When no `X-API-KEY` header is present, the middleware calls `next()` without setting the AsyncLocalStorage tenant context. Downstream code reading `tenantContext.getStore()?.tenantId` gets `undefined`. The comment says this is intentional to let the gateway do signature validation, but it means any route using this middleware is effectively unauthenticated.

**Fix approach:** Change the behavior based on a configuration flag:
- For routes that REQUIRE API key auth (workspaces, bot management): return 401 if no key
- For the gateway (which has its own signature validation): allow passthrough but set tenant from path param

The cleanest fix: make the middleware reject by default, and create a separate `optionalTenantAuth` variant for the gateway.

```typescript
// Default: reject if no API key
if (!apiKey) {
  return res.status(401).json({ error: 'X-API-KEY header is required' });
}
```

**Dependencies:** None -- this is a standalone fix.
**Risk:** LOW. The gateway route doesn't use this middleware (it has its own `authenticateTenant`).

---

### 2. `src/middleware/auth.ts` -- JWT/API Key Authentication

**Line 27: Hardcoded default tenant ID**
```typescript
tenantId: process.env.DEFAULT_TENANT_ID || '87a8873c-ae86-4d45-9db3-1406ed993d03',
```

**What's wrong:** When authenticating via API key, all users are mapped to the same hardcoded tenant. This defeats multi-tenancy.

**Fix approach:** Remove the API key -> default tenant mapping entirely. API key auth should go through the tenant middleware (which looks up the ApiKey model by hash). The `authenticateToken` middleware should only handle JWT tokens. If API key auth is still needed as a convenience for testing, it should look up the tenant from the ApiKey table.

**Dependencies:** Requires the tenant middleware fix (item 1) to be in place first.
**Risk:** MEDIUM. The frontend sends `X-API-KEY` by default (`VITE_GATEWAY_KEY`). After this fix, the frontend must send JWT tokens for authenticated routes. The API key path should resolve tenant from the ApiKey table.

---

### 3. `src/api/auth.ts` -- Auth Endpoints

**Line 93: 24h JWT expiry, no refresh tokens**
```typescript
const token = jwt.sign(
  { id: user.id, tenantId: user.tenantId, role: user.role },
  jwtSecret,
  { expiresIn: '24h' }
);
```

**What's wrong:** Architecture specifies 1h access tokens + 7d refresh tokens. Current 24h tokens are too long-lived -- if compromised, the attacker has a full day of access.

**Fix approach:**
1. Reduce access token expiry to 1 hour
2. Generate a refresh token (random 64-byte hex string, or a separate JWT with 7d expiry)
3. Store refresh token hash in a new `RefreshToken` model (or add fields to User model)
4. Add `POST /api/auth/refresh` endpoint that validates refresh token and issues new access token
5. Add `POST /api/auth/logout` endpoint that revokes the refresh token

**Schema change needed:** Add a `RefreshToken` model to Prisma:
```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}
```

**Dependencies:** Requires Prisma schema change + migration.
**Risk:** MEDIUM. Frontend must be updated to handle token refresh flow. The existing login response shape changes (now returns both accessToken and refreshToken).

---

### 4. `src/routes/gateway.ts` -- Webhook Gateway

**Line 38: Hardcoded fallback secret**
```typescript
const secret = process.env.EVOLUTION_API_SECRET || 'fallback-secret';
```

**Fix approach:** Remove fallback. Fail fast if `EVOLUTION_API_SECRET` is not set. Add it to the required env vars check in `src/index.ts`.

**Lines 40-42: Signature bypass in non-production**
```typescript
if (process.env.NODE_ENV !== 'production' && !signature) {
  return next(); // Bypass in dev if no signature provided
}
```

**Fix approach:** Remove the dev bypass. Signature verification should always be enforced. For local development, set the `EVOLUTION_API_SECRET` env var in `.env`. The test suite can mock the signature.

**Dependencies:** None.
**Risk:** LOW. Only affects webhook ingestion. Tests will verify the fix.

---

### 5. `src/routes/workspaces.ts` -- Workspace Management

**Lines 84, 165, 205: Hardcoded Evolution API key**
```typescript
const evolutionKey = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
```

**Line 85: Hardcoded gateway token**
```typescript
const gatewayKey = process.env.GATEWAY_SECURITY_TOKEN || 'super_secure_gateway_key';
```

**Lines 24-38: Hardcoded default tenant ID**
```typescript
const getDefaultTenantId = async () => {
  const defaultTenantId = process.env.DEFAULT_TENANT_ID || '87a8873c-ae86-4d45-9db3-1406ed993d03';
  // ...
};
```

**No auth middleware on any route.**

**Fix approach:**
1. Remove all hardcoded fallback values. Fail fast if env vars are missing.
2. Remove `getDefaultTenantId()` entirely. Get tenantId from `req.user.tenantId` (set by auth middleware).
3. Add `authenticateToken` middleware to the router: `router.use(authenticateToken)`.
4. Replace direct axios calls to Evolution API with calls to the centralized `src/adapters/evolutionApi.ts` adapter. This eliminates code duplication and ensures consistent error handling.
5. Add tenant scoping to all queries: `where: { tenantId: req.user.tenantId }`.

**Dependencies:** Requires auth middleware fix (item 2) to resolve tenant from API key properly.
**Risk:** HIGH. This is the most impactful change. The frontend currently calls these routes with `X-API-KEY` header and expects the hardcoded default tenant. After the fix, the frontend must authenticate properly. The route handlers must be rewritten to use `req.user.tenantId` instead of `getDefaultTenantId()`.

---

### 6. `src/routes/bot.ts` -- Bot Management

**Line 8: Hardcoded Evolution API key fallback**
```typescript
const EVO_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
```

**Fix approach:** Remove fallback. Use the centralized adapter instead of direct env var access. The adapter at `src/adapters/evolutionApi.ts:16` already handles this correctly (empty string fallback).

**Dependencies:** None.
**Risk:** LOW. The bot.ts route already uses `authenticateToken` middleware.

---

### 7. `src/controllers/whatsappProxy.ts` -- WhatsApp Proxy Controller

**Line 13: Hardcoded Evolution API key fallback**
```typescript
const evolutionKey = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
```

**Fix approach:** Remove fallback. Use the centralized adapter.

**Dependencies:** None.
**Risk:** LOW.

---

### 8. `src/index.ts` -- Express App Entry Point

**Lines 20-25: Incomplete env validation**
```typescript
const requiredEnvs = ['DATABASE_URL', 'REDIS_URL', 'GATEWAY_SECURITY_TOKEN', 'JWT_SECRET'];
```

**Fix approach:** Add missing required env vars to the validation list:
- `EVOLUTION_API_SECRET` (for webhook signature verification)
- `EVOLUTION_API_KEY` (for Evolution API calls)
- `EVOLUTION_API_URL` (for Evolution API base URL)

**Line 77: Unauthenticated workspaces route**
```typescript
app.use('/api/workspaces', workspacesRouter);
```

**Fix approach:** Auth middleware will be added to the workspaces router itself (not at the mount point), so no change needed here.

**Dependencies:** None.
**Risk:** LOW.

---

### 9. `prisma/schema.prisma` -- Database Schema

**Missing: RefreshToken model**
Add model for JWT refresh token storage (see item 3 above).

**Missing: RLS policies**
The schema has `tenantId` on every table but no RLS enforcement.

**Fix approach:** Add RefreshToken model, then create a Prisma migration that includes RLS policies. See "RLS Implementation Approach" section below.

**Dependencies:** None for schema changes. RLS depends on the migration.
**Risk:** MEDIUM. Schema changes require `prisma migrate dev` which affects the database.

---

### 10. `src/crm/crmService.ts` -- CRM Service

**Lines 82-92: Defensive guard for missing Event model**
```typescript
const p = prisma as any;
if (typeof p.event?.create === 'function') {
  return await p.event.create({...});
}
```

**Fix approach:** Remove the guard. Ensure `prisma generate` is run as part of the build/dev pipeline. The Event model exists in the schema -- this guard is a workaround for a deployment issue, not a code issue.

**Dependencies:** Requires `prisma generate` to be run.
**Risk:** LOW. The guard is overly defensive; removing it makes the code cleaner.

---

## Test Infrastructure Setup

### Framework: Vitest

**Why Vitest over Jest:**
- 3-5x faster for TypeScript projects (native transform, no ts-jest overhead)
- Jest-compatible API (`describe`, `it`, `expect`, `vi.mock`)
- Better TypeScript support out of the box
- Hot Module Replacement for tests in watch mode
- The project uses CommonJS (`tsconfig.json: "module": "CommonJS"`) -- Vitest handles this natively

### Configuration

Create `vitest.config.ts` at project root:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/index.ts'],
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

### Test File Locations

```
src/
  __tests__/
    setup.ts                    # Global test setup (mock Prisma, Redis)
    helpers.ts                  # Test utilities (createTestTenant, createTestUser, etc.)
  middleware/
    auth.test.ts                # JWT verification, API key auth, role extraction
    tenant.test.ts              # Tenant context setting, rejection on missing key
  api/
    auth.test.ts                # Register, login, refresh token flow
  routes/
    gateway.test.ts             # Webhook signature verification, idempotency, event routing
    workspaces.test.ts          # CRUD operations, tenant isolation
    bot.test.ts                 # Bot management endpoints
  services/
    intentClassifier.test.ts    # Regex/keyword matching
    ruleEngine.test.ts          # Rule evaluation
    sessionManager.test.ts      # Redis session operations
    workflowEngine.test.ts      # Workflow state machine
  normalizer/
    whatsapp.test.ts            # Payload normalization edge cases
  crm/
    crmService.test.ts          # Lead/conversation upserts
```

### Update package.json test script

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### Mocking Strategy

- **Prisma:** Use `vitest-mock-extended` or manual mocks in `__tests__/setup.ts` to mock `prisma` module
- **Redis:** Mock `ioredis` module to use in-memory Map for tests
- **BullMQ:** Mock `Queue` and `Worker` classes
- **Evolution API:** Mock `axios` for external API calls
- **JWT:** Use real `jsonwebtoken` with test secrets

## RLS Implementation Approach

### Strategy: Prisma Middleware + PostgreSQL RLS

**Step 1: Create RLS helper functions in a Prisma migration**

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workflow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BillingUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiLog" ENABLE ROW LEVEL SECURITY;

-- Create policies that filter by tenantId using session variable
-- Example for Lead:
CREATE POLICY tenant_isolation ON "Lead"
  USING ("tenantId" = current_setting('app.current_tenant_id')::uuid);

-- Repeat for each table with tenantId column
```

**Step 2: Set session variable via Prisma middleware**

In `src/db/prisma.ts`, add a Prisma extension that sets `app.current_tenant_id` before every query:

```typescript
import { PrismaClient } from '@prisma/client';

const basePrisma = new PrismaClient({ ... });

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        // Get tenant from AsyncLocalStorage or request context
        const tenantId = getTenantIdFromContext(); // implement this
        if (tenantId) {
          await basePrisma.$executeRaw`SET app.current_tenant_id = ${tenantId}`;
        }
        return query(args);
      },
    },
  },
});
```

**Step 3: Wire tenant context into the Prisma extension**

The tenant context must be available when Prisma queries execute. Two approaches:

**Option A (Recommended): AsyncLocalStorage-based extension**
- The `tenantContext` AsyncLocalStorage in `src/middleware/tenant.ts` already exists
- The Prisma extension reads from `tenantContext.getStore()?.tenantId`
- This works because Prisma queries are called within the middleware's `tenantContext.run()` callback

**Option B: Request-scoped Prisma instances**
- Create a new Prisma client per request with the tenant ID embedded
- More complex, higher memory usage

**Option A is preferred** because AsyncLocalStorage is already in the codebase.

**Step 4: Service account bypass**

Some operations (health checks, migrations, admin operations) need to bypass RLS. Create a `bypass_rls` role or use `SET app.current_tenant_id = ''` with a policy that allows empty tenant ID.

```sql
-- Allow service account to bypass RLS
ALTER TABLE "Lead" FORCE ROW LEVEL SECURITY;
CREATE POLICY service_account_bypass ON "Lead"
  USING (current_setting('app.current_tenant_id', true) = '' OR
         "tenantId" = current_setting('app.current_tenant_id')::uuid);
```

**Step 5: Testing RLS**

Write integration tests that:
1. Create two tenants with data
2. Set tenant context to tenant A
3. Query all leads -- verify only tenant A leads returned
4. Set tenant context to tenant B
5. Query all leads -- verify only tenant B leads returned
6. Attempt to insert a lead with tenant A's ID while in tenant B context -- verify it fails

### Migration Command

```bash
npx prisma migrate dev --name add_rls_policies
```

## JWT Refresh Token Approach

### Design: Opaque refresh tokens stored in database

**Why opaque tokens over long-lived JWTs:**
- Opaque tokens can be revoked server-side (delete from DB)
- Long-lived JWTs cannot be revoked without a blocklist
- Database lookup is acceptable for the refresh flow (low frequency)

### Schema

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([tokenHash])
}
```

### Token Generation (on login)

```typescript
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Generate opaque refresh token
const refreshTokenPlain = crypto.randomBytes(64).toString('hex');
const refreshTokenHash = await bcrypt.hash(refreshTokenPlain, 10);

// Store in database
await prisma.refreshToken.create({
  data: {
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
});

// Return to client
res.json({
  accessToken: jwt.sign({ ... }, secret, { expiresIn: '1h' }),
  refreshToken: refreshTokenPlain,
});
```

### Token Refresh (POST /api/auth/refresh)

```typescript
// 1. Find all non-expired, non-revoked refresh tokens for any user
// 2. Compare incoming token against each stored hash (bcrypt.compare)
// 3. If match found: issue new access token + new refresh token, revoke old one
// 4. If no match: return 401

const tokens = await prisma.refreshToken.findMany({
  where: { expiresAt: { gt: new Date() }, revoked: false },
});

for (const stored of tokens) {
  if (await bcrypt.compare(refreshTokenPlain, stored.tokenHash)) {
    // Valid -- issue new tokens, revoke old
    // ...
  }
}
```

**Note:** This approach scans all valid tokens. For better performance at scale, add a `tokenId` prefix to the refresh token (e.g., `{id}.{random}`) and index on the ID portion. For the current scale, the scan approach is acceptable.

### Token Revocation (on logout)

```typescript
await prisma.refreshToken.update({
  where: { id: matchedToken.id },
  data: { revoked: true },
});
```

### Frontend Impact

The frontend API client must:
1. Store both `accessToken` and `refreshToken`
2. Send `accessToken` in `Authorization: Bearer` header
3. On 401 response, call `POST /api/auth/refresh` with the `refreshToken`
4. Retry the original request with the new `accessToken`
5. If refresh also fails, redirect to login

## Common Pitfalls

### Pitfall 1: Prisma Client Caching After Schema Change

**What goes wrong:** After adding the RefreshToken model, `prisma generate` must be run. If not, the Prisma client won't have the new model and runtime errors will occur.

**How to avoid:** Add `prisma generate` to the `dev` script in package.json: `"dev": "prisma generate && ts-node --transpile-only src/index.ts"`.

**Warning signs:** `TypeError: prisma.refreshToken is not a function`.

### Pitfall 2: RLS Blocking Service Account Queries

**What goes wrong:** After enabling RLS, health checks and admin queries fail because no tenant context is set.

**How to avoid:** Always set `app.current_tenant_id` before queries. For system-level queries, set it to empty string and use the bypass policy.

**Warning signs:** Health check returns empty results or 500 errors.

### Pitfall 3: AsyncLocalStorage Context Lost in Worker

**What goes wrong:** The BullMQ worker runs outside the Express request lifecycle, so AsyncLocalStorage context from the tenant middleware is not available.

**How to avoid:** The worker already gets `tenantId` from the normalized message (`job.data.tenantId`). Set the ALS context explicitly in the worker before making Prisma calls:
```typescript
tenantContext.run({ tenantId: msg.tenantId }, async () => {
  // ... all Prisma calls here
});
```

**Warning signs:** RLS policies block worker queries (returns empty results).

### Pitfall 4: Frontend Breaks After Auth Changes

**What goes wrong:** The frontend sends `X-API-KEY` header by default. After removing the hardcoded tenant mapping, all API calls fail with 401.

**How to avoid:** Implement the refresh token flow in the frontend API client before deploying the backend changes. Or, temporarily support both auth modes during migration.

**Warning signs:** All frontend API calls return 401.

### Pitfall 5: Signature Verification Breaks Webhook Delivery

**What goes wrong:** Removing the dev-mode signature bypass without updating the Evolution API webhook configuration to include the correct signature header.

**How to avoid:** Ensure `EVOLUTION_API_SECRET` is set in `.env` and the Evolution API webhook configuration includes the correct secret for HMAC signing.

**Warning signs:** All webhooks rejected with 401.

### Pitfall 6: Workspaces Route Tenant Isolation Regression

**What goes wrong:** After removing `getDefaultTenantId()`, existing bots in the database that were created under the hardcoded default tenant become orphaned -- no authenticated user's tenantId matches them.

**How to avoid:** Write a data migration that assigns existing bots to the correct tenant. Or, document that existing dev data needs to be recreated.

**Warning signs:** GET /api/workspaces returns empty list after migration.

## Recommended Task Ordering

```
Wave 0: Infrastructure
  0.1  Install Vitest + supertest + @types/supertest
  0.2  Create vitest.config.ts
  0.3  Create src/__tests__/setup.ts (Prisma mock, Redis mock)
  0.4  Create src/__tests__/helpers.ts (test data factories)
  0.5  Update package.json test scripts
  0.6  Verify `npm test` runs (empty suite passes)

Wave 1: Environment Hardening (no behavior change)
  1.1  Add missing env vars to validation in src/index.ts
  1.2  Remove hardcoded fallback from src/routes/gateway.ts:38
  1.3  Remove hardcoded fallback from src/routes/bot.ts:8
  1.4  Remove hardcoded fallback from src/controllers/whatsappProxy.ts:13
  1.5  Remove hardcoded fallbacks from src/routes/workspaces.ts (3 occurrences)
  1.6  Write tests: env var validation rejects missing vars

Wave 2: Tenant Middleware Fix
  2.1  Fix src/middleware/tenant.ts to reject missing API keys (return 401)
  2.2  Write tests: tenant middleware rejects unauthenticated, accepts valid key

Wave 3: Auth Middleware + Workspaces Wiring
  3.1  Update src/middleware/auth.ts: remove hardcoded tenant ID, resolve from ApiKey table
  3.2  Add `router.use(authenticateToken)` to src/routes/workspaces.ts
  3.3  Replace `getDefaultTenantId()` with `req.user.tenantId` in workspaces routes
  3.4  Replace direct axios calls with centralized adapter calls
  3.5  Write tests: workspaces routes require auth, tenant isolation enforced

Wave 4: JWT Refresh Tokens
  4.1  Add RefreshToken model to prisma/schema.prisma
  4.2  Run `prisma migrate dev --name add_refresh_tokens`
  4.3  Update login endpoint: return accessToken (1h) + refreshToken (7d)
  4.4  Add POST /api/auth/refresh endpoint
  4.5  Add POST /api/auth/logout endpoint (revokes refresh token)
  4.6  Write tests: login returns both tokens, refresh issues new tokens, logout revokes

Wave 5: Signature Verification Hardening
  5.1  Remove dev-mode bypass in src/routes/gateway.ts:40-42
  5.2  Write tests: webhook rejected without valid signature, accepted with valid signature

Wave 6: PostgreSQL RLS
  6.1  Create Prisma migration with RLS policies on all tables
  6.2  Add Prisma extension in src/db/prisma.ts to set session variable
  6.3  Wire tenant context into worker (set ALS before Prisma calls)
  6.4  Write integration tests: cross-tenant access blocked, same-tenant access works

Wave 7: Service Tests
  7.1  Write unit tests: IntentClassifier (all regex paths)
  7.2  Write unit tests: RuleEngine (all intent branches)
  7.3  Write unit tests: SessionManager (Redis mock)
  7.4  Write unit tests: WorkflowEngine (start, processStep, complete)
  7.5  Write unit tests: normalizeWhatsAppWebhook (text, image, edge cases)

Wave 8: Integration Tests
  8.1  Write integration test: webhook -> gateway -> normalize -> queue (mock worker)
  8.2  Write integration test: full auth flow (register -> login -> refresh -> access protected route)
  8.3  Write integration test: tenant isolation (create data as tenant A, verify tenant B cannot access)
  8.4  Verify >80% coverage on services and middleware
```

**Critical path:** Wave 0 -> Wave 1 -> Wave 2 -> Wave 3 (each depends on previous)
**Parallel track:** Wave 4 and Wave 5 can run after Wave 1
**Final track:** Wave 6 depends on Wave 2 + Wave 3; Wave 7-8 can run after Wave 0

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Frontend breaks after auth changes | HIGH | HIGH | Implement refresh token in frontend first, or support dual auth during migration |
| RLS blocks worker queries | HIGH | MEDIUM | Set ALS context in worker; test RLS with worker flow before deploying |
| Existing dev data orphaned | MEDIUM | HIGH | Write data migration script; document that dev data needs recreation |
| Prisma migration fails on production DB | MEDIUM | LOW | Test migration against local DB first; use `prisma migrate dev` not `prisma db push` |
| Vitest incompatible with CommonJS | LOW | LOW | Vitest handles CJS natively; only risk is circular imports with mocked modules |
| Evolution API webhook config needs update | MEDIUM | MEDIUM | Verify webhook config includes correct secret before removing bypass |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded secrets as fallbacks | Fail-fast on missing env vars | Phase 1 | No silent degradation; deployment must provide all secrets |
| 24h JWT expiry | 1h access + 7d refresh | Phase 1 | Reduced blast radius on token compromise |
| No RLS | PostgreSQL RLS on all tables | Phase 1 | Database-level tenant isolation enforcement |
| Zero tests | Vitest suite with >80% coverage | Phase 1 | Regression prevention; confidence in changes |
| Silent tenant middleware skip | Reject unauthenticated requests | Phase 1 | No accidental unauthenticated access |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vitest version 4.1.6 is current as of 2026-05-19 | Standard Stack | May need version adjustment if registry shows different |
| A2 | supertest version 7.2.2 is current as of 2026-05-19 | Standard Stack | May need version adjustment |
| A3 | bcryptjs is suitable for refresh token hashing (already in deps) | JWT Refresh Tokens | Could use crypto.timingSafeEqual with SHA-256 instead |
| A4 | No Prisma migrations exist yet (only `prisma db push` used) | RLS Implementation | If migrations exist, need to append rather than create fresh |
| A5 | Evolution API webhook supports HMAC-SHA256 signing | Signature Verification | If not, need different verification approach |
| A6 | Frontend will be updated separately to handle refresh tokens | JWT Refresh Tokens | If not, backend changes will break frontend |

## Open Questions (RESOLVED)

1. **Should the API key auth path be removed entirely from `authenticateToken`?** (RESOLVED)
   - Decision: Keep API key auth as secondary path. Resolve tenant from ApiKey table instead of hardcoded ID.
   - Rationale: Frontend uses X-API-KEY header; removing would break existing flows.

2. **How to handle existing dev data created under the hardcoded tenant?** (RESOLVED)
   - Decision: Document that dev data needs recreation. No migration script for Phase 1.
   - Rationale: MVP stage, no production data to preserve.

3. **Should RLS use row-level security or application-level filtering?** (RESOLVED)
   - Decision: Both. Prisma where clauses as primary, RLS as defense-in-depth safety net.
   - Rationale: Belt-and-suspenders approach. RLS catches any missed tenantId filters.

4. **Should the worker run in a separate process from the Express server?** (RESOLVED)
   - Decision: Out of scope for Phase 1. Keep co-located.
   - Rationale: Current setup works; separation is a Phase 2+ concern when scaling matters.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All backend code | YES | (check runtime) | -- |
| npm | Package management | YES | (check runtime) | -- |
| PostgreSQL | Database (Docker) | YES (Docker) | 15-alpine | -- |
| Redis | Queue + sessions (Docker) | YES (Docker) | 7-alpine | -- |
| Prisma CLI | Schema management | YES (devDep) | ^5.22.0 | -- |
| ts-node | Dev server | YES (devDep) | ^10.9.2 | -- |

**Missing dependencies with no fallback:** None -- all required services are available via Docker.

**Missing dependencies with fallback:**
- Vitest, supertest -- need to install (not yet in package.json)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.6 |
| Config file | `vitest.config.ts` (to be created) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-1 | Tenant isolation enforced | integration | `npx vitest run src/__tests__/tenant-isolation.test.ts` | NO - Wave 6 |
| FR-2 | JWT auth with refresh tokens | unit + integration | `npx vitest run src/api/auth.test.ts` | NO - Wave 4 |
| FR-2 | API key auth resolves tenant | unit | `npx vitest run src/middleware/auth.test.ts` | NO - Wave 3 |
| FR-3 | Webhook signature verified | unit | `npx vitest run src/routes/gateway.test.ts` | NO - Wave 5 |
| FR-3 | Idempotent webhook processing | integration | `npx vitest run src/routes/gateway.test.ts` | NO - Wave 5 |
| FR-4 | All services tested | unit | `npx vitest run src/services/*.test.ts` | NO - Wave 7 |
| NFR-1 | No hardcoded secrets | unit | `npx vitest run src/__tests__/env-validation.test.ts` | NO - Wave 1 |

### Sampling Rate
- **Per task commit:** `npx vitest run` (quick, no coverage)
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green with >80% coverage on services/middleware

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- framework config
- [ ] `src/__tests__/setup.ts` -- global mocks (Prisma, Redis)
- [ ] `src/__tests__/helpers.ts` -- test data factories
- [ ] `package.json` -- test scripts and dev dependencies

## Sources

### Primary (HIGH confidence)
- Codebase files read directly (all files listed in research tasks)
- `.planning/codebase/ARCHITECTURE.md` -- architecture analysis
- `.planning/codebase/CONCERNS.md` -- security and quality concerns
- `.planning/REQUIREMENTS.md` -- functional requirements
- `.planning/ROADMAP.md` -- phase definitions and success criteria

### Secondary (MEDIUM confidence)
- npm registry -- Vitest, supertest version verification
- PostgreSQL RLS documentation (training knowledge)

### Tertiary (LOW confidence)
- Vitest CommonJS compatibility details (training knowledge, not verified against docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- versions verified against npm registry
- Architecture: HIGH -- derived from direct codebase analysis
- Pitfalls: HIGH -- based on actual code patterns observed
- RLS approach: MEDIUM -- based on PostgreSQL training knowledge, not verified against current Prisma RLS docs
- JWT refresh pattern: HIGH -- standard pattern, bcryptjs already in deps

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (30 days -- stable codebase, no rapid changes expected)
