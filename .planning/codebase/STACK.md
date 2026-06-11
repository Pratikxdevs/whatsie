# Technology Stack

**Analysis Date:** 2026-06-09

**Note:** This codebase was recently cleaned to WhatsApp-only. References to Telegram, Discord, Twitter/X, and other platforms in old documentation or dead code are NOT current integrations.

## Languages

**Primary:**
- TypeScript (backend) — compiled via `tsc`, targeting ES2022 with CommonJS modules (`tsconfig.json`)
- TypeScript + JSX (frontend) — ES modules (`"type": "module"`), built with Vite

**Runtime:**
- Node.js v22.22.2
- npm 10.9.7

## Backend Stack

**Framework:** Express.js v5.2.1 (`src/index.ts`)
- Express 5 (not 4) — uses `req.params` typed as `string|string[]`, requiring `as string` casts for Prisma

**Database:** PostgreSQL via Docker Compose (`docker-compose.yml` — `postgres:15-alpine`, port 7777 mapped to host 5432)
- ORM: Prisma v5.22.0 (`prisma/schema.prisma`, client in `src/db/prisma.ts`)
- Binary targets: `native`, `rhel-openssl-3.0.x`
- Multi-tenant schema: `Tenant` is root entity; `User`, `Bot`, `Lead`, `Conversation`, `Message`, `Workflow`, `ApiKey`, `Event`, `BillingUsage`, `AiLog` are tenant-scoped

**Cache / Queue:** Redis v7 (`docker-compose.yml` — `redis:7-alpine`)
- BullMQ v5.76.0 for job queueing (`whatsapp-messages` queue with exponential backoff, 5 retries)
- Redis also used for: session context windows, workflow state, rate limiting counters, webhook idempotency

**Real-time:** Socket.IO v4.8.3 (`src/index.ts`)
- WebSocket for: live log streaming, bot status changes, QR code updates, DLQ alerts

**Monitoring & Observability:**
- Prometheus vLatest + Grafana (`docker-compose.yml`)
- `prom-client` v15.1.3 for custom metrics (`messagesReceivedTotal`, `messagesSentTotal`, `errorsTotal`, `httpRequestDurationSeconds`)
- Sentry v10.53.1 optional error tracking (initialized if `SENTRY_DSN` is set — `src/index.ts`)
- Built-in debug server on port 9222 (`src/debug/server.ts`) — ring buffer (1000 logs), health checks (DB/Redis/EvoAPI), request tracing, WebSocket live streaming

**Logging:** Pino v10.3.1 (`src/config/logger.ts`)
- `pino-pretty` v13.1.3 for dev (colorized, `SYS:HH:MM:ss` timestamp)
- PII redaction: phones masked to last 4 digits, emails to first char + `***`, API keys to first 4 chars + `****`
- Dual output: console + in-memory ring buffer for debug dashboard

**Validation:** Zod v4.4.3 (`src/middleware/validate.ts`)
- v4 API differences: `enum` uses `{ message }`, `record` takes 2 args, no `errorMap`

**HTTP Proxy Layer:** (`src/middleware/httpProxy.ts`)
- All outbound axios instances wrapped with: circuit breaker (per-domain), rate limiting, GET response caching, automatic retry with exponential backoff, request/response logging
- Used by Evolution API adapter (`src/adapters/evolutionApi.ts`)

**Rate Limiting:**
- Auth endpoints: 5 req / 15 min per IP (`authRateLimiter`)
- General API: 100 req / min per IP (`apiRateLimiter`)
- Webhooks: 100 req / sec per tenant (Redis INCR/EXPIRE in `src/routes/gateway.ts`)
- Outbound WhatsApp: 1 msg/sec via BullMQ rate limiter (`src/rateLimiter.ts`, `sendWithRateLimit`)
- Implementations: express-rate-limit v7.5.0 + rate-limit-redis v4.3.1 (Redis-backed store)

**Security (Zero-Trust Enabled):**
- Strict Clerk JWT fail-closed perimeter (no `DEV_AUTH_BYPASS`).
- Global Prisma Extension enforces `tenantId` Row-Level Security (RLS) on all queries.
- AES-256-GCM encryption enforced on all API keys (32-byte key minimum).
- Helmet v8.2.0 (HTTP security headers, strict CSP without 'unsafe-inline')
- bcryptjs v3.0.3 (password hashing)
- jsonwebtoken v9.0.3 (JWT)
- DOMPurify v3.4.5 (XSS sanitization)

**Error Codes:** (`src/errors/codes.ts`)
- Structured error codes: `API_xxx`, `DB_xxx`, `AUTH_xxx`, `WA_xxx`, `Q_xxx`, `WS_xxx`, `SYS_xxx`

## Backend Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.2.1 | HTTP server |
| @prisma/client | ^5.22.0 | PostgreSQL ORM |
| @clerk/express | ^2.1.19 | Clerk auth middleware, webhook handling |
| bullmq | ^5.76.0 | Job queue (Redis-backed) |
| ioredis | ^5.10.1 | Redis client |
| socket.io | ^4.8.3 | Real-time WebSocket |
| pino | ^10.3.1 | Structured logging |
| zod | ^4.4.3 | Schema validation |
| axios | ^1.15.2 | HTTP client (Evolution API + AI providers) |
| svix | ^1.94.0 | Clerk webhook signature verification |
| @sentry/node | ^10.53.1 | Error tracking (optional) |
| prom-client | ^15.1.3 | Prometheus metrics |
| helmet | ^8.2.0 | Security headers |
| express-rate-limit | ^7.5.0 | Rate limiting |
| rate-limit-redis | ^4.3.1 | Redis-backed rate limit store |
| module-alias | ^2.3.4 | Path aliases |
| libphonenumber-js | ^1.13.3 | Phone number parsing (E.164) |

## Frontend Stack

**Framework:** React 19 with TypeScript (`frontend/package.json`)
- Vite v6 as dev server and build tool (`@vitejs/plugin-react`)
- ES modules (`"type": "module"`)
- Vite dev server: port 5173, `host: true` (for Docker/HMR compatibility)
- Vite proxy: `/api`, `/bot/connect`, `/gateway` -> `http://localhost:3000`; `/socket.io` -> `ws://localhost:3000`

**UI Library:** Radix UI (22+ headless primitive packages — accordion, dialog, dropdown, tabs, toast, tooltip, avatar, checkbox, select, switch, etc.)
- class-variance-authority v0.7.1 for component variants
- clsx v2.1.1 for conditional classes
- lucide-react / @heroicons/react for icons
- cmdk v1.1.1 for command palette

**Styling:**
- Tailwind CSS v3 (`frontend/tailwind.config.js`)
- tailwindcss-animate plugin
- Custom dark theme: black/zinc/slate color palette with CSS custom properties (`--sidebar-*` tokens)
- Custom font: Inter (`fontFamily.sans`)

**Routing:** React Router DOM v7 (`frontend/src/App.tsx`)
- Public routes: `/login`, `/register`
- Protected routes (8): `/dashboard`, `/bots`, `/leads`, `/conversations`, `/analytics`, `/billing`, `/settings`, `/team`

**Forms:** react-hook-form v5 + `@hookform/resolvers` v5 (Zod integration)

**State Management:**
- React Context only (`AuthContext` in `frontend/src/contexts/AuthContext.tsx`)
- No dedicated state library (no Zustand, Redux, MobX, etc.)

**HTTP Client:** Axios (`frontend/src/services/api.ts`)
- Base URL: `VITE_API_URL` env or `/api` (relative, proxied by Vite)
- Clerk session token attached via request interceptor
- Error interceptors log via `errorLog`

**Date Handling:** date-fns v4

**Phone Input:** `libphonenumber-js` v1.13.3 (E.164 formatting with country selector)

**Notifications:** Sonner (toast library, top-right position)

## Frontend Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19 | UI framework |
| react-router-dom | ^7 | Client-side routing |
| @clerk/clerk-react | ^5.61.6 | Clerk auth (ClerkProvider, useAuth, etc.) |
| vite | ^6 | Build tool / dev server |
| tailwindcss | ^3.4 | Utility CSS |
| react-hook-form | ^7.76 | Form state management |
| @hookform/resolvers | ^5.4 | Zod resolver for RHF |
| zod | ^4.4.3 | Schema validation |
| lucide-react | ^1.7 | Icon library |
| sonner | ^2.0 | Toast notifications |
| date-fns | ^4.3 | Date utilities |
| libphonenumber-js | ^1.13 | Phone input |
| embla-carousel-react | ^8.6 | Carousel component |
| input-otp | ^1.4 | OTP input component |
| axios | ^1.15 | HTTP client |

## Infrastructure

**Containerization:** Docker Compose v3.8 (`docker-compose.yml`)
- `postgres:15-alpine` — CRM database (port 7777:5432)
- `redis:7-alpine` — Queue + cache (port 6379)
- `prom/prometheus:latest` — Metrics collection (port 9090)
- `grafana/grafana:latest` — Dashboards (port 3001, admin/admin)
- `evoapicloud/evolution-api:latest` — WhatsApp gateway (port 8081:8080)
- Init script: `docker/init-evolution-db.sql`

**CI/CD:** GitHub Actions (`.github/workflows/ci.yml`)
- Triggers: push/PR to `main`
- Services: Postgres 15, Redis 7
- Steps: checkout -> Node 20 setup -> `npm ci` -> `prisma generate` -> `tsc --noEmit` (typecheck) -> `npm test` (vitest) -> `npm run build`

**Dev Ports:**
| Service | Port |
|---------|------|
| Backend (Express) | 3000 |
| Frontend (Vite) | 5173 |
| Evolution API | 8081 |
| PostgreSQL | 7777 |
| Redis | 6379 |
| Prometheus | 9090 |
| Grafana | 3001 |
| Debug server | 9222 |

## Tooling

**Linting:**
- ESLint (frontend only — `eslint .` script in `frontend/package.json`)
- TypeScript strict mode enforced on both root and frontend (no separate Prettier detected)

**Testing:**
- Vitest v4 (backend — `vitest run`, `vitest run --coverage`)
- @vitest/coverage-v8 for coverage
- Supertest v7.2.2 for HTTP endpoint testing
- Test files co-located: `src/**/*.test.ts` (e.g., `src/routes/gateway.test.ts`, `src/services/sessionManager.test.ts`)
- **No frontend test framework detected** — no vitest/jest config in `frontend/`

**Build:**
- Backend: `npx tsc` -> `dist/` directory (scripts: `build`, `start`, `dev`)
- Frontend: `tsc -b && vite build` (scripts: `dev`, `build`, `lint`, `preview`)
- Prisma client auto-generated via `postinstall` hook

**Scripts (backend `package.json`):**
- `npm run dev` — `prisma migrate deploy` + ts-node (transpile-only)
- `npm run build` — `tsc`
- `npm start` — `prisma migrate deploy` + `node dist/index.js`
- `npm test` — `vitest run`

**Scripts (frontend `package.json`):**
- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b` + Vite build
- `npm run lint` — ESLint
- `npm run preview` — Vite preview server

---

*Stack analysis: 2026-06-09*
