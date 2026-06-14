# CONVENTIONS.md — Code Style & Patterns
**Last mapped:** 2026-06-14

---

## Language

- TypeScript strict mode — `tsconfig.json`
- `as any` used **44 times** in `src/` (non-test) — type safety debt
- Error types: `catch (err: any)` pattern throughout — not using typed error classes
- Named exports preferred over default exports in routes

---

## Error Handling Pattern

```typescript
// Standard pattern across all routes:
try {
  // ...
} catch (err: any) {
  logger.error({ err }, 'context message');
  return res.status(500).json({ error: 'Internal Server Error', details: err.message });
}

// Upstream 4xx pass-through (whatsapp-chat.ts):
const upstreamStatus = error?.response?.status;
if (upstreamStatus >= 400 && upstreamStatus < 500) {
  return res.status(upstreamStatus).json({ error: '...', details: errorDetails });
}
```

---

## Route Pattern

```typescript
// All routes:
router.use(authenticateToken);               // middleware applied to router
const tenantId = (req as AuthenticatedRequest).user!.tenantId;  // typed extraction
const entity = await prisma.entity.findFirst({ where: { id, tenantId } }); // always tenant-scoped
if (!entity) return res.status(404).json({ error: 'Not found' });
```

---

## Logging

- **Library:** Pino (structured JSON)
- **Levels used:** `logger.info`, `logger.warn`, `logger.error`, `logger.fatal`
- **Pattern:** `logger.error({ err }, 'human message')`
- **No `console.log` in production routes** (4 console.error calls in debug/server.ts only)
- Logger exposed via `src/config/logger.ts` singleton

---

## Frontend Conventions

- Functional components with hooks
- `useState` + `useEffect` for data fetching (no React Query)
- API calls in component `useEffect` with cancelled flag pattern:
  ```typescript
  let cancelled = false;
  fetchData().then(data => { if (!cancelled) setState(data); });
  return () => { cancelled = true; };
  ```
- Tailwind utility classes — no CSS modules
- `sonner` toast for user feedback

---

## Validation

- **Zod** schemas in `src/schemas/` for route body validation
- `validateBody(schema)` middleware applied to POST routes
- Frontend: `react-hook-form` + `@hookform/resolvers/zod`

---

## Socket.IO Events

| Event (server→client) | Payload |
|-----------------------|---------|
| `new_message` | `{ conversationId, message }` |
| `bot_status_change` | `{ botId, status, platform }` |
| `conversation_update` | `{ conversationId, ... }` |
| `lead_update` | `{ leadId, ... }` |

---

## ⚠️ Code Quality Issues

1. **44 `as any` casts** in non-test src — each is a potential runtime type error
2. **`src/normalizer/whatsapp.test.ts`** lives in production code dir — violates separation
3. **Dead `src/api/auth.ts`** register/login endpoints — reachable in production (`POST /api/auth/register`, `POST /api/auth/login`) but authenticate with legacy JWT, not Clerk
4. **`src/middleware/tenant.ts`** — imported nowhere, provides zero protection
5. **`src/rateLimiter/index.ts`** — possible duplicate of `src/middleware/rateLimit.ts`
6. **Debug server innerHTML** — `src/debug/server.ts:404,428,431,441` use raw `innerHTML` with server-sourced data. Risk if input validation in the log filter is bypassed
