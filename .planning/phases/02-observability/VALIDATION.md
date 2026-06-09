# Phase 2 Validation Map

**Phase:** Observability & Reliability
**Generated:** 2026-05-19

## Requirement → Test File Mapping

| Requirement | Test File | Test Command |
|-------------|-----------|--------------|
| FR-5 (structured logging) | `src/config/logger.test.ts` | `npx vitest run src/config/logger.test.ts` |
| FR-5 (Prometheus metrics) | `src/metrics/metrics.test.ts` | `npx vitest run src/metrics/metrics.test.ts` |
| FR-5 (health checks) | Already in index.ts | `curl localhost:3000/health` |
| FR-8 (CI pipeline) | `.github/workflows/ci.yml` | YAML validation |
| NFR-2 (performance metrics) | Prometheus histograms | `curl localhost:3000/metrics | grep http_request_duration` |
| NFR-3 (DLQ replay) | `src/routes/admin.test.ts` | `npx vitest run src/routes/admin.test.ts` |

## Success Criteria Verification Commands

| Criterion | Command | Expected |
|-----------|---------|----------|
| Structured JSON logs | `grep -rn "console\.\(log\|error\|warn\)" src/ --include="*.ts" \| grep -v __tests__ \| grep -v test.ts` | 0 matches |
| Prometheus /metrics | `curl -s localhost:3000/metrics \| grep http_request_duration` | Metrics output |
| Sentry integration | `grep -c "@sentry/node" package.json` | 1 |
| DLQ replay | `grep -c "replay" src/routes/admin.ts` | ≥ 1 |
| CI pipeline | `ls .github/workflows/ci.yml` | File exists |
| Grafana dashboard | `ls monitoring/grafana/dashboards/crmv2.json` | File exists |
