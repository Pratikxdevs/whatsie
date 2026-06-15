# STACK.md — Technology Stack

**Project:** CrmV2 — Multi-Platform AI CRM Bot SaaS  
**Date:** 2026-06-15  
**Root:** `/home/clutch/Desktop/Whatsie`

---

## Language & Runtime

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Language | TypeScript | 6.0.3 | Strict mode enabled |
| Runtime | Node.js | 20+ (implied) | ES2022 target, CommonJS modules |
| Package Manager | npm | 10+ | `package-lock.json` present |

---

## Core Framework

| Component | Library | Version | Purpose |
|-----------|---------|---------|---------|
| Web Server | Express | 5.2.1 | Main HTTP server, API routes |
| ORM | Prisma Client | 6.19.3 | Database access, type-safe queries |
| Queue | BullMQ | 5.76.0 | Background job processing (Redis-backed) |
| WebSocket | Socket.IO | 4.8.3 | Real-time updates to frontend |
| Socket.IO Adapter | @socket.io/redis-adapter | 8.3.0 | Multi-instance WebSocket scaling |

---

## Authentication & Authorization

| Component | Library | Version | Purpose |
|-----------|---------|---------|---------|
| Auth Provider | Clerk | @clerk/express 2.1.19 | JWT-based auth, user management |
| API Keys | Custom (crypto, HMAC-SHA256) | — | Peppered key hashing (`API_KEY_PEPPER`) |
| JWT | jsonwebtoken | 9.0.3 | Socket.IO token verification |
| Webhook Verification | Svix | 1.94.0 | Clerk webhook signature validation |

---

## AI & LLM Integration

| Component | Library | Version | Purpose |
|-----------|---------|---------|---------|
| AI Gateway | OpenRouter (OpenAI SDK) | 6.42.0 | Unified LLM access via OpenRouter |
| AI Models | Various via OpenRouter | — | GPT-4, Claude, etc. |

---

## Database & Storage

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Primary DB | PostgreSQL | 15 (Docker) | Prisma datasource |
| Cache/Queue | Redis | 7 (Docker) | BullMQ, Socket.IO adapter, rate limiting |
| Migrations | Prisma Migrate | 6.19.3 | Auto-deploy on startup |

---

## Observability & Monitoring

| Component | Library | Version | Purpose |
|-----------|---------|---------|---------|
| Logging | Pino | 10.3.1 | Structured JSON logs, PII redaction |
| Pretty Logs | pino-pretty | 13.1.3 | Dev-friendly console output |
| Error Tracking | Sentry | 10.53.1 | Error capture, tracing (10% sample) |
| Metrics | prom-client | 15.1.3 | Prometheus exposition (`/metrics`) |
| Health Checks | Custom | — | `/health`, `/ready` endpoints |
| Debug Server | Custom | — | Ring buffer, Docker log streaming (port 9222) |

---

## Security & Hardening

| Component | Library | Version | Purpose |
|-----------|---------|---------|---------|
| Helmet | helmet | 8.2.0 | CSP, HSTS, X-Frame, etc. |
| Rate Limiting | express-rate-limit | 7.5.0 | API + auth rate limiters |
| Redis Rate Limit | rate-limit-redis | 4.3.1 | Distributed rate limiting |
| Input Sanitization | DOMPurify | 3.4.5 | HTML sanitization |
| CORS | Custom | — | Strict `FRONTEND_URL` only |
| Validation | Zod | 4.4.3 | Schema validation |

---

## Utilities & DX

| Component | Library | Version | Purpose |
|-----------|---------|---------|---------|
| Env Config | dotenv | 17.4.2 | `.env` loading |
| Phone Parsing | libphonenumber-js | 1.13.3 | Phone number normalization |
| Module Aliases | module-alias | 2.3.4 | `@/` path aliases |
| LRU Cache | lru-cache | 11.5.1 | In-memory caching |
| HTTP Client | axios | 1.15.2 | Evolution API calls (with proxy wrapper) |

---

## Development & Testing

| Component | Library | Version | Purpose |
|-----------|---------|---------|---------|
| Test Runner | Vitest | 4.1.6 | Unit/integration tests |
| Coverage | @vitest/coverage-v8 | 4.1.6 | V8 native coverage |
| Test Helpers | supertest | 7.2.2 | HTTP endpoint testing |
| Type Checking | TypeScript | 6.0.3 | `tsc` build |
| TS Execution | ts-node | 10.9.2 | Dev server (`ts-node --watch`) |
| Prisma CLI | prisma | 6.19.3 | Generate, migrate, seed |

---

## Infrastructure (Docker Compose)

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| PostgreSQL | postgres:15-alpine | 7777 | Primary database |
| Redis | redis:7-alpine | 6379 | Queue, cache, pub/sub |
| Prometheus | prom/prometheus | 9090 | Metrics collection |
| Grafana | grafana/grafana | 3001 | Dashboards |
| Evolution API | evoapicloud/evolution-api | 8081 | WhatsApp gateway |

---

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | TypeScript config (strict, CommonJS, ES2022) |
| `vitest.config.ts` | Test config (globals, node env, coverage) |
| `.env` / `.env.example` | Environment variables |
| `docker-compose.yml` | Local infra stack |
| `prisma/schema.prisma` | Database schema |
| `monitoring/prometheus.yml` | Prometheus scrape config |

---

## Key Environment Variables (Required at Startup)

```bash
DATABASE_URL              # PostgreSQL connection string
REDIS_URL                 # Redis connection string
GATEWAY_SECURITY_TOKEN    # Internal gateway auth
JWT_SECRET                # Socket.IO JWT signing
EVOLUTION_API_SECRET      # Evolution API webhook secret
EVOLUTION_API_KEY         # Evolution API auth key
EVOLUTION_API_URL         # Evolution API base URL
CLERK_SECRET_KEY          # Clerk backend API key
CLERK_PUBLISHABLE_KEY     # Clerk frontend key
OPENROUTER_API_KEY        # OpenRouter LLM access
API_KEY_PEPPER            # HMAC pepper for API key hashing (C-001)
DEBUG_TOKEN               # Debug server auth
METRICS_TOKEN             # /metrics endpoint bearer token (C-002)
FRONTEND_URL              # Strict CORS origin
SENTRY_DSN                # Optional: Sentry error tracking
PORT                      # Default 3000
NODE_ENV                  # production|test|development
LOG_LEVEL                 # Pino log level
```

---

## Module Aliases (via `module-alias`)

```typescript
// Registered in src/index.ts before other imports
require('module-alias').addAlias('@', __dirname);
// Usage: import { logger } from '@/config/logger'
```

---

## Notable Version Constraints

- **Express 5.x** — Uses new router matching, `req.route` available
- **TypeScript 6.x** — Strict mode, `skipLibCheck`, `resolveJsonModule`
- **Prisma 6.x** — `prisma migrate deploy` auto-runs on startup (non-test)
- **BullMQ 5.x** — Requires `maxRetriesPerRequest: null` on Redis connection