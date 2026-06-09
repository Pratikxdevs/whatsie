# Phase 2 Research: Observability & Reliability

**Date:** 2026-05-19

## Current State Analysis

### Logger (`src/config/logger.ts`)
- Simple console.log wrapper with info/error/warn levels
- No structured JSON output, no correlation IDs, no PII redaction
- `getContextLogger` adds tenantId/module prefix but still console-based
- Used in: dlq.ts, workers/index.ts, crmService.ts, gateway.ts, routes

### Health Checks (`src/index.ts:130-157`)
- `/health` — basic uptime check (ALREADY EXISTS)
- `/ready` — pings Redis + PostgreSQL (ALREADY EXISTS)
- Both return JSON, ready returns 503 on failure

### DLQ Monitor (`src/workers/dlq.ts`)
- Listens for `failed` events on whatsapp-messages queue
- Emits Socket.IO `dlq.alert` events to admin dashboard
- MISSING: No replay endpoint to retry failed jobs
- MISSING: No DLQ depth monitoring

### Rate Limiter (`src/rateLimiter/index.ts`)
- Redis-based distributed lock per platform
- WhatsApp: 1 msg/sec (1000ms delay)
- MISSING: Per-tenant quotas
- MISSING: Per-platform token buckets for other platforms
- MISSING: Plan-based limits (free/pro/enterprise)

### Docker Compose
- Only PostgreSQL + Redis
- MISSING: Prometheus, Grafana services

### CI/CD
- No `.github/workflows/` directory exists
- No CI pipeline at all

### No Prometheus metrics
- No `/metrics` endpoint
- No `prom-client` in dependencies

### No Sentry
- No `@sentry/node` in dependencies
- No error tracking

## Implementation Plan

### P01: Pino Logger (Wave 1)
- Install pino + pino-pretty
- Rewrite src/config/logger.ts with Pino
- Add requestId middleware (crypto.randomUUID)
- Add PII redaction (phone, email, API keys)
- Replace all console.log/error/warn in src/

### P02: Prometheus Metrics (Wave 1, parallel)
- Install prom-client
- Create src/metrics/index.ts with counters/histograms/gauges
- Add /metrics endpoint to index.ts
- Add middleware to track http_request_duration

### P03: Sentry Integration (Wave 2)
- Install @sentry/node
- Init Sentry in index.ts (before routes)
- Add Sentry error handler middleware (after routes)
- Capture unhandled exceptions

### P04: DLQ Replay + Quotas (Wave 2, parallel)
- Add POST /admin/dlq/replay endpoint
- Add per-tenant daily quota tracking in Redis
- Plan-based limits (free: 100/day, pro: 1000/day, enterprise: unlimited)

### P05: Docker Monitoring Stack (Wave 3)
- Add Prometheus + Grafana to docker-compose.yml
- Create prometheus.yml scrape config
- Create basic Grafana dashboard JSON

### P06: GitHub Actions CI (Wave 3, parallel)
- Create .github/workflows/ci.yml
- Steps: checkout, setup-node, install, lint, typecheck, test, build

### P07: Tests (Wave 4)
- Test logger outputs structured JSON
- Test metrics endpoint returns Prometheus format
- Test DLQ replay endpoint
- Test quota enforcement

## Dependencies
- P01 and P02 can run in parallel (Wave 1)
- P03 and P04 can run in parallel (Wave 2), depend on P01 (logger)
- P05 and P06 can run in parallel (Wave 3)
- P07 depends on all above
