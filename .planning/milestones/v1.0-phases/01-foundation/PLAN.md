# Phase 1: Foundation Hardening

**Goal:** Secure, testable, properly isolated backend
**Requirements:** FR-1, FR-2, FR-4, NFR-1

---

## Dependency Graph

```
Wave 1 (parallel):
  [P01: Test Infrastructure]    [P02: Remove Hardcoded Secrets]
         |                              |
Wave 2 (after P02):                     |
  [P03: Tenant & Auth Middleware Fixes] |
         |                              |
Wave 3 (after P03):                     |
  [P04: Workspaces Auth Wiring]        |
         |                              |
Wave 4 (after P04, parallel):          |
  [P05: JWT Refresh Tokens]   [P06: PostgreSQL RLS]
         |                              |
Wave 5 (after P01+P03, parallel with P05/P06):
  [P07: Middleware & Auth Tests]        |
         |                              |
Wave 6 (after P05+P06+P07):            |
  [P08: Service & Integration Tests]   |
```

---

## Plan 01: Test Infrastructure Setup

**Wave:** 1 (no dependencies)
**Files:** `vitest.config.ts`, `src/__tests__/setup.ts`, `src/__tests__/helpers.ts`, `package.json`
**Requirements:** FR-4

### Task 1.1: Install Vitest and create config

**Files:** `package.json`, `vitest.config.ts`
**Depends on:** none
**Description:**
1. Run `npm install -D vitest @vitest/coverage-v8 supertest @types/supertest`
2. Create `vitest.config.ts` at project root:
   - `globals: true`, `environment: 'node'`
   - `include: ['src/**/*.test.ts', 'src/**/*.spec.ts']`
   - Coverage provider v8, include `src/**/*.ts`, exclude test files and `src/index.ts`
   - Setup file: `./src/__tests__/setup.ts`
3. Update `package.json` scripts:
   - `"test": "vitest run"`
   - `"test:watch": "vitest"`
   - `"test:coverage": "vitest run --coverage"`

**Verify:** `npm test` runs (empty suite passes with 0 tests)

### Task 1.2: Create test setup and helpers

**Files:** `src/__tests__/setup.ts`, `src/__tests__/helpers.ts`
**Depends on:** Task 1.1
**Description:**
1. Create `src/__tests__/setup.ts`:
   - Mock Prisma client using `vi.mock('../db/prisma')` with a mock object that has all model methods (`findFirst`, `findUnique`, `findMany`, `create`, `update`, `delete`, `$transaction`, `$queryRaw`) returning sensible defaults
   - Mock ioredis using `vi.mock('ioredis')` with an in-memory Map for get/set/del/incr/expire/setnx
   - Mock BullMQ `Queue` and `Worker` classes
   - Set test env vars: `JWT_SECRET`, `GATEWAY_SECURITY_TOKEN`, `EVOLUTION_API_SECRET`, `EVOLUTION_API_KEY`, `EVOLUTION_API_URL`, `DATABASE_URL`, `REDIS_URL`
2. Create `src/__tests__/helpers.ts`:
   - `createTestTenant(overrides?)` — returns a mock tenant object
   - `createTestUser(overrides?)` — returns a mock user object with passwordHash
   - `createTestApiKey(tenantId?)` — returns `{ raw: 'sk_test_...', hash: 'sha256hex...' }`
   - `generateTestToken(payload?)` — signs a JWT with test secret, 1h expiry

**Verify:** `npm test` runs with setup loaded (no import errors)

**Done:** Test infrastructure boots, `npm test` exits 0, helpers export all factory functions.

---

## Plan 02: Remove Hardcoded Secrets

**Wave:** 1 (no dependencies)
**Files:** `src/index.ts`, `src/routes/gateway.ts`, `src/routes/workspaces.ts`, `src/routes/bot.ts`, `src/controllers/whatsappProxy.ts`
**Requirements:** NFR-1

### Task 2.1: Add missing required env vars to index.ts

**Files:** `src/index.ts`
**Depends on:** none
**Description:**
Add to the `requiredEnvs` array at line 20:
- `'EVOLUTION_API_SECRET'`
- `'EVOLUTION_API_KEY'`
- `'EVOLUTION_API_URL'`

The array becomes: `['DATABASE_URL', 'REDIS_URL', 'GATEWAY_SECURITY_TOKEN', 'JWT_SECRET', 'EVOLUTION_API_SECRET', 'EVOLUTION_API_KEY', 'EVOLUTION_API_URL']`

**Verify:** `grep -c 'EVOLUTION_API_SECRET' src/index.ts` returns 1

### Task 2.2: Remove hardcoded fallback secrets from all files

**Files:** `src/routes/gateway.ts`, `src/routes/workspaces.ts`, `src/routes/bot.ts`, `src/controllers/whatsappProxy.ts`
**Depends on:** Task 2.1
**Description:**
1. `src/routes/gateway.ts:38` — Change `const secret = process.env.EVOLUTION_API_SECRET || 'fallback-secret'` to `const secret = process.env.EVOLUTION_API_SECRET!` (env validation in index.ts guarantees it exists)
2. `src/routes/workspaces.ts:84` — Change `process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11'` to `process.env.EVOLUTION_API_KEY!`
3. `src/routes/workspaces.ts:85` — Change `process.env.GATEWAY_SECURITY_TOKEN || 'super_secure_gateway_key'` to `process.env.GATEWAY_SECURITY_TOKEN!`
4. `src/routes/workspaces.ts:165` — Same pattern as line 84 for evolutionKey
5. `src/routes/workspaces.ts:205` — Same pattern as line 84 for evolutionKey
6. `src/routes/bot.ts:8` — Change `process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11'` to `process.env.EVOLUTION_API_KEY!`
7. `src/controllers/whatsappProxy.ts:13` — Change `process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11'` to `process.env.EVOLUTION_API_KEY!`

After all changes, verify no fallback patterns remain:
```
grep -rn "|| '" src/ --include="*.ts" | grep -i "fallback\|secret\|429683\|super_secure"
```
Should return 0 results.

**Verify:** `grep -v '^#' src/routes/gateway.ts src/routes/workspaces.ts src/routes/bot.ts src/controllers/whatsappProxy.ts | grep -c "fallback-secret\|429683C4\|super_secure"` returns 0

### Task 2.3: Fix gateway signature verification bypass

**Files:** `src/routes/gateway.ts`
**Depends on:** Task 2.2
**Description:**
Remove lines 40-42 (the dev-mode bypass):
```typescript
if (process.env.NODE_ENV !== 'production' && !signature) {
  return next(); // Bypass in dev if no signature provided
}
```

After removal, the flow becomes: if no signature header AND not `sha256=` prefix, return 401. The existing check at line 44-46 already handles this.

Also update the signature check at lines 49-57 to handle non-sha256 signatures: if the signature does NOT start with `sha256=`, treat it as a bearer token comparison against `EVOLUTION_API_SECRET` (Evolution API sends `Authorization: Bearer <secret>`).

**Verify:** `grep -c "NODE_ENV.*production.*signature" src/routes/gateway.ts` returns 0

**Done:** Zero hardcoded secrets in src/, env validation catches missing vars at startup, signature verification always enforced.

---

## Plan 03: Tenant & Auth Middleware Fixes

**Wave:** 2 (depends on P02 for env validation)
**Files:** `src/middleware/tenant.ts`, `src/middleware/auth.ts`
**Requirements:** FR-1, FR-2

### Task 3.1: Fix tenant middleware to reject missing API keys

**Files:** `src/middleware/tenant.ts`
**Depends on:** Plan 02
**Description:**
Replace the passthrough behavior at lines 16-21. The middleware must reject requests without an `X-API-KEY` header:

```typescript
if (!apiKey) {
  return res.status(401).json({ error: 'X-API-KEY header is required' });
}
```

Remove the comment about skipping for gateway — the gateway has its own `authenticateTenant` middleware and does not use `tenantAuthMiddleware`.

Also remove the `(prisma as any)` cast at line 25 — after `prisma generate`, the `apiKey` model is properly typed. If the cast is still needed due to generation issues, keep it but add a `// TODO: remove after prisma generate` comment.

**Verify:** `grep -c "return next()" src/middleware/tenant.ts` returns 0 (no more silent passthrough)

### Task 3.2: Fix auth middleware to resolve tenant from API key

**Files:** `src/middleware/auth.ts`
**Depends on:** Task 3.1
**Description:**
The current API key strategy (lines 21-33) maps ALL API key users to a hardcoded default tenant. Fix it to resolve the tenant from the `ApiKey` table:

1. Import `prisma` from `../db/prisma` and `crypto` from `crypto`
2. Replace the API key block (lines 21-33):
   - Hash the incoming API key with SHA-256
   - Look up the hash in the `ApiKey` table (include tenant)
   - If found and tenant is active, set `req.user = { id: 'api-key-user', tenantId: keyRecord.tenantId, role: 'admin' }`
   - If not found, return 401
3. Remove the hardcoded `DEFAULT_TENANT_ID` fallback at line 27

The JWT strategy (lines 35-55) remains unchanged.

**Verify:** `grep -c "87a8873c" src/middleware/auth.ts` returns 0 (no hardcoded tenant ID)

**Done:** Tenant middleware rejects unauthenticated requests with 401. Auth middleware resolves tenant from ApiKey table. No hardcoded tenant IDs in either file.

---

## Plan 04: Workspaces Auth Wiring

**Wave:** 3 (depends on P03 for auth middleware fix)
**Files:** `src/routes/workspaces.ts`
**Requirements:** FR-1, FR-2

### Task 4.1: Wire auth middleware to workspaces routes

**Files:** `src/routes/workspaces.ts`
**Depends on:** Plan 03
**Description:**
1. Import `authenticateToken` and `AuthenticatedRequest` from `../middleware/auth`
2. Add `router.use(authenticateToken)` at line 6 (after `const router = Router()`)
3. Remove the entire `getDefaultTenantId` function (lines 24-38)
4. Replace all `await getDefaultTenantId()` calls with `(req as AuthenticatedRequest).user!.tenantId`:
   - Line 43 in GET `/`
   - Line 59 in POST `/`
5. Add tenant scoping to the DELETE and PUT routes — verify the bot belongs to the requesting user's tenant:
   - In PUT `/:id` (line 126): add `tenantId: (req as AuthenticatedRequest).user!.tenantId` to the where clause
   - In DELETE `/:id` (line 158): same pattern
   - In GET `/:id/waha-status` (line 194): same pattern
6. Replace direct axios calls to Evolution API with the centralized adapter at `src/adapters/evolutionApi.ts`:
   - POST `/` (lines 88-106): use `EvoApi.createInstance(sessionName, webhookUrl)` or similar
   - DELETE `/:id` (lines 170-176): use `EvoApi.deleteInstance(sessionName)`
   - GET `/:id/waha-status` (lines 209-211, 230-232): use `EvoApi.getConnectionState(sessionName)` and `EvoApi.connectInstance(sessionName)`

If the adapter doesn't expose the needed methods, add them to `src/adapters/evolutionApi.ts` as thin wrappers.

**Verify:** `grep -c "getDefaultTenantId" src/routes/workspaces.ts` returns 0; `grep -c "authenticateToken" src/routes/workspaces.ts` returns at least 1

**Done:** All workspaces routes require JWT authentication. Tenant ID comes from the authenticated user, not a hardcoded default. All Evolution API calls go through the centralized adapter.

---

## Plan 05: JWT Refresh Tokens

**Wave:** 4 (depends on P04 for schema readiness; can run in parallel with P08)
**Files:** `prisma/schema.prisma`, `src/api/auth.ts`
**Requirements:** FR-2

### Task 5.1: Add RefreshToken model and generate migration

**Files:** `prisma/schema.prisma`
**Depends on:** Plan 04 (schema must be stable)
**Description:**
Add the RefreshToken model to `prisma/schema.prisma` after the `AiLog` model:

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

Add the reverse relation to the `User` model:
```prisma
refreshTokens RefreshToken[]
```

Run `npx prisma migrate dev --name add_refresh_tokens` to generate the migration.

**Verify:** `npx prisma migrate status` shows the migration applied; `npx prisma generate` succeeds

### Task 5.2: Implement refresh token endpoints

**Files:** `src/api/auth.ts`
**Depends on:** Task 5.1
**Description:**
1. Import `crypto` from `crypto`
2. **Update login endpoint (POST /login):**
   - Change JWT expiry from `'24h'` to `'1h'`
   - Generate refresh token: `crypto.randomBytes(64).toString('hex')`
   - Hash it with bcrypt: `await bcrypt.hash(refreshTokenPlain, 10)`
   - Store in `prisma.refreshToken.create({ data: { userId: user.id, tokenHash: refreshTokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } })`
   - Return `{ message, accessToken: token, refreshToken: refreshTokenPlain, tenantId, userId }` (rename `token` to `accessToken`)
3. **Add POST /refresh endpoint:**
   - Accept `{ refreshToken }` in body
   - Find all non-expired, non-revoked refresh tokens: `prisma.refreshToken.findMany({ where: { expiresAt: { gt: new Date() }, revoked: false } })`
   - Compare incoming token against each stored hash using `bcrypt.compare`
   - If match: issue new access token (1h) + new refresh token (7d), revoke old token, return both
   - If no match: return 401
4. **Add POST /logout endpoint:**
   - Accept `{ refreshToken }` in body
   - Find and revoke the matching refresh token (set `revoked: true`)
   - Return `{ message: 'Logged out successfully' }`

**Verify:** `grep -c "expiresIn: '24h'" src/api/auth.ts` returns 0; `grep -c "POST.*refresh" src/api/auth.ts` returns at least 1; `grep -c "POST.*logout" src/api/auth.ts` returns at least 1

**Done:** Login returns accessToken (1h) + refreshToken (7d). POST /refresh exchanges refresh token for new pair. POST /logout revokes refresh token. RefreshToken model exists in schema.

---

## Plan 06: PostgreSQL Row-Level Security

**Wave:** 4 (depends on P03 for tenant middleware; can run in parallel with P05)
**Files:** `src/db/prisma.ts`, `prisma/migrations/` (new migration)
**Requirements:** FR-1

### Task 6.1: Create RLS migration

**Files:** `prisma/migrations/` (new SQL migration)
**Depends on:** Plan 03 (tenant context must be functional)
**Description:**
Create a Prisma migration that enables RLS on all tenant-scoped tables. Run:
```bash
npx prisma migrate dev --name add_rls_policies
```

In the generated migration SQL, add the following after the schema changes:

1. Enable RLS on all tables with `tenantId`:
   - `Tenant`, `User`, `Bot`, `Lead`, `Conversation`, `Message`, `Workflow`, `WorkflowExecution`, `ApiKey`, `Event`, `BillingUsage`, `AiLog`, `RefreshToken`

2. Create a policy for each table:
   ```sql
   CREATE POLICY tenant_isolation ON "Lead"
     USING ("tenantId" = current_setting('app.current_tenant_id')::uuid);
   ```
   Repeat for every table with a `tenantId` column.

3. Add a service-account bypass policy on each table:
   ```sql
   CREATE POLICY service_bypass ON "Lead"
     USING (current_setting('app.current_tenant_id', true) = '' OR
            "tenantId" = current_setting('app.current_tenant_id')::uuid);
   ```

4. Force RLS on all tables: `ALTER TABLE "Lead" FORCE ROW LEVEL SECURITY;`

**Verify:** Migration applies without error; `\d "Lead"` in psql shows `Row level security: enabled`

### Task 6.2: Add Prisma extension for tenant context

**Files:** `src/db/prisma.ts`
**Depends on:** Task 6.1
**Description:**
Modify `src/db/prisma.ts` to add a Prisma extension that sets `app.current_tenant_id` before every query:

1. Import `tenantContext` from `../middleware/tenant`
2. Create the base PrismaClient as usual
3. Extend it with `$extends`:
   ```typescript
   export const prisma = basePrisma.$extends({
     query: {
       $allModels: {
         async $allOperations({ args, query }) {
           const store = tenantContext.getStore();
           if (store?.tenantId) {
             await basePrisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${store.tenantId}, true)`;
           }
           return query(args);
         },
       },
     },
   });
   ```
4. For system-level queries (health checks, migrations), the bypass policy allows empty `app.current_tenant_id`

**Important:** Use `set_config` with `true` (local to transaction) instead of `SET` to avoid connection pool issues.

**Verify:** `grep -c "set_config" src/db/prisma.ts` returns at least 1; `grep -c "tenantContext" src/db/prisma.ts` returns at least 1

**Done:** RLS policies active on all tables. Prisma extension sets `app.current_tenant_id` from AsyncLocalStorage before every query. Cross-tenant queries return empty results at the database level.

---

## Plan 07: Middleware & Auth Tests

**Wave:** 5 (depends on P01 for test infra, P03 for middleware fixes, P02 for gateway fix)
**Files:** `src/middleware/tenant.test.ts`, `src/middleware/auth.test.ts`, `src/routes/gateway.test.ts`, `src/api/auth.test.ts`
**Requirements:** FR-2, FR-4

### Task 7.1: Write tenant middleware tests

**Files:** `src/middleware/tenant.test.ts`
**Depends on:** Plans 01, 03
**Description:**
Write tests using supertest against an Express app with the tenant middleware:

1. **Rejects request without X-API-KEY** — expects 401 with `{ error: 'X-API-KEY header is required' }`
2. **Rejects request with invalid API key** — expects 401 with `{ error: 'Invalid API Key' }`
3. **Rejects request when tenant is suspended** — mock tenant status as 'suspended', expects 403
4. **Accepts request with valid API key** — mock ApiKey lookup returning valid record, expects 200 and `tenantContext.getStore()?.tenantId` is set
5. **Sets tenant context in AsyncLocalStorage** — verify downstream handler can read tenantId from `tenantContext.getStore()`

Mock `prisma.apiKey.findFirst` to return test data.

**Verify:** `npx vitest run src/middleware/tenant.test.ts` passes

### Task 7.2: Write auth middleware tests

**Files:** `src/middleware/auth.test.ts`
**Depends on:** Plans 01, 03
**Description:**
Write tests for `authenticateToken`:

1. **Rejects request without token or API key** — expects 401
2. **Rejects request with invalid JWT** — expects 403
3. **Rejects request with expired JWT** — sign token with `-1s` expiry, expects 403
4. **Accepts valid JWT** — sign with test secret, expects 200, `req.user` populated
5. **Resolves tenant from API key via ApiKey table** — mock prisma.apiKey.findFirst, expects 200 with correct tenantId
6. **Rejects API key not found in database** — mock prisma.apiKey.findFirst returning null, expects 401

**Verify:** `npx vitest run src/middleware/auth.test.ts` passes

### Task 7.3: Write gateway signature verification tests

**Files:** `src/routes/gateway.test.ts`
**Depends on:** Plans 01, 02
**Description:**
Write tests for the webhook signature verification:

1. **Rejects webhook without signature** — expects 401
2. **Rejects webhook with invalid HMAC signature** — expects 401
3. **Accepts webhook with valid HMAC-SHA256 signature** — compute correct HMAC, expects 200
4. **Accepts webhook with valid Bearer token** — send `Authorization: Bearer <EVOLUTION_API_SECRET>`, expects 200
5. **No dev-mode bypass exists** — set `NODE_ENV=development`, send no signature, still expects 401

**Verify:** `npx vitest run src/routes/gateway.test.ts` passes

### Task 7.4: Write auth endpoint tests

**Files:** `src/api/auth.test.ts`
**Depends on:** Plans 01, 05
**Description:**
Write tests for register, login, refresh, and logout:

1. **Register creates tenant and user** — POST /api/auth/register, expects 201 with tenantId and userId
2. **Register rejects duplicate email** — expects 400
3. **Login returns accessToken and refreshToken** — POST /api/auth/login, expects 200 with both tokens
4. **Login rejects invalid password** — expects 401
5. **Refresh issues new token pair** — POST /api/auth/refresh with valid refreshToken, expects 200 with new accessToken and refreshToken
6. **Refresh rejects revoked token** — revoke token, then try refresh, expects 401
7. **Logout revokes refresh token** — POST /api/auth/logout, then try refresh, expects 401

**Verify:** `npx vitest run src/api/auth.test.ts` passes

**Done:** All middleware tests pass. Auth endpoint tests cover register, login, refresh, logout. Gateway signature tests verify no bypass exists.

---

## Plan 08: Service & Integration Tests

**Wave:** 6 (depends on P01, P07, P05, P08)
**Files:** `src/services/intentClassifier.test.ts`, `src/services/ruleEngine.test.ts`, `src/services/sessionManager.test.ts`, `src/normalizer/whatsapp.test.ts`, `src/__tests__/integration/whatsapp-pipeline.test.ts`, `src/__tests__/integration/tenant-isolation.test.ts`
**Requirements:** FR-1, FR-4

### Task 8.1: Write service unit tests

**Files:** `src/services/intentClassifier.test.ts`, `src/services/ruleEngine.test.ts`, `src/services/sessionManager.test.ts`, `src/normalizer/whatsapp.test.ts`
**Depends on:** Plan 01
**Description:**
1. **intentClassifier.test.ts** — Test all regex/keyword matching paths:
   - Greeting intent detected for "hello", "hi", "hey"
   - Pricing intent detected for "how much", "price", "cost"
   - Support intent detected for "help", "issue", "problem"
   - Unknown intent for unmatched input
   - Case insensitive matching

2. **ruleEngine.test.ts** — Test rule evaluation:
   - Matching rule returns correct action
   - No matching rule returns default action
   - Multiple rules, first match wins

3. **sessionManager.test.ts** — Test Redis session operations (mock Redis):
   - Set and get session data
   - Session expiry
   - Delete session
   - Get non-existent session returns null

4. **whatsapp.test.ts** — Test payload normalization:
   - Text message normalization
   - Image message normalization
   - Edge cases: missing fields, empty payload
   - Outbound rendering (if `renderOutboundWhatsApp` is wired)

**Verify:** `npx vitest run src/services/ src/normalizer/` passes

### Task 8.2: Write integration tests

**Files:** `src/__tests__/integration/whatsapp-pipeline.test.ts`, `src/__tests__/integration/tenant-isolation.test.ts`
**Depends on:** Plans 01, 05, 06, 07
**Description:**
1. **whatsapp-pipeline.test.ts** — End-to-end webhook processing:
   - Mock Evolution API tenant lookup
   - POST valid webhook payload with correct signature to `/gateway/whatsapp/:tenantId`
   - Verify 200 OK returned immediately
   - Verify message was normalized and added to queue (mock queue.add)
   - Verify idempotency: same message ID twice, second is skipped

2. **tenant-isolation.test.ts** — Cross-tenant access blocked:
   - Create two tenants (A and B) with leads
   - Set tenant context to A, query leads — verify only A's leads returned
   - Set tenant context to B, query leads — verify only B's leads returned
   - Attempt to access A's lead while in B context — verify blocked

**Verify:** `npx vitest run src/__tests__/integration/` passes

### Task 8.3: Verify coverage threshold

**Files:** none (verification only)
**Depends on:** Tasks 8.1, 8.2
**Description:**
Run full test suite with coverage:
```bash
npx vitest run --coverage
```

Verify:
- Overall coverage on `src/services/` and `src/middleware/` exceeds 80%
- All tests pass
- No skipped or todo tests

If coverage is below 80%, add tests for uncovered branches in the service and middleware files.

**Verify:** `npx vitest run --coverage` shows >80% on services and middleware

**Done:** All service unit tests pass. WhatsApp pipeline integration test passes end-to-end. Tenant isolation test confirms cross-tenant access is blocked. Coverage >80% on services and middleware.

---

## Success Criteria

- [ ] Zero hardcoded secrets in `src/` (grep returns 0 matches for fallback patterns)
- [ ] Unauthenticated requests to protected routes return 401
- [ ] RLS policies active on all Prisma models
- [ ] JWT refresh tokens working (login returns both tokens, refresh exchanges, logout revokes)
- [ ] Test suite passes with >80% coverage on services and middleware
- [ ] WhatsApp pipeline integration test passes end-to-end

## Execution Notes

**Critical path:** P02 -> P03 -> P04 -> P06 (env hardening -> middleware fixes -> workspaces wiring -> RLS)

**Parallel tracks:**
- P01 (test infra) runs in parallel with P02
- P05 (JWT refresh) and P06 (RLS) run in parallel in Wave 4
- P07 (tests) runs in parallel with P05/P06

**Risk:** Frontend sends `X-API-KEY` header by default. After P04, the frontend must authenticate with JWT tokens for workspaces routes. Coordinate frontend API client update before deploying backend changes, or temporarily support both auth modes.
