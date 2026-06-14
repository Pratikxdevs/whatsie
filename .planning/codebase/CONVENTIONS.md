# Code Conventions

_Last updated: 2026-06-14_

## TypeScript Config

**Backend (`tsconfig.json`):**
- Target: ES2020
- Module: CommonJS (Node.js)
- Strict mode: enabled
- Path aliases: `module-alias` package for `@/` → `src/`

**Frontend (`frontend/tsconfig.json`):**
- Target: ES2020
- Module: ESNext (Vite handles bundling)
- Path alias: `@/` → `./src` (via Vite resolve config)
- JSX: react-jsx

---

## Naming Conventions

| Element          | Convention         | Example                          |
|------------------|--------------------|----------------------------------|
| Files (backend)  | camelCase          | `evolutionApi.ts`, `auth.ts`     |
| Files (frontend) | PascalCase (components) | `AddBotModal.tsx`, `BotsPage.tsx` |
| Files (frontend) | camelCase (services) | `api.ts`, `socketManager.ts`   |
| Classes          | PascalCase         | `WhatsAppAdapter`, `SessionManager` |
| Interfaces       | PascalCase         | `AuthenticatedRequest`, `AiOutput` |
| Functions        | camelCase          | `createInstance()`, `generateAiResponse()` |
| Constants        | SCREAMING_SNAKE_CASE | `TENANT_MODELS`, `ERROR_DESCRIPTIONS` |
| Env vars         | SCREAMING_SNAKE_CASE | `CLERK_SECRET_KEY`, `EVOLUTION_API_URL` |
| DB model names   | PascalCase (Prisma) | `BillingUsage`, `WorkflowExecution` |
| React components | PascalCase (named export) | `export function AddBotModal()` |
| Hooks            | `use` prefix       | `useAiKeyStatus`, `useKeyVault` |

---

## Error Handling Pattern

**Backend structured errors (src/errors/codes.ts):**
```ts
// Error codes registered as constants: API_001, DB_003, WA_004 etc.
createAppError(ErrorCode.API_004, 'base64 is required')
// Returns: { code, message, detail, meta, timestamp }
```

**Route handler pattern:**
```ts
router.get('/', async (req, res) => {
  try {
    // ... logic
    return res.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'Context message');
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});
```

**Worker error handling:**
```ts
try {
  // ... processing
} catch (error) {
  log.error({ err: error, jobId: job.id }, 'Fatal error');
  throw error; // BullMQ retries (up to 5 attempts with exponential backoff)
}
```

**Frontend error interceptor (api.ts):**
```ts
// 401/403 → logout + redirect to /login
// 5xx → toast error
// Network error → toast "Cannot reach server"
// All errors logged via errorLog.logApiError()
```

---

## API Response Format

**Success (list):**
```json
{ "conversations": [...], "total": 42, "page": 1, "limit": 20 }
```

**Success (single):**
```json
{ "message": { "id": "...", "content": "..." } }
```

**Error:**
```json
{ "error": "Human-readable message", "details": "Technical detail" }
```
Or structured:
```json
{ "code": "API_004", "message": "...", "detail": "...", "meta": null, "timestamp": "..." }
```

---

## Middleware Pattern

Route-level middleware applied via `router.use()`:
```ts
const router = Router();
router.use(authenticateToken);    // auth first
router.use(validateBody(schema)); // then validation
router.get('/', handler);
```

Middleware factory pattern (for validation):
```ts
export const validateBody = (schema: ZodSchema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error });
  req.body = result.data;
  next();
};
```

---

## Service Layer Pattern

Services are class-based with static methods:
```ts
export class SessionManager {
  static async getWorkflowState(tenantId, userId): Promise<WorkflowState> {}
  static async pushMessage(tenantId, userId, message): Promise<void> {}
}
```

Adapter functions are plain async functions:
```ts
export async function createInstance(opts: CreateInstanceOptions) { ... }
export async function sendText(instanceName: string, opts: SendTextOptions) { ... }
```

---

## Frontend Conventions

**Component structure:**
```tsx
// Named export (not default)
export function AddBotModal({ isOpen, onClose }: Props) {
  // hooks at top
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // event handlers
  const handleSubmit = async () => {};
  
  // JSX return
  return <Dialog open={isOpen}>...</Dialog>;
}
```

**API calls in pages:**
```tsx
// useEffect + useState pattern (no React Query/SWR)
useEffect(() => {
  const fetch = async () => {
    try {
      setLoading(true);
      const data = await leadApi.getLeads();
      setLeads(data);
    } catch { /* toast shown by interceptor */ } 
    finally { setLoading(false); }
  };
  fetch();
}, []);
```

**Styling:** Tailwind CSS utility classes via `cn()` helper:
```tsx
import { cn } from '@/lib/utils';
<div className={cn('base-class', condition && 'conditional-class')} />
```

---

## Import Style

**Backend:** Relative imports only (no barrel index.ts for most modules):
```ts
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
```

**Frontend:** Both relative and `@/` alias:
```ts
import { useAuth } from '@/contexts/AuthContext';
import { botApi } from './api';
```

---

## Logging

**Backend (Pino):**
```ts
// Structured context logging — always pass object first, then message
logger.info({ tenantId, botId }, 'Bot status synced');
logger.error({ err, jobId }, 'Fatal error processing job');

// Context logger with module binding
const log = getContextLogger(tenantId, 'Worker.AI');
log.info({ intent }, 'AI response generated');
```

**PII Redaction (auto-applied):**
- Phone numbers: last 4 digits masked `5511999****`
- Emails: local part after first char masked `j***@example.com`
- API keys: after first 4 chars masked `sk_l****`
- Fields with 'key'/'secret'/'token' in name: auto-masked in log objects

**Debug server:** All logs also stream to ring-buffer at port 9222 via `addLog()`.

---

## Environment Config

Validated at startup with fail-fast (process.exit(1) if missing):
```ts
const requiredEnvs = [
  'DATABASE_URL', 'REDIS_URL', 'GATEWAY_SECURITY_TOKEN', 'JWT_SECRET',
  'EVOLUTION_API_SECRET', 'EVOLUTION_API_KEY', 'EVOLUTION_API_URL',
  'CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY', 'OPENROUTER_API_KEY',
];
```

Additional required: `FRONTEND_URL` (CORS), `API_KEY_PEPPER` (required in production).

Frontend env: `VITE_CLERK_PUBLISHABLE_KEY` (required), `VITE_API_URL` (optional), `VITE_USE_MOCK` (optional).

---

## Test Conventions

- **Framework:** Vitest (backend) — `describe/it/expect` globals
- **File naming:** `*.test.ts` co-located or in `__tests__/` subdirectory
- **Mock pattern:** `vi.mock('../path')` with manual mocks
- **Setup file:** `src/__tests__/setup.ts` — global test setup
- **Helpers:** `src/__tests__/helpers.ts` — shared test utilities
