# CONVENTIONS
**Updated:** 2026-06-15
**Project:** CrmV2 — Whatsie WhatsApp AI CRM

## TypeScript Configuration
- **strict**: `true` — full strict mode
- **target**: `ES2022`, **module**: `CommonJS`
- **skipLibCheck**: `true` — skip third-party type errors
- **Known pre-existing errors**: 11 errors in 8 files (all `TS7006: implicit any` on callback params)
  - `src/ai/structuralizer.ts:42` — `.map(m =>` 
  - `src/jobs/stalledConversations.ts:21` — `.map(c =>`
  - `src/middleware/auth.ts:70` — `$transaction(async (tx) =>`
  - `src/routes/analytics.ts:81` — `.map(g =>`
  - `src/routes/billing.ts:36,68` — `.map(u =>`
  - `src/routes/credentials.ts:28` — `.map((cred) =>`
  - `src/routes/whatsapp-chat.ts:36,82` — `.map(async (bot) =>`
  - `src/routes/workspaces.ts:49,52` — `.filter(b =>`, `.map(async (bot) =>`
- **`as any`**: ~40 usages in src, mostly in Prisma extension, queue config, and adapter responses
- **Frontend**: clean pass (0 TypeScript errors as of Phase 28)

## Error Handling Pattern

### Backend: Enriched Error Responses
All API error handlers must use `enrichError()`:
```typescript
import { enrichError } from '../errors/recovery';

// ✓ CORRECT — typed code + recovery action
return res.status(502).json(enrichError('WA_003', err.message));

// ✗ WRONG — generic, no recovery, not parseable by frontend
return res.status(500).json({ error: 'Internal Server Error' });
```

The response shape is:
```typescript
interface EnrichedError {
  code: string;          // e.g. 'WA_003'
  message: string;       // user-facing hint from recovery map
  detail: string | null; // original error detail
  meta: Record<string, unknown> | null;
  timestamp: string;
  recovery: RecoveryAction | null;
}
```

**Remaining routes not yet converted** (see CONCERNS): `analytics.ts`, `billing.ts`, `conversations.ts` — still return `{ error: 'Internal Server Error' }`.

### Frontend: Recovery Handler
```typescript
import { errorRecovery } from './errorRecovery';

// API interceptor reads recovery and dispatches automatically
// Manual use in components:
errorRecovery.handle('WA_002', recovery, { botId });  // opens QR modal
errorRecovery.handle('AUTH_005', recovery);            // routes to settings
```

## Logging Conventions

### Backend Category Tags
Every `addLog()` call must include the correct `[SOURCE]` prefix in the message:
```typescript
addLog('info', '[BACKEND] → POST /api/workspaces', undefined, { source: 'backend', category: 'backend' });
addLog('error', '[AI] Response generation FAILED', 'SYS_005', { source: 'ai', category: 'ai' });
addLog('info', '[DATABASE] Bot.create — 45ms', undefined, { source: 'database', category: 'db' });
addLog('warn', '[API] OpenRouter key FAILED', 'AUTH_005', { source: 'api', category: 'api' });
addLog('info', '[DOCKER] crmv2-redis: Ready to accept connections', undefined, { source: 'docker', category: 'docker' });
```

Category is auto-derived from message prefix if `meta.category` not set. Categories: `frontend | backend | db | docker | api | ai | system`.

### Frontend Activity Logging
```typescript
import { errorLog } from './errorLog';

// Non-error events
errorLog.activityLog('→ POST /api/workspaces', { method: 'POST', url: '/api/workspaces', category: 'frontend' });

// Error logging with auto-classification
errorLog.logApiError(axiosError, '/api/workspaces/start');
```

## Database Conventions

### Prisma Client Usage
```typescript
import { prisma, prismaUnfiltered } from '../db/prisma';

// ALWAYS use filtered client for tenant data
const bots = await prisma.bot.findMany({});  // tenantId auto-injected

// ONLY use unfiltered for system/auth operations
const user = await prismaUnfiltered.user.findUnique({ where: { clerkId } });
```

### Query Patterns
- Always use `findMany` with explicit `where` for lists (even with tenant injection)
- Avoid `findUnique` on models that could belong to another tenant
- Use `$transaction` for multi-step operations that must be atomic

## Auth Patterns
```typescript
// Route protection — always authenticateToken first
router.get('/my-route', authenticateToken, async (req, res) => {
  const tenantId = (req as AuthenticatedRequest).user!.tenantId;
  // tenantContext is set by auth middleware
});

// Auth failures — always use enrichError
return res.status(401).json(enrichError('AUTH_001', 'detail'));
```

## API Design Conventions
- **Method semantics**: GET (read), POST (create), PUT (full update), PATCH (partial), DELETE
- **Error shape**: always `EnrichedError` for errors (code + recovery)
- **Success shape**: resource-specific (e.g. `{ workspace: Bot }`, `{ workspaces: Bot[] }`)
- **Status codes**: 200 (ok), 201 (created), 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error), 502 (upstream service error)

## Naming Conventions
- **Files**: `kebab-case.ts` (e.g. `whatsapp-chat.ts`, `request-logger.ts`)
- **Types/Interfaces**: `PascalCase` (e.g. `NormalizedMessage`, `EnrichedError`)
- **Functions**: `camelCase` (e.g. `enrichError`, `addLog`, `authenticateToken`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g. `ERROR_RECOVERY`, `MAX_LOGS`)
- **Env vars**: `SCREAMING_SNAKE_CASE` (e.g. `EVOLUTION_API_URL`, `DEBUG_TOKEN`)

## Frontend Conventions
- **Components**: PascalCase files (e.g. `BotCard.tsx`, `RecoveryToast.tsx`)
- **Services**: camelCase files (e.g. `api.ts`, `errorLog.ts`, `socketManager.ts`)
- **Toast notifications**: always `sonner` toast (`toast.error()`, `toast.warning()`, `toast.info()`)
- **Auth**: `useAuth()` from `@clerk/clerk-react`; non-React contexts use `clerkBridge.ts`
- **Forms**: `react-hook-form` + `@hookform/resolvers/zod`
