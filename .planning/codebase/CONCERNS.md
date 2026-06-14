# CONCERNS.md — Security, Bugs, Dead Code & Docker Readiness
**Last mapped:** 2026-06-14

---

## 🔴 CRITICAL SECURITY — Fix Before Any Deployment

### S-001: Hardcoded Credentials in `docker-compose.yml`
**File:** `docker-compose.yml` lines 9, 45, 74, 76
**Severity:** CRITICAL — credentials committed to git history

```yaml
POSTGRES_PASSWORD: "CrmV2@2026"              # line 9 — also in DATABASE_URL
GF_SECURITY_ADMIN_PASSWORD=admin             # line 45 — Grafana admin
POSTGRES_PASSWORD=CrmV2@2026                 # line 74 — evolution-api service
AUTHENTICATION_API_KEY=429683C4C977415CAAFCCE10F7D57E11  # line 76 — Evo API key in git
```

**Fix:** Use `env_file: .env` or Docker secrets. Never inline credentials.

```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY}
```

---

### S-002: Empty String Fallback on API Keys
**Files:** `src/adapters/evolutionApi.ts:17`, `src/ai/orchestrator.ts:77`, `src/debug/server.ts:127`, `src/AiInteg/bridge.ts:213`, `src/AiInteg/config.ts:58`

```typescript
const EVO_KEY = process.env.EVOLUTION_API_KEY || '';   // silent empty key
const apiKey = botConfig.api_key || process.env.OPENROUTER_API_KEY || '';
```

**Risk:** If env var is missing, requests go out with empty API key — silent auth failure, unpredictable upstream behavior. Should throw at startup (like `API_KEY_PEPPER` does).

**Fix:** Enforce in `requiredEnvs` array in `src/index.ts` (already done for `EVOLUTION_API_KEY`), and remove `|| ''` fallbacks in adapters.

---

### S-003: Debug Server Has No Default Auth
**File:** `src/debug/server.ts:161-167`

```typescript
const debugToken = process.env.DEBUG_TOKEN;
// If DEBUG_TOKEN is not set → anyone on port 9222 gets full access
```

The debug server exposes: live logs, error history, system health, Docker container logs, Evolution API instance list. Without `DEBUG_TOKEN`, this is a full internal data dump to any network peer.

**Fix:** Make `DEBUG_TOKEN` required (add to `requiredEnvs`) OR default to disabled (`DEBUG_ENABLED=false`).

---

### S-004: XSS via `innerHTML` in Debug Server
**File:** `src/debug/server.ts:404, 428, 431, 441`

```javascript
container.innerHTML = filtered.slice(0, 200).map(l => `...${l.message}...`);
document.getElementById('sysStatus').innerHTML = `<span>... ${health.status}</span>`;
grid.innerHTML = Object.entries(health.checks).map(...);
tbody.innerHTML = Object.entries(stats.errorsByCode).map(...);
```

Log messages or health check strings from external sources (Evolution API errors, upstream HTTP errors) are injected directly into innerHTML. If an upstream error contains `<script>`, it executes in the debug UI.

**Fix:** Use `textContent` or escape HTML before injection. Or use DOMPurify (already a dependency).

---

### S-005: Dead Auth Endpoint Reachable in Production
**File:** `src/api/auth.ts`

```
POST /api/auth/register  ← creates a user with bcrypt hash + JWT
POST /api/auth/login     ← validates bcrypt + issues JWT
```

This legacy auth system is mounted in `src/index.ts` and **reachable in production**. It operates outside Clerk, so accounts created here bypass Clerk's session management. A user could register via this endpoint and call any authenticated API with the returned JWT.

**Fix:** Remove `src/api/auth.ts` and unmount `/api/auth` route from `src/index.ts`.

---

### S-006: `src/middleware/tenant.ts` Never Applied
**File:** `src/middleware/tenant.ts`

This middleware was written to enforce tenant boundaries but is **imported nowhere** in `src/index.ts` or any route. All tenant isolation relies on `authenticateToken` extracting `tenantId` from the JWT — routes that apply auth correctly are safe, but a future route that skips `authenticateToken` would have zero tenant isolation.

**Fix:** Delete this dead file or wire it into the router as a second middleware layer after auth.

---

## 🟠 HIGH — Bugs & Behavioral Issues

### B-001: Stale Telegram Env Vars in Test Setup
**File:** `src/__tests__/setup.ts:11-12`

```typescript
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';
process.env.TELEGRAM_WEBHOOK_SECRET = 'test-telegram-secret';
```

Telegram was removed from the codebase. These env vars reference a non-existent integration. Test files `analytics-api.test.ts` and `conversations-api.test.ts` also contain Telegram references.

**Fix:** Remove all Telegram references from test files.

---

### B-002: `src/normalizer/whatsapp.test.ts` in Wrong Directory
**File:** `src/normalizer/whatsapp.test.ts`

A test file living alongside production code. This is not in `src/__tests__/` and may not be picked up by the Vitest config depending on glob patterns. Vitest will include it if using `**/*.test.ts` globbing — which duplicates coverage — but the file won't be co-located with other tests.

**Fix:** Move to `src/__tests__/normalizer.test.ts`.

---

### B-003: `src/platforms/` Is an Empty Directory
**File:** `src/platforms/`

Empty after Telegram/Discord/Twitter removal. Git doesn't track empty directories. This directory will not exist after a fresh `git clone`, which could cause import errors if any file tries to reference it.

**Fix:** Delete the directory (nothing references it).

---

### B-004: `src/rateLimiter/index.ts` May Duplicate `src/middleware/rateLimit.ts`
Both files exist and both configure rate limiting. Without reading both in full, the risk is conflicting or duplicate rate limiter configs being applied.

**Fix:** Audit both files, consolidate into one, delete the other.

---

### B-005: Postman Collection Committed to Repo
**File:** `Evolution API - v2.3.-.postman_collection.json` (root dir)

This is a ~100KB Postman collection artifact. It does not belong in the repo — it's a dev tooling artifact.

**Fix:** Add to `.gitignore` and delete from repo.

---

### B-006: `coverage/` Directory Committed
**File:** `coverage/` (root dir — `coverage-final.json` is large)

Coverage output should never be committed. It's gitignored in `.gitignore` but the directory exists with content — meaning it was committed before the gitignore rule existed.

**Fix:** `git rm -r --cached coverage/` then let `.gitignore` keep it clean going forward.

---

## 🟡 MEDIUM — Tech Debt

### D-001: 44 `as any` Type Casts in Production Code
`src/` (non-test) contains 44 instances of `as any`. Each is a runtime type hole — TypeScript cannot catch errors at these call sites.

**Priority files to fix:**
- `src/workers/index.ts`
- `src/crm/crmService.ts`
- `src/AiInteg/bridge.ts`

---

### D-002: Frontend Contains Server-Side-Only Packages
**File:** `frontend/package.json`

| Package | Issue |
|---------|-------|
| `express-rate-limit ^8.5.2` | Server-only |
| `helmet ^8.2.0` | Server-only |
| `pino ^10.3.1` / `pino-pretty` | Node-native, wrong for browser |
| `rate-limit-redis ^5.0.0` | Requires Redis bindings |
| `next-themes ^0.4.6` | Next.js specific, not Vite |
| `isomorphic-dompurify ^3.14.0` | Redundant with `dompurify` |

These increase bundle size and will likely cause Vite build failures in CI/production.

---

### D-003: Dead `src/api/auth.ts` Register/Login System
Full bcrypt+JWT register/login API wired into production. Bypasses Clerk. Should be deleted entirely.

---

### D-004: AI API Key Duplication — Two Config Files
Both `src/ai/orchestrator.ts` and `src/AiInteg/config.ts` implement the same logic:

```typescript
const apiKey = botConfig.api_key || userApiKey || process.env.OPENROUTER_API_KEY || '';
```

Duplicate resolution logic risks divergence. One canonical config should be used.

---

## 🐳 DOCKER READINESS — `.dockerignore` Missing + Gitignore Gaps

**No `.dockerignore` file exists.** Without it, `docker build` sends the entire project context to the daemon — including `node_modules/`, `coverage/`, `.git/`, `.planning/`, test files, and any local secrets that aren't gitignored.

### Required `.dockerignore`

```
# Node
node_modules/
frontend/node_modules/
npm-debug.log*

# Build output (will be generated in container)
dist/
frontend/dist/
build/

# Environment & secrets
.env
.env.*
apikeys.txt
bypassall.txt
*.pem
*.key

# Git & CI
.git/
.gitignore
.github/

# Planning & documentation (not needed in image)
.planning/
.agent/
*.md
ARCHITECTURE.txt

# Test artifacts
coverage/
.nyc_output/
test-results/
src/__tests__/

# Dev tooling
*.postman_collection.json
Dockerfile.dev
docker-compose.override.yml

# OS
.DS_Store
Thumbs.db

# TypeScript source (if using compiled output)
# Uncomment if Dockerfile builds TS→JS:
# *.ts
# !src/**/*.d.ts
```

### Additional `.gitignore` Entries Needed

```gitignore
# Currently missing:
*.postman_collection.json
coverage/
docker-compose.override.yml
*.postman_environment.json
```

---

## Summary Table

| ID | Severity | Category | Description |
|----|----------|----------|-------------|
| S-001 | 🔴 CRITICAL | Security | Hardcoded credentials in docker-compose.yml |
| S-002 | 🔴 CRITICAL | Security | Empty-string fallback on API keys (silent failures) |
| S-003 | 🔴 CRITICAL | Security | Debug server unprotected by default |
| S-004 | 🔴 CRITICAL | Security | XSS via innerHTML in debug UI |
| S-005 | 🔴 CRITICAL | Security | Dead legacy auth endpoint reachable in prod |
| S-006 | 🟠 HIGH | Security | tenant.ts middleware never applied |
| B-001 | 🟠 HIGH | Bug | Stale Telegram env vars in test setup |
| B-002 | 🟠 HIGH | Bug | Test file in wrong directory |
| B-003 | 🟡 MEDIUM | Dead Code | Empty `src/platforms/` directory |
| B-004 | 🟡 MEDIUM | Bug | Possible duplicate rate limiter configs |
| B-005 | 🟡 MEDIUM | Repo hygiene | Postman collection committed |
| B-006 | 🟡 MEDIUM | Repo hygiene | `coverage/` dir committed |
| D-001 | 🟡 MEDIUM | Tech Debt | 44 `as any` casts in production code |
| D-002 | 🟡 MEDIUM | Tech Debt | Server-only packages in frontend deps |
| D-003 | 🟡 MEDIUM | Dead Code | `src/api/auth.ts` — dead register/login |
| D-004 | 🟡 MEDIUM | Tech Debt | AI key resolution duplicated in two files |
| — | 🔴 CRITICAL | Docker | No `.dockerignore` file — full context sent to daemon |
