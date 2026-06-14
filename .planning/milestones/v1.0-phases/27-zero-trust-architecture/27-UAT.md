---
status: testing
phase: 27-zero-trust-architecture
source: [Phase 27 Execution]
started: 2026-06-11T21:43:00Z
updated: 2026-06-11T21:43:00Z
---

## Current Test
number: 2
name: Tenant Data Isolation (Prisma RLS)
expected: |
  Logging in as a specific tenant and viewing the Bots Page only displays bots connected by that exact tenant. The system fundamentally rejects any query lacking a tenantId context.
awaiting: user response

## Tests

### 1. Zero-Trust Authentication
expected: Attempting to load the dashboard or hit any backend API endpoint without a valid Clerk session token immediately results in a hard 401 Unauthorized block. The previous DEV_AUTH_BYPASS fallback is entirely non-functional.
result: pass

### 2. Tenant Data Isolation (Prisma RLS)
expected: Logging in as a specific tenant and viewing the Bots Page only displays bots connected by that exact tenant. The system fundamentally rejects any query lacking a tenantId context.
result: [pending]

### 3. OpenRouter Factory & Key Vault
expected: Navigating to Bot Settings and entering an OpenRouter API Key securely caches it in the browser vault. The UI dynamically fetches and displays available AI models (like Claude 3 or GPT-4o) and your live credit balance directly from OpenRouter.
result: [pending]

### 4. Bento Grid & Slide-over UI
expected: The Bots Page displays bot connections in a wide (1600px max) 3-column Bento Grid layout (WhatsApp Pulse, AI Config, Usage Analytics). Clicking a bot opens a smooth, full-height slide-over drawer from the right side instead of a centered modal.
result: [pending]

### 5. Telemetry & Outbox Routing
expected: Sending a message through the AI triggers an initial 'pending' state in the DB Outbox. It only flips to 'sent' once the Evolution API confirms delivery. If the server crashes, a Sentry Error Boundary catches the crash on the frontend and displays a red "Application Crash Detected" fallback UI.
result: [pending]

## Summary

total: 5
passed: 1
issues: 0
pending: 4
skipped: 0

## Gaps

