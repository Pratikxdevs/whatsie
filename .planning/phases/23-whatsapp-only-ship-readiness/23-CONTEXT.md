# Phase 23: WhatsApp-Only Ship Readiness - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning
**Source:** User requirements (inline)

<domain>
## Phase Boundary

This phase strips all non-WhatsApp platforms (Telegram, Discord, Twitter) from both frontend and backend, then makes the WhatsApp integration production-ready. The goal is a shippable product with WhatsApp as the sole messaging channel.

**What this phase delivers:**
- WhatsApp-only codebase (no other platforms)
- Working WhatsApp connect flow (QR code)
- Working WhatsApp message fetch (inbound webhook → pipeline)
- Working WhatsApp AI integration (worker → AI service → response)
- Working WhatsApp callback (outbound via Evolution API)
- Changed git remote to new repository

</domain>

<decisions>
## Implementation Decisions

### Platform Removal
- Remove ALL Telegram code: adapters, normalizers, workers, routes, Docker services, platform source directories
- Remove ALL Discord code: adapters, normalizers, workers, routes, startup sync
- Remove ALL Twitter code: adapters, normalizers, workers, routes, Docker services, platform source directories
- Remove platform selection UI from frontend (auto-select WhatsApp)
- Remove Telegram OTP flow, Discord OAuth flow, Twitter login flow from frontend
- Remove platform-specific env vars (TELEGRAM_*, DISCORD_*, TWITTER_*)
- Remove platform-specific rate limiters, metrics, queue definitions

### WhatsApp Readiness
- Keep WhatsApp adapter (evolutionApi.ts, whatsapp.adapter.ts)
- Keep WhatsApp normalizer (whatsapp.ts)
- Keep WhatsApp worker pipeline (13-step)
- Fix WhatsApp connect: QR code generation, scanning, connection state management
- Fix WhatsApp fetch: inbound webhook → normalize → queue → worker
- Fix WhatsApp AI: worker calls AI service, processes response
- Fix WhatsApp callback: outbound message via Evolution API

### Git Repo
- Change git remote to new repository
- Keep commit history

### Claude's Discretion
- Implementation order: removal first, then WhatsApp fixes
- Testing approach: E2E flow verification
- Whether to keep or simplify the platform type union (recommend: keep as `'whatsapp'` only)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `.planning/codebase/ARCHITECTURE.md` — System design, layers, data flow
- `.planning/codebase/STRUCTURE.md` — Directory layout, key locations

### Tech Stack
- `.planning/codebase/STACK.md` — Technologies, frameworks, dependencies
- `.planning/codebase/INTEGRATIONS.md` — External APIs, Evolution API integration

### Concerns
- `.planning/codebase/CONCERNS.md` — Known issues, tech debt, fragile areas

### Existing Code
- `src/adapters/evolutionApi.ts` — WhatsApp Evolution API adapter (620 lines)
- `src/adapters/whatsapp.adapter.ts` — WhatsApp rate-limited wrapper
- `src/normalizer/whatsapp.ts` — WhatsApp message normalizer
- `src/workers/index.ts` — Main worker file with whatsappWorker
- `src/routes/workspaces.ts` — Multi-platform workspace routes (1200+ lines)
- `src/routes/gateway.ts` — Inbound webhook handlers
- `src/router/index.ts` — ResponseRouter dispatch
- `src/queue/setup.ts` — BullMQ queue definitions
- `frontend/src/components/bots/types.ts` — Platform type definitions
- `frontend/src/components/bots/AddBotModal.tsx` — Multi-platform bot creation wizard

</canonical_refs>

<specifics>
## Specific Ideas

### WhatsApp Connect Flow
- Evolution API creates instance → returns QR code
- Frontend polls connection-status → displays QR
- User scans QR with WhatsApp → connection established
- Connection.update webhook updates bot status in DB

### WhatsApp Message Flow
- Inbound: Evolution webhook → gateway.ts → normalizer → bullmq queue → worker
- Worker: 13-step pipeline (session, intent, workflow, rules, AI, CRM, response)
- Outbound: worker → responseRouter → whatsappAdapter → Evolution API

### WhatsApp AI Integration
- Worker calls AI service (OpenAI/Claude) with message context
- AI response returned to worker
- Worker sends response via Evolution API

### Current Known Issues (from CONCERNS.md)
- API keys created with bcrypt but auth middleware uses SHA-256
- Real credentials in .env and apikeys.txt
- Bot status sync blocks startup
- No body size limits on webhook endpoints

</specifics>

<deferred>
## Deferred Ideas

- Multi-platform support (Telegram, Discord, Twitter) — move to separate project/repo
- Platform selector UI — not needed for WhatsApp-only
- Per-platform rate limiting — only WhatsApp needed
- Platform-specific metrics — only WhatsApp needed

</deferred>

---

*Phase: 23-whatsapp-only-ship-readiness*
*Context gathered: 2026-06-09 via user requirements*
