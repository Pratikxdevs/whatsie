# CrmV2 — Multi-Platform AI CRM Bot SaaS

**Created:** 2026-05-19
**Status:** Active — Brownfield project

## Vision

Multi-tenant SaaS platform enabling businesses to deploy AI-powered bots across 8 messaging platforms (WhatsApp, Telegram, Discord, FB Messenger, Instagram, MS Teams, Twitch, Twitter/X). Unified message handling, AI-powered conversations, CRM lead management, workflow automation, real-time dashboard.

## Current State

WhatsApp pipeline works end-to-end (gateway → normalizer → queue → worker → AI → CRM → response). Everything else is partial or missing. See `.planning/codebase/CONCERNS.md` for full gap analysis.

### What Works
- WhatsApp adapter (Evolution API) — full send/receive
- BullMQ queue for WhatsApp messages
- Worker pipeline: session → CRM → context → workflow → intent → rules → AI → outbound
- AI orchestrator (OpenAI, Groq, OpenRouter, Gemini — env-configurable)
- Prisma schema with all core models (tenant, user, bot, lead, conversation, message, workflow, event, billing, ai_log)
- Basic JWT auth (register/login)
- Frontend: single /bots page with React + Vite + Tailwind + Radix UI

### What's Broken or Missing
- Multi-tenancy: tenant middleware silently skips validation, workspaces uses hardcoded default tenant, no RLS
- Security: hardcoded fallback secrets in source, unauthenticated routes, JWT 24h expiry (should be 1h)
- Tests: zero tests exist, test script exits with error
- Observability: logger is console.log wrapper (Pino failed to install)
- 7 of 8 platform adapters missing (only WhatsApp works)
- No CI/CD pipeline
- No billing, onboarding, analytics, or real dashboard

## Key Files
- Architecture doc: `ARCHITECTURE.txt` (1647 lines, comprehensive)
- Execution plan: `masterdoc.md` (phases 1-7)
- Prisma schema: `prisma/schema.prisma`
- Backend entry: `src/index.ts`
- Frontend entry: `frontend/src/main.tsx`
- Docker Compose: `docker-compose.yml` (PostgreSQL + Redis)

## Tech Stack
- **Backend:** Node.js 20+ / TypeScript, Express.js, BullMQ, Prisma 5.x, Socket.IO
- **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS, Radix UI
- **AI:** OpenAI SDK, Google Generative AI
- **DB:** PostgreSQL 15, Redis 7
- **Platform:** WhatsApp (Evolution API), Telegram (stub)

## Codebase Map
7 documents at `.planning/codebase/`: STACK.md, ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, INTEGRATIONS.md, CONCERNS.md
