# Requirements

**Generated:** 2026-05-19
**Source:** masterdoc.md, ARCHITECTURE.txt, .planning/codebase/CONCERNS.md

## Functional Requirements

### FR-1: Multi-Tenant Isolation
- Every request scoped to a tenant via authenticated credentials (API key or JWT)
- All database queries filter by tenantId
- PostgreSQL RLS enforced on all tables
- Per-tenant configuration (AI model, rate limits, workflows)
- No hardcoded tenant IDs anywhere in code

### FR-2: Secure Authentication & Authorization
- JWT with 1-hour expiry + 7-day refresh tokens
- API keys: `sk_{tenant}_{random32}`, stored hashed
- RBAC: admin, agent, viewer roles
- All routes protected by auth middleware
- No hardcoded secrets in source code

### FR-3: WhatsApp Pipeline (Production-Ready)
- HMAC signature verification on all webhooks
- Idempotency layer preventing duplicate processing
- Normalized message format for inbound/outbound
- Queue-driven processing with retry and DLQ
- Rate limiting per platform and per tenant

### FR-4: Test Coverage
- Unit tests for services (intent classifier, rule engine, workflow engine, session manager)
- Integration tests for the WhatsApp pipeline end-to-end
- API endpoint tests for auth, gateway, workspace routes
- Test infrastructure (Jest or Vitest configured and running)

### FR-5: Observability
- Structured JSON logging (Pino) with log levels, correlation IDs, PII redaction
- Prometheus metrics: messages received/sent, queue depth, API latency, error rate
- Health check endpoints (/health, /ready)
- Error tracking (Sentry or equivalent)

### FR-6: Dashboard & Analytics
- Lead management UI (list, view, filter, update status)
- Conversation inbox (view message history per lead)
- Bot management (create, configure, monitor status)
- Basic analytics: message volume, conversion funnel, AI usage

### FR-7: Billing Foundation
- Track per-tenant usage (messages, AI tokens)
- Plan-based limits (free, pro, enterprise)
- Usage alerts at 80%, 90%, 100%
- Billing usage table populated from real data

### FR-8: CI/CD Pipeline
- GitHub Actions: lint, typecheck, test, build on PR
- Docker image build and push on merge to main
- Staging deployment on PR merge
- Smoke tests post-deploy

## Non-Functional Requirements

### NFR-1: Security
- No hardcoded secrets — all via environment variables
- Input validation on all endpoints
- Security headers (CSP, HSTS, X-Frame-Options)
- npm audit in CI

### NFR-2: Performance
- API latency: p95 < 200ms
- Message processing: < 5s end-to-end
- Queue depth monitoring with alerts

### NFR-3: Reliability
- Idempotent webhook processing
- Retry with exponential backoff on transient failures
- DLQ for manual replay of failed messages
- Graceful degradation when AI unavailable

### NFR-4: Maintainability
- Consistent code patterns (enforced by existing CONVENTIONS.md)
- Type safety throughout (TypeScript strict)
- Prisma migrations for all schema changes
- Structured logging for debugging
