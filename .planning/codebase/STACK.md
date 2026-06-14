# STACK.md — Technology Stack
**Last mapped:** 2026-06-14
**Project:** Whatsie (CrmV2)

---

## Runtime

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | ^6.0.3 |
| Runtime | Node.js | ≥18 (ts-node / tsx) |
| Frontend | React | ^19.2.4 |
| Build tool | Vite | (via frontend/package.json) |
| Package manager | npm | (package-lock.json) |

---

## Backend Framework

- **Express** `^5.2.1` — HTTP server
- **Socket.IO** `^4.8.1` — Real-time bidirectional events
- **BullMQ** `^5.76.0` — Redis-backed job queue for message processing
- **Prisma** `^6.19.3` — ORM, PostgreSQL adapter

---

## Frontend Stack

- **React Router** `^7.14.0`
- **Clerk React** `^5.61.6` — Auth UI
- **Radix UI** (full suite ~22 packages) — Headless components
- **Tailwind CSS** + `tailwind-merge`, `tailwindcss-animate`
- **Recharts** `^2.15.4` — Charts
- **Lucide React** `^1.7.0` — Icons
- **Sonner** `^2.0.7` — Toast notifications
- **React Hook Form** + Zod — Form validation
- **Socket.IO client** `^4.8.3`
- **Motion** `^12.38.0` — Animations

---

## Security Libraries

- **Helmet** `^8.2.0` — HTTP security headers (backend + frontend)
- **express-rate-limit** `^7.5.0` — Rate limiting (backend)
- **rate-limit-redis** `^4.3.1` — Distributed rate limit storage
- **DOMPurify** `^3.4.5` — XSS sanitization (both layers)
- **bcryptjs** `^3.0.3` — Password hashing
- **jsonwebtoken** `^9.0.3` — JWT signing (legacy; Clerk JWT used for production)
- **svix** `^1.94.0` — Clerk webhook verification
- **Zod** `^4.4.3` — Schema validation

---

## Observability

- **Pino** `^10.3.1` + `pino-pretty` — Structured logging
- **prom-client** `^15.1.3` — Prometheus metrics (gated behind `METRICS_TOKEN`)
- **@sentry/node** `^10.53.1` — Error tracking (optional, env-gated)
- Custom debug server on port 9222 (gated behind `DEBUG_TOKEN`)

---

## Databases

| Database | Purpose | Port |
|----------|---------|------|
| PostgreSQL 15 | Primary data (Docker) | 7777→5432 |
| Redis 7 | BullMQ queues, rate limiting | 6379 |

---

## AI / LLM

- **openai** `^6.42.0` SDK — used for OpenAI and OpenRouter calls
- **AiInteg/** directory — custom bridge/config/endpoints for multi-provider AI
- `src/ai/orchestrator.ts` — Central AI dispatcher
- Providers: OpenRouter, Groq, OpenAI (env-configurable per bot)

---

## Testing

- **Vitest** `^4.1.6` + `@vitest/coverage-v8`
- **supertest** `^7.2.2` — HTTP integration tests
- `src/__tests__/` — test directory with setup mocks

---

## ⚠️ Frontend Bloat — Unused Packages

The frontend `package.json` includes several packages that don't belong in a Vite/React SPA:

| Package | Issue |
|---------|-------|
| `express-rate-limit ^8.5.2` | **Server-side only** — should not be in frontend deps |
| `helmet ^8.2.0` | **Server-side only** — no-op in browser |
| `pino ^10.3.1` / `pino-pretty` | Node-native logger — wrong for browser |
| `rate-limit-redis ^5.0.0` | Requires Redis — meaningless in browser |
| `next-themes ^0.4.6` | Next.js specific — project uses Vite, not Next |
| `isomorphic-dompurify ^3.14.0` | Redundant with `dompurify` already installed |

**Risk:** These increase bundle size and may cause build warnings/errors. The `rate-limit-redis` package in particular requires native Redis bindings that Vite will fail to bundle.
