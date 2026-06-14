# STACK
**Updated:** 2026-06-15
**Project:** CrmV2 — Whatsie WhatsApp AI CRM

## Runtime
- **Node.js**: ≥18 (ES2022 target, CommonJS modules)
- **TypeScript**: `strict: true`, `skipLibCheck: true`, `esModuleInterop: true`
- **Entry point**: `src/index.ts` via `tsx` (dev) / compiled `dist/` (prod)

## Backend Framework
| Package | Version | Role |
|---------|---------|------|
| `express` | latest | HTTP server, routing |
| `socket.io` | latest | Real-time WebSocket (tenant rooms) |
| `bullmq` | latest | WhatsApp message queue (5 attempts, exponential backoff) |
| `ioredis` | latest | Redis client for BullMQ + rate limiting |
| `pino` + `pino-pretty` | latest | Structured JSON logging + dev pretty-print |
| `helmet` | latest | Security headers |
| `express-rate-limit` + `rate-limit-redis` | latest | Per-IP and per-tenant rate limiting |
| `zod` | latest | Request body validation schemas |
| `@clerk/express` | latest | JWT auth middleware + webhook processing |
| `svix` | latest | Clerk webhook signature verification |
| `@prisma/client` | latest | Postgres ORM with RLS integration |
| `@sentry/node` | latest | Error tracking |
| `prom-client` | latest | Prometheus metrics |
| `openai` | latest | OpenRouter AI completions (compatible client) |
| `axios` | latest | HTTP client for Evolution API calls |
| `bcryptjs` | latest | Password hashing (legacy) |
| `jsonwebtoken` | latest | JWT decode (Clerk verification delegation) |
| `lru-cache` | latest | In-process caching |
| `dompurify` | latest | HTML sanitization |
| `libphonenumber-js` | latest | Phone number validation/formatting |

## Frontend Framework
| Package | Role |
|---------|------|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `vite` + `@vitejs/plugin-react` | Build tool + HMR |
| `tailwindcss` + `tailwindcss-animate` | Utility CSS |
| `@radix-ui/*` (30+ packages) | Headless accessible UI primitives |
| `@clerk/clerk-react` | Auth UI + session management |
| `sonner` | Toast notifications (used for error recovery CTAs) |
| `axios` | API client with request/response interceptors |
| `socket.io-client` | WebSocket singleton (socketManager.ts) |
| `react-hook-form` + `@hookform/resolvers` | Form state + Zod validation |
| `recharts` | Analytics charts |
| `cmdk` | Command palette (model selector) |
| `motion` | Animations |
| `zod` | Schema validation (shared with backend) |
| `lucide-react` | Icon library |
| `date-fns` | Date utilities |
| `libphonenumber-js` | Phone formatting (PhoneInput component) |
| `vaul` | Drawer component |
| `input-otp` | OTP input (legacy Telegram auth) |
| `embla-carousel-react` | Carousel |

## Database
- **PostgreSQL 15** (Docker: port 7777 → 5432, named volume `postgres_data_v2`)
- **Prisma ORM**: schema at `prisma/schema.prisma`, migrations in `prisma/migrations/`
- **RLS**: `app.current_tenant_id` set per-request via `$executeRaw SELECT set_config(...)`
- **Redis 7** (Docker: port 6379, named volume `redis_data`)

## Auth
- **Primary**: Clerk JWT — `clerkMiddleware()` upstream, `getAuth(req)` in `authenticateToken`
- **Secondary**: API Key — HMAC-SHA256 + `API_KEY_PEPPER` server-side pepper, stored as hash
- **JIT sync**: User auto-created in DB on first Clerk login if webhook missed
- **Tenant context**: `AsyncLocalStorage` (tenantContext) propagated through all requests

## Build Tooling
- **Backend**: `tsc --noEmit` (typecheck), `tsx src/index.ts` (dev), `tsc` (prod build)
- **Frontend**: `vite build` (prod), `vite dev` (dev, port 5173)
- **DB**: `prisma migrate dev`, `prisma generate`

## Test Infrastructure
- **Runner**: Vitest (config inlined in package.json or vitest.config.ts)
- **Test files**: `src/__tests__/` (18 test files), service-level `.test.ts` colocated
- **Helpers**: `src/__tests__/helpers.ts`, `src/__tests__/setup.ts`
- **Coverage**: `@vitest/coverage-v8`
- **HTTP testing**: `supertest`

## Dev Tooling
- **Docker Compose**: postgres, redis, prometheus (9090), grafana (3001:3000), evolution-api (8081)
- **Debug server**: port 9222, `DEBUG_TOKEN` required, NPM-style dashboard, SSE streaming
- **Monitoring**: Prometheus + Grafana (crmv2-prometheus, crmv2-grafana containers)
