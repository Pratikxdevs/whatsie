# Phase 27: Zero-Trust Production Architecture Mega-Refactor - Plan

## Phase Goal
Strip out all developmental bypasses, completely secure cryptographic keys, harden the tenant perimeter, decouple the AI integration to a single OpenRouter factory, and implement the high-end Bento Grid UI.

## Context & Boundaries
- **UI:** Bento Grid scaling, Shadcn settings slide-overs, max density UI mapping (per `27-UI-SPEC.md`).
- **Security:** Global Tenant Middleware, AES-256-GCM for keys.
- **Tech Debt:** Delete Telegram/Discord/Slack application logic (Prisma schema untouched).

## Execution Plan

### Wave 1: Security & Architecture Hardening
1. **[Backend] Global Tenant Enforcement**
   - **File:** `src/index.ts`, `src/middleware/tenant.ts`
   - **Action:** Apply `tenant.ts` globally after `authenticateToken` middleware. Ensure webhooks (e.g., `/gateway/whatsapp`) are explicitly excluded from tenant validation since they authenticate via HMAC.
   - **Validation:** Requests without tenant headers/JWTs are rejected with 401/403. Webhooks still pass.

2. **[Backend] Missing Environment Variable Fast-Fails**
   - **File:** `src/index.ts`
   - **Action:** Add `ENCRYPTION_MASTER_KEY` to the required env vars array to prevent startup without it. Remove fallback to `''` for critical API keys across the codebase.

3. **[Backend] Key Encryption Utility**
   - **File:** `src/utils/crypto.ts` (NEW)
   - **Action:** Implement `encrypt()` and `decrypt()` functions using `crypto` module (AES-256-GCM) keyed by `ENCRYPTION_MASTER_KEY`.
   - **Validation:** Write basic unit tests to ensure `decrypt(encrypt(val)) === val`.

4. **[Backend] Encrypt AI API Keys**
   - **File:** `src/crm/crmService.ts` (or relevant bot config controllers)
   - **Action:** Encrypt keys on save, decrypt on load before passing to AI factory.
   
5. **[Backend] Ruthless Deletion of Dead Platforms**
   - **File:** `src/adapters/telegram.ts`, `src/adapters/discord.ts`, `src/adapters/slack.ts`, `src/router/index.ts`
   - **Action:** Delete the dead adapter files. Remove routing cases for these platforms in ResponseRouter. Do NOT alter Prisma schema.

### Wave 2: AI Decoupling
1. **[Backend] OpenRouter Factory Setup**
   - **File:** `src/ai/orchestrator.ts`
   - **Action:** Refactor AI dispatching to use a centralized OpenRouter proxy pattern to hide external keys from the frontend client.

### Wave 3: Bento Grid UI & Shadcn Slide-overs
1. **[Frontend] Install Shadcn Primitives**
   - **Action:** Run `npx shadcn@latest add sheet resizable scroll-area` in `frontend/`.

2. **[Frontend] Dashboard Layout Redesign**
   - **File:** `frontend/src/pages/Dashboard.tsx` (or equivalent)
   - **Action:** Implement high-density Bento Grid layout following `27-UI-SPEC.md`.

3. **[Frontend] Slide-over Settings**
   - **File:** `frontend/src/components/settings/SettingsSheet.tsx` (NEW)
   - **Action:** Implement the settings page as a slide-over (`Sheet`) accessible globally.

## Verification
1. Run backend tests to ensure missing env vars fast-fail.
2. Manually test OpenRouter AI responses to ensure the backend proxy is successfully dispatching requests using decrypted keys.
3. Verify that the Shadcn sheet opens correctly on the frontend.
