# Phase 27: Zero-Trust Production Architecture Mega-Refactor - Research

**Researched:** 2026-06-14
**Domain:** Architecture, Security, Frontend UI Refactor
**Confidence:** HIGH

## User Constraints

**Decisions:**
- API Key Encryption Strategy (AES-256-GCM): Use a single global `ENCRYPTION_MASTER_KEY` passed via environment variables.
- Tenant Middleware Enforcement: Apply `src/middleware/tenant.ts` globally to all protected API routes, with explicit exceptions for public endpoints and webhooks.
- Dead Platform Code Deletion: Ruthlessly delete Telegram, Slack, and Discord application logic, but leave the Prisma schema intact (defer DB migrations to avoid breaking existing data).
- OpenRouter Factory / UI State: Proxy OpenRouter model fetching through the backend to centralize logic and hide keys from the frontend payload.

**the agent's Discretion:**
- The implementation of the Bento Grid scaling and the specific placement of settings components in slide-overs is left to the executor, provided it adheres to `27-UI-SPEC.md`.

**Deferred Ideas:**
- Dropping dead columns/tables from the PostgreSQL database (to be handled in a dedicated migration phase).

## Summary

This phase hardens the CrmV2 architecture by establishing strict zero-trust boundaries, encrypting external keys, and overhauling the frontend UI to match a high-density Bento grid design. 

**Primary recommendation:** Apply security constraints (tenant middleware, key checks) at the top-level routing layer in `src/index.ts`, implement AES-256-GCM using standard Node.js `crypto` module, and utilize Shadcn components (sheet, resizable, scroll-area) for the UI refactor as defined in `27-UI-SPEC.md`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Global Tenant Enforcement | API / Backend | — | Must be enforced at the gateway/middleware level. |
| API Key Encryption | API / Backend | Database | Encryption handled in memory before saving to DB. |
| Dead Code Removal | API / Backend | — | Removing Telegram/Slack/Discord adapters. |
| UI Bento Grid | Browser / Client | — | Layout scaling and density are purely frontend concerns. |
| OpenRouter Proxy | API / Backend | Browser / Client | Hide API keys from the frontend client. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node `crypto` | built-in | AES-256-GCM Encryption | Standard, secure library for Node.js. |
| `lucide-react` | current | UI Icons | Designated in 27-UI-SPEC.md |
| `tailwind-merge` | current | Styling utilities | Standard for Shadcn UI |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `clsx` | current | Styling utilities | Standard for Shadcn UI |

## Architecture Patterns

### Recommended Project Structure (Frontend UI)
```
frontend/src/
├── components/
│   ├── ui/          # Shadcn primitives (sheet, resizable, scroll-area)
│   ├── settings/    # Slide-over settings components
│   └── chat/        # High-density Bento grid chat components
```

### Pattern 1: Node.js AES-256-GCM Encryption
**What:** Encrypt API keys before storing them.
**When to use:** When saving user-provided OpenRouter/Evolution API keys.
**Example:**
```typescript
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
export function encrypt(text: string, masterKey: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, Buffer.from(masterKey, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide-overs | Custom CSS transitions | Shadcn `Sheet` | Pre-built accessible primitives handle focus and escape key management. |
| Resizable panes | Custom drag listeners | Shadcn `Resizable` | Handles grid boundaries smoothly. |

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | API keys in DB (unencrypted) | Data migration to encrypt existing keys |
| Secrets/env vars | `EVOLUTION_API_KEY`, etc. | Need `ENCRYPTION_MASTER_KEY` set |

## Common Pitfalls

### Pitfall 1: Missing Webhook Exceptions
**What goes wrong:** External webhooks fail with 401/403.
**Why it happens:** Global tenant middleware blocks unauthenticated webhooks.
**How to avoid:** Explicitly exclude `/gateway/whatsapp` and other webhook routes from the global `tenant.ts` middleware.

### Pitfall 2: Silent API Key Failures
**What goes wrong:** Upstream services reject requests invisibly.
**Why it happens:** Fallback to empty string `''` when key is not present.
**How to avoid:** Throw errors fast at startup if critical keys are missing.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT / Tenant Middleware |
| V4 Access Control | yes | Strict Tenant ID matching |
| V6 Cryptography | yes | AES-256-GCM for keys at rest |

## Sources

### Primary (HIGH confidence)
- Codebase architectural audit (CONCERNS.md)
- `27-UI-SPEC.md`
