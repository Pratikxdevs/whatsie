# Phase 1 Validation Map

**Phase:** Foundation Hardening
**Generated:** 2026-05-19

## Requirement → Test File Mapping

| Requirement | Test File | Test Command | Status |
|-------------|-----------|--------------|--------|
| FR-1 (tenant isolation) | `src/__tests__/services/tenant-isolation.test.ts` | `npx vitest run src/__tests__/services/tenant-isolation.test.ts` | NOT CREATED |
| FR-2 (JWT auth) | `src/__tests__/middleware/auth.test.ts` | `npx vitest run src/__tests__/middleware/auth.test.ts` | NOT CREATED |
| FR-2 (JWT refresh) | `src/__tests__/api/auth-refresh.test.ts` | `npx vitest run src/__tests__/api/auth-refresh.test.ts` | NOT CREATED |
| FR-4 (test infra) | `vitest.config.ts` | `npx vitest run` | NOT CREATED |
| NFR-1 (no secrets) | `grep -r "fallback\|super_secure\|429683C4" src/ --include="*.ts"` | Should return 0 matches | NOT VERIFIED |

## Success Criteria Verification Commands

| Criterion | Verification Command | Expected Result |
|-----------|---------------------|-----------------|
| Zero hardcoded secrets | `grep -rn "fallback-secret\|super_secure\|429683C4\|87a8873c" src/ --include="*.ts" \| grep -v test \| grep -v __tests__` | 0 matches |
| Unauthenticated returns 401 | `npx vitest run src/__tests__/middleware/auth.test.ts` | All pass |
| RLS policies active | `npx prisma db execute --stdin < <(echo "SELECT polname FROM pg_policy WHERE polrelid::regclass::text LIKE '%';")` | Policies listed |
| JWT refresh tokens | `npx vitest run src/__tests__/api/auth-refresh.test.ts` | All pass |
| >80% coverage | `npx vitest run --coverage` | Lines >= 80% |
| WhatsApp pipeline test | `npx vitest run src/__tests__/integration/whatsapp-pipeline.test.ts` | All pass |
