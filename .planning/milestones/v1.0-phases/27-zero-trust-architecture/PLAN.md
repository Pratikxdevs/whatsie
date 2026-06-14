# Phase 27: Zero-Trust Production Architecture Mega-Refactor

## Goal
Transform the Whatsie CRM from a development prototype into a Zero-Trust, high-performance, WhatsApp-centric AI CRM. Eliminate all dev bypasses, enforce strict tenant isolation, secure data at rest/transit, consolidate the AI engine to OpenRouter, implement a Bento UI grid, and obliterate all dead platform code.

## Context
This is a mandatory security audit and feature completion refactor. The system currently relies on local bypasses (`DEV_AUTH_BYPASS`), insecure key storage, multiple obsolete AI SDKs, and dead platform code (Telegram/Discord/Twitter). It must be fail-secure. 

## Success Criteria
- [ ] `DEV_AUTH_BYPASS` completely removed; Clerk JWT handshake enforced on Express and Socket.IO.
- [ ] Global Prisma middleware drops requests missing `tenantId` (Tenant Isolation).
- [ ] API Keys are AES-256-GCM encrypted in DB; server crashes if key is weak.
- [ ] All legacy AI providers deleted; single `OpenRouterService` running dynamic metadata pipelines.
- [ ] Bots page fully converted to High-Contrast Bento Grid layout with Shadcn Sheet slide-overs.
- [ ] All code traces of Telegram, Slack, Twitter, and Discord removed entirely.
- [ ] Messages use a strict PENDING -> SENT Outbox Pattern.
- [ ] Zero instances of `as any` remaining in API routes.

---

## Execution Waves

### Wave 1: Perimeter Defense & Cryptography (Zero-Trust)
**Objective:** Seal the backend.
- **Task 1.1: Auth Restoration:** Delete `DEV_AUTH_BYPASS`. Restore strict Clerk JWT verification in `src/middleware/auth.ts`. Fail-closed (401) on missing tokens.
- **Task 1.2: Tenant Isolation Middleware:** Create a global Prisma extension/wrapper that automatically injects `{ where: { tenantId: user.tenantId } }` into every `find`, `update`, and `delete`. Return 404 for mismatched IDs to prevent enumeration.
- **Task 1.3: AES-256-GCM Vault:** Implement encryption in `src/utils/crypto.ts` with randomized IVs. Throw `CRITICAL_SECURITY_ERROR` on startup if `CREDENTIAL_ENCRYPTION_KEY` is not exactly 32 bytes. No plaintext keys sent to the frontend.
- **Task 1.4: Traffic Shielding:** Enforce Strict CORS (whitelist `FRONTEND_URL` only). Add helmet for CSP (`script-src` nonce, no `unsafe-inline`), HSTS, and X-Frame-Options. Add `express-rate-limit`.
- **Task 1.5: WebSocket Hardening:** Enforce Clerk JWT verification during the Socket.IO handshake. Lock sockets into strictly named `tenantId` rooms to prevent room-hopping.

### Wave 2: The AI Factory (OpenRouter Dynamic)
**Objective:** Replace hardcoded models with live metadata.
- **Task 2.1: Purge Legacy SDKs:** Recursively delete Groq, Gemini, and OpenAI services/handlers.
- **Task 2.2: Unified Factory Endpoint:** Implement `POST /api/ai/verify`. Fetch `/auth/key` and `/models` from OpenRouter. Return normalized 200+ models with context lengths and pricing.
- **Task 2.3: Frontend Key Vault:** Build `useKeyVault` hook. Obfuscate verified keys in `localStorage` via Base64 salt. Render a "Key Bank" dropdown when configuring bots.
- **Task 2.4: Brand Logo Resolver:** Create a frontend utility mapping `provider_slug` to `https://img.logo.dev/` for live, dynamic AI icons.

### Wave 3: WhatsApp & Real-Time Pulse
**Objective:** Resilient messaging state and agent handoffs.
- **Task 3.1: Instance Heartbeat:** Wire Socket.IO to push live Evolution API events (Battery level, Connection State, Name) directly to the frontend Bot cards.
- **Task 3.2: Outbox Pattern:** Modify DB message creation to default to `status: PENDING`. Only transition to `SENT` upon a 200 OK webhook receipt from the Evolution API.
- **Task 3.3: Agent Handoff Toggle:** Add `bot_paused` boolean to DB. Create UI toggle. Update BullMQ worker to cleanly bypass AI inference if the bot is paused by a human agent.

### Wave 4: Frontend Reconstruction (Bento UI)
**Objective:** Industry-grade visual polish.
- **Task 4.1: Layout Scaling:** Wrap Dashboard and Workspaces in a `max-w-[1600px] mx-auto` layout. Standardize gap-6 spacing and scaling for high-density monitors.
- **Task 4.2: Bots Page Bento Grid:** Refactor the bot card into a high-contrast Bento design:
  - *Primary Block:* WhatsApp Connection (QR, Phone, Live Status).
  - *Secondary Block:* AI Config (Dynamic Logo, Token limit).
  - *Tertiary Block:* Usage Analytics (Cost/Token meters).
- **Task 4.3: Slide-over Architecture:** Move all heavy bot configuration into a Shadcn Sheet (Slide-over) featuring a fullscreen System Prompt editor with live token counting.
- **Task 4.4: Universal Theming:** Map `var(--primary)` globally to scrollbars, checkboxes, and status badges.

### Wave 5: Technical Debt & Hygiene
**Objective:** Ruthless code elimination and strict typing.
- **Task 5.1: Dead Code Removal:** Delete all adapter, normalizer, and worker files associated with Telegram, Discord, Twitter, and Slack.
- **Task 5.2: Type Safety:** Execute a global regex purge of `as any`. Use TypeScript Declaration Merging to extend `Express.Request` with typed `user` and `tenantId` objects.
- **Task 5.3: Zod & Audit Logs:** Ensure all API endpoints validate payloads via Zod. Create an `AuditLog` Prisma model and track credential changes, bot deletions, and user role updates.
- **Task 5.4: Infrastructure Decoupling:** Ensure the BullMQ worker script can be executed independently of the Express API for clean container isolation. Add Redis caching (5-min TTL) for quota lookups.
