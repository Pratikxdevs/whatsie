# Phase 27 Context — Zero-Trust Production Architecture Mega-Refactor

**Domain:** A major architectural, security, and UI refactor.

**Canonical refs:**
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/phases/27-zero-trust-architecture/27-UI-SPEC.md`

## Decisions

### API Key Encryption Strategy (AES-256-GCM)
- Use a single global `ENCRYPTION_MASTER_KEY` passed via environment variables.

### Tenant Middleware Enforcement
- Apply `src/middleware/tenant.ts` globally to all protected API routes, with explicit exceptions for public endpoints and webhooks.

### Dead Platform Code Deletion
- Ruthlessly delete Telegram, Slack, and Discord application logic, but leave the Prisma schema intact (defer DB migrations to avoid breaking existing data).

### OpenRouter Factory / UI State
- Proxy OpenRouter model fetching through the backend to centralize logic and hide keys from the frontend payload.

## the agent's Discretion
- The implementation of the Bento Grid scaling and the specific placement of settings components in slide-overs is left to the executor, provided it adheres to `27-UI-SPEC.md`.

## Deferred Ideas
- Dropping dead columns/tables from the PostgreSQL database (to be handled in a dedicated migration phase).
