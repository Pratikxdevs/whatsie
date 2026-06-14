# INTEGRATIONS.md — External Services & APIs
**Last mapped:** 2026-06-14

---

## Evolution API (WhatsApp Gateway)

- **URL:** `EVOLUTION_API_URL` (default `http://localhost:8081`)
- **Auth:** `EVOLUTION_API_KEY` (apikey header) + `EVOLUTION_API_SECRET` (bearer for webhook validation)
- **Adapter:** `src/adapters/evolutionApi.ts` — typed full adapter (628 lines)
- **Webhook inbound:** `POST /gateway/whatsapp/:tenantId` → `src/routes/gateway.ts`
- **Docker service:** `evoapicloud/evolution-api:latest` on port 8081→8080

### ⚠️ SECURITY: Hardcoded credentials in docker-compose.yml
```yaml
AUTHENTICATION_API_KEY=429683C4C977415CAAFCCE10F7D57E11  # EXPOSED IN REPO
POSTGRES_PASSWORD=CrmV2@2026                              # EXPOSED IN REPO
```
These must be moved to environment variables or Docker secrets.

---

## Clerk (Authentication)

- **Backend:** `@clerk/express ^2.1.19` — `clerkMiddleware()` + `getAuth()`
- **Frontend:** `@clerk/clerk-react ^5.61.6`
- **Webhook:** `POST /webhooks/clerk` via `svix` signature verification
- **Env vars:** `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`, `VITE_CLERK_PUBLISHABLE_KEY`
- **JIT user sync:** On every authenticated request, user is synced to DB if not present

---

## OpenRouter / AI Providers

- **Primary provider:** OpenRouter (`sk-or-*` keys)
- **Other providers:** Groq (`gsk_*`), OpenAI (`sk-*`)
- **Config:** `src/AiInteg/config.ts`, `src/ai/orchestrator.ts`
- **Key source priority:** Bot `config.api_key` → user key → `OPENROUTER_API_KEY` env
- **⚠️ Risk:** `|| ''` fallback on API key means silent empty-key calls if env not set

---

## Sentry (Error Tracking)

- **SDK:** `@sentry/node ^10.53.1`
- **Init:** Conditional — only if `SENTRY_DSN` env is set
- **Sample rate:** `tracesSampleRate: 0.1`
- **File:** `src/index.ts` lines 41-43

---

## Prometheus + Grafana (Observability)

- **Metrics endpoint:** `GET /metrics` — bearer-token gated (`METRICS_TOKEN`)
- **Collector:** prom-client, custom `httpRequestDurationSeconds` histogram
- **Docker:** prom/prometheus on 9090, grafana/grafana on 3001
- **⚠️ Grafana default password:** `GF_SECURITY_ADMIN_PASSWORD=admin` hardcoded in docker-compose

---

## Redis

- **Client:** `ioredis ^5.10.1`
- **URL:** `REDIS_URL` env
- **Uses:** BullMQ job queue, rate limiting (rate-limit-redis)
- **Connection:** `src/queue/setup.ts`

---

## PostgreSQL

- **ORM:** Prisma `^6.19.3`
- **URL:** `DATABASE_URL` env
- **Migrations:** Auto-applied on startup via `npx prisma migrate deploy`
- **Schema:** `prisma/schema.prisma`

---

## Docker Compose Services

| Service | Image | Port | Credentials |
|---------|-------|------|-------------|
| postgres | postgres:15-alpine | 7777 | `CrmV2@2026` ⚠️ hardcoded |
| redis | redis:7-alpine | 6379 | none |
| prometheus | prom/prometheus | 9090 | none |
| grafana | grafana/grafana | 3001 | `admin` ⚠️ hardcoded |
| evolution-api | evoapicloud/evolution-api | 8081 | `429683C4C977415CAAFCCE10F7D57E11` ⚠️ hardcoded |

---

## Debug Server

- **Port:** `DEBUG_PORT` env (default 9222)
- **Auth:** Optional — `DEBUG_TOKEN` env bearer
- **⚠️ Risk:** If `DEBUG_TOKEN` not set, debug server is completely open
- **File:** `src/debug/server.ts`
