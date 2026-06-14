# Phase 24: Ship-Ready Security & Auth

**Gathered:** 2026-06-10
**Status:** Ready for planning
**Source:** User requirements + CONCERNS.md + codebase analysis

<domain>
## Phase Boundary

This phase makes CrmV2 production-shippable by wiring Clerk authentication end-to-end, hardening all security vulnerabilities, cleaning up dead code, and ensuring connection/session persistence across refreshes.

**What this phase delivers:**
- Clerk auth fully wired (frontend ClerkProvider, backend middleware, webhooks)
- All security concerns from CONCERNS.md resolved
- DEV_AUTH_BYPASS removed/hardened
- Credential encryption fallback key eliminated
- Socket.IO CORS fixed
- CSP hardened
- Stale test files removed
- Stale error codes removed
- Connection/session persistence on refresh
- API key hashing hardened with pepper

**Out of scope:**
- New features (this is hardening only)
- Multi-tenant billing changes
- WhatsApp pipeline changes (already working)

</domain>

<decisions>
## Implementation Decisions

### Clerk Auth Architecture
- Use `@clerk/clerk-react` (already installed, v5.61.6) for frontend
- Use `@clerk/express` (already installed, v2.1.19) for backend middleware
- Clerk webhooks already implemented in `src/routes/webhooks.ts` — just need to wire them
- Frontend AuthContext.tsx is FAKE — must be replaced with real Clerk hooks
- Keep existing JWT auth as fallback for API key users (X-API-KEY header)
- Clerk JWT strategy in auth middleware already exists (strategy 4) — needs testing

### Security Hardening
- Remove DEV_AUTH_BYPASS entirely — not gate it behind NODE_ENV, just remove it
- Add CREDENTIAL_ENCRYPTION_KEY as required env var (not optional)
- Fix Socket.IO CORS to use FRONTEND_URL origin
- Remove unsafe-inline from CSP (keep unsafe-eval only if needed, audit first)
- Add HMAC-SHA256 pepper for API key hashing (server-side secret)

### Dead Code Cleanup
- Delete 9 stale test files (discord-*, telegram-webhook)
- Remove TG_* and TW_* error codes from errors/codes.ts
- Remove response-router.test.ts (tests deleted platform dispatch)

### Connection Persistence
- Frontend: Clerk session auto-manages token refresh
- Backend: Clerk middleware handles JWT validation
- Socket.IO: Re-auth on reconnect using Clerk session token
- API interceptor: Attach Clerk token to every request automatically

### Encryption
- Require CREDENTIAL_ENCRYPTION_KEY in production (fail-fast if missing)
- Use separate salt per record (already implemented)
- Never fall back to JWT_SECRET or hardcoded string

</decisions>

<canonical_refs>
## Canonical References

### Architecture
- `.planning/codebase/ARCHITECTURE.md` — System design, auth architecture
- `.planning/codebase/CONCERNS.md` — All security issues to fix
- `.planning/codebase/CONVENTIONS.md` — Code patterns to follow
- `.planning/codebase/STRUCTURE.md` — File locations

### Key Files to Modify
- `frontend/src/contexts/AuthContext.tsx` — Replace fake auth with Clerk
- `frontend/src/App.tsx` — Add ClerkProvider wrapper
- `frontend/src/main.tsx` — Add ClerkProvider at root
- `frontend/src/services/api.ts` — Already has Clerk token interceptor (verify)
- `src/middleware/auth.ts` — Remove DEV_AUTH_BYPASS, harden Clerk strategy
- `src/index.ts` — Fix Socket.IO CORS, add Clerk middleware
- `src/utils/crypto.ts` — Remove fallback key
- `src/utils/env.ts` — Make CREDENTIAL_ENCRYPTION_KEY required in prod
- `src/errors/codes.ts` — Remove TG_* and TW_* codes
- `src/routes/gateway.ts` — Remove DEV_AUTH_BYPASS check

### Key Files to Delete
- 9 stale test files (listed in VERIFICATION.md)

### Clerk Docs
- https://clerk.com/docs/quickstarts/express
- https://clerk.com/docs/references/express/clerkMiddleware
- https://clerk.com/docs/webhooks/sync-data

</canonical_refs>

<specifics>
## Specific Details

### Current Auth State
- Frontend: Fake AuthContext with hardcoded DEV_USER
- Backend: 4 auth strategies (DEV_AUTH_BYPASS, API Key SHA-256, Bearer JWT, Clerk JWT)
- Clerk SDK installed but NOT wired in frontend
- Clerk webhook handler exists but frontend doesn't use Clerk auth flow
- api.ts already has Clerk token interceptor (window.__clerk pattern)

### Security Issues to Fix (from CONCERNS.md)
1. C1: Socket.IO CORS wildcard → use FRONTEND_URL
2. C2: CSP unsafe-inline/unsafe-eval → remove unsafe-inline
3. C3: Credential encryption fallback key → require CREDENTIAL_ENCRYPTION_KEY
4. C4: DEV_AUTH_BYPASS → remove entirely
5. C5: API key SHA-256 → add HMAC with pepper
6. C6: Stale TG/TW error codes → remove
7. C7: Stale test files → delete 9 files

### Connection Flow After Clerk Wiring
1. User visits app → ClerkProvider checks session
2. No session → redirect to Clerk's hosted login (or custom LoginPage)
3. Has session → Clerk provides JWT → api.ts interceptor attaches to requests
4. Backend Clerk middleware validates JWT → populates req.auth
5. Socket.IO connects with Clerk token → re-auth on reconnect
6. Token refresh handled automatically by Clerk SDK

### Env Vars Needed
- CLERK_SECRET_KEY (backend) — already in .env.example
- CLERK_WEBHOOK_SECRET (backend) — already in .env.example
- VITE_CLERK_PUBLISHABLE_KEY (frontend) — already in .env.example
- CREDENTIAL_ENCRYPTION_KEY (backend) — NEW, required in production
- FRONTEND_URL (backend) — for CORS, already optional in env.ts

</specifics>

<deferred>
## Deferred Ideas
- Custom login page UI (use Clerk's hosted pages for now)
- Advanced session management (Clerk handles this)
- Multi-factor authentication (Clerk supports this, enable later)
- Audit logging for sensitive operations (Phase 25)
</deferred>

---
*Phase: 24-ship-security-auth*
*Context gathered: 2026-06-10 via codebase analysis + CONCERNS.md*
