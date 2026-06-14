# Phase 2: Observability & Reliability

**Goal:** Production-grade monitoring, logging, and error recovery
**Requirements:** FR-3, FR-5, FR-8, NFR-2, NFR-3

---

## Dependency Graph

```
Wave 1 (parallel):
  [P01: Pino Logger]              [P02: Prometheus Metrics]
         |                              |
Wave 2 (parallel, after P01):          |
  [P03: Sentry Integration]    [P04: DLQ Replay + Quotas]
         |                              |
Wave 3 (parallel):                      |
  [P05: Docker Monitoring]     [P06: GitHub Actions CI]
         |                              |
Wave 4 (after all):                     |
  [P07: Tests + Verification]          |
```

---

## Plan 01: Pino Structured Logger

**Wave:** 1
**Files:** `src/config/logger.ts`, `src/index.ts`, `src/middleware/requestId.ts`

### Task 1.1: Install Pino and rewrite logger

1. Run `npm install pino pino-pretty`
2. Rewrite `src/config/logger.ts`:
   - Create Pino instance with JSON formatting
   - Add PII redaction (phone numbers, emails, API keys masked)
   - Export `logger` and `getContextLogger(tenantId, module)`
   - In non-production, pipe through pino-pretty for readability

### Task 1.2: Add requestId middleware

1. Create `src/middleware/requestId.ts`:
   - Generate `crypto.randomUUID()` as requestId
   - Set on `req.requestId` and `res.setHeader('X-Request-Id', requestId)`
   - Store in AsyncLocalStorage for downstream access
2. Wire into `src/index.ts` as first middleware

### Task 1.3: Replace console.log/error/warn throughout src/

1. Find all `console.log`, `console.error`, `console.warn` in src/ (excluding test files)
2. Replace with appropriate logger calls
3. Include requestId/tenantId context where available

**Verify:**
- `grep -rn "console\.\(log\|error\|warn\)" src/ --include="*.ts" | grep -v __tests__ | grep -v test.ts | grep -v node_modules` returns 0 matches
- Logger outputs valid JSON in production mode

---

## Plan 02: Prometheus Metrics

**Wave:** 1 (parallel with P01)
**Files:** `src/metrics/index.ts`, `src/index.ts`, `package.json`

### Task 2.1: Install prom-client and create metrics

1. Run `npm install prom-client`
2. Create `src/metrics/index.ts`:
   - Counter: `messages_received_total` (labels: platform, tenantId)
   - Counter: `messages_sent_total` (labels: platform, tenantId)
   - Counter: `errors_total` (labels: route, method, status)
   - Histogram: `http_request_duration_seconds` (labels: method, route, status)
   - Gauge: `queue_depth` (labels: queue_name)
   - Collect default metrics (process, GC, event loop)

### Task 2.2: Add /metrics endpoint and HTTP middleware

1. In `src/index.ts`, add `/metrics` endpoint returning `register.metrics()`
2. Add middleware to track request duration (start timer on req, record on res finish)
3. Increment error counter on non-2xx responses

**Verify:**
- `curl http://localhost:3000/metrics` returns Prometheus text format
- `http_request_duration_seconds` histogram exists

---

## Plan 03: Sentry Error Tracking

**Wave:** 2
**Files:** `src/index.ts`, `package.json`

### Task 3.1: Install and configure Sentry

1. Run `npm install @sentry/node`
2. In `src/index.ts`:
   - Import and init Sentry with `process.env.SENTRY_DSN`
   - Add `Sentry.setupExpressErrorHandler(app)` after all route registrations
   - Add `SENTRY_DSN` to requiredEnvs (optional — skip if not set, don't crash)

**Verify:**
- `grep -c "Sentry" src/index.ts` returns at least 2
- Server starts without SENTRY_DSN (graceful skip)

---

## Plan 04: DLQ Replay & Tenant Quotas

**Wave:** 2 (parallel with P03)
**Files:** `src/workers/dlq.ts`, `src/routes/admin.ts` (new), `src/index.ts`

### Task 4.1: Add DLQ replay endpoint

1. Create `src/routes/admin.ts`:
   - POST `/admin/dlq/replay` — accepts `{ queueName, jobId }` or `{ queueName, replayAll }`
   - Gets failed jobs from BullMQ `getFailed()` method
   - Re-adds them to the queue for retry
   - Requires admin role (check `req.user.role === 'admin'`)
2. Mount in `src/index.ts` with auth middleware

### Task 4.2: Add per-tenant daily quota

1. Create `src/middleware/quota.ts`:
   - Redis key: `quota:{tenantId}:{YYYY-MM-DD}`
   - Increment on each message processed
   - Limits: free=100, pro=1000, enterprise=999999
   - Return 429 when exceeded
2. Wire into gateway route (after auth, before message processing)

**Verify:**
- `grep -c "admin/dlq" src/index.ts` returns at least 1
- `grep -c "quota" src/middleware/quota.ts` returns at least 1

---

## Plan 05: Docker Monitoring Stack

**Wave:** 3
**Files:** `docker-compose.yml`, `monitoring/prometheus.yml`, `monitoring/grafana/`

### Task 5.1: Add Prometheus and Grafana to Docker Compose

1. Add Prometheus service to docker-compose.yml:
   - Image: `prom/prometheus:latest`
   - Port: 9090:9090
   - Volume mount: `./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml`
   - Scrape target: `host.docker.internal:3000` (the Express app)
2. Add Grafana service:
   - Image: `grafana/grafana:latest`
   - Port: 3001:3000
   - Volume: grafana_data for persistence

### Task 5.2: Create Prometheus config and Grafana dashboard

1. Create `monitoring/prometheus.yml`:
   - Scrape interval: 15s
   - Target: crmv2-api at localhost:3000/metrics
2. Create `monitoring/grafana/dashboards/crmv2.json`:
   - Message throughput panel (messages_received/sent over time)
   - Queue depth gauge
   - API latency p50/p95/p99
   - Error rate

**Verify:**
- `docker compose config` parses without error
- Prometheus config is valid YAML

---

## Plan 06: GitHub Actions CI

**Wave:** 3 (parallel with P05)
**Files:** `.github/workflows/ci.yml`

### Task 6.1: Create CI pipeline

1. Create `.github/workflows/ci.yml`:
   - Trigger: push to main, pull requests
   - Jobs: lint, typecheck, test, build
   - Steps: checkout, setup-node 20, npm ci, npm test, npm run build
   - Cache node_modules

**Verify:**
- YAML is valid
- Workflow would trigger on push/PR

---

## Plan 07: Tests & Verification

**Wave:** 4
**Files:** Test files

### Task 7.1: Write logger tests

Create `src/config/logger.test.ts`:
- Logger outputs valid JSON
- getContextLogger includes tenantId and module
- PII redaction masks phone numbers and API keys

### Task 7.2: Write metrics tests

Create `src/metrics/metrics.test.ts`:
- /metrics endpoint returns 200 with Prometheus format
- Counters increment on requests

### Task 7.3: Write DLQ replay tests

Create `src/routes/admin.test.ts`:
- Replay endpoint requires admin role
- Replay re-adds jobs to queue

### Task 7.4: Run full test suite with coverage

- Run `npx vitest run --coverage`
- Verify all tests pass
- Verify coverage >80% on new code

**Verify:**
- `npm test` passes
- Coverage report shows >80% on src/config, src/metrics, src/middleware/quota

---

## Success Criteria Verification

| Criterion | Verification |
|-----------|-------------|
| Structured JSON logs with correlation IDs | `grep -c "requestId" src/config/logger.ts` ≥ 1 |
| Prometheus scraping /metrics | `curl localhost:3000/metrics` returns metrics |
| Sentry capturing exceptions | `grep -c "Sentry" src/index.ts` ≥ 2 |
| DLQ replay working | `grep -c "replay" src/routes/admin.ts` ≥ 1 |
| CI pipeline green | `.github/workflows/ci.yml` exists |
| Grafana dashboard | `monitoring/grafana/dashboards/crmv2.json` exists |
