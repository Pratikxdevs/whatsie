# Tech Stack

_Last updated: 2026-06-14 (refreshed after auth stabilization + bot sync hardening)_

---

## Runtime & Language

| Layer     | Technology     | Version        |
|-----------|----------------|----------------|
| Runtime   | Node.js        | LTS (inferred) |
| Language  | TypeScript     | ^6.0.3 (backend), ~5.9.3 (frontend) |
| Module    | CommonJS (backend), ESM (frontend) |

---

## Backend Framework

| Library         | Version    | Role                          |
|-----------------|------------|-------------------------------|
| express         | ^5.2.1     | HTTP server (Express 5)       |
| helmet          | ^8.2.0     | Security headers middleware   |
| express-rate-limit | ^7.5.0  | HTTP rate limiting            |
| rate-limit-redis | ^4.3.1   | Redis-backed rate limit store |
| socket.io       | ^4.8.3     | WebSocket real-time events    |

---

## Database & ORM

| Technology      | Version    | Role                                 |
|-----------------|------------|--------------------------------------|
| PostgreSQL      | (external) | Primary relational database           |
| Prisma          | ^6.19.3    | ORM + migrations + query building     |
| @prisma/client  | ^6.19.3    | Generated query client               |
| Redis (IORedis) | ^5.10.1    | BullMQ connection, rate limit store  |

**Dual Prisma client pattern:**
- `prisma` — zero-trust extended client (auto-injects `tenantId`, enforces tenant context)
- `prismaUnfiltered` — base client for auth/system operations (webhook sync, startup reconciliation)

---

## Queue System

| Technology | Version   | Role                                          |
|------------|-----------|-----------------------------------------------|
| BullMQ     | ^5.76.0   | Job queue for async message processing        |
| IORedis    | ^5.10.1   | BullMQ transport — persists job state         |

Queue name: `whatsapp-messages`
Worker concurrency: 5
Job retry: 5 attempts, exponential backoff (60s base)

---

## Authentication

| Technology      | Version    | Role                                        |
|-----------------|------------|---------------------------------------------|
| @clerk/express  | ^2.1.19    | Backend SDK — `clerkMiddleware`, `verifyToken`, `clerkClient` |
| @clerk/clerk-react | ^5.61.6 | Frontend SDK — `ClerkProvider`, `useUser`, `useAuth`, `useClerk` |
| svix            | ^1.94.0    | Clerk webhook signature verification        |
| jsonwebtoken    | ^9.0.3     | Legacy JWT (Socket.IO path, supplemental)    |
| bcryptjs        | ^3.0.3     | Password hashing (legacy — Clerk is primary)|

---

## Frontend Framework

| Technology        | Version    | Role                              |
|-------------------|------------|-----------------------------------|
| React             | ^19.2.4    | UI library                        |
| React DOM         | ^19.2.4    | DOM rendering                     |
| React Router DOM  | ^7.14.0    | Client-side routing               |
| Vite              | ^8.0.1     | Dev server + bundler              |
| TypeScript        | ~5.9.3     | Static typing                     |

---

## Frontend UI Layer

| Library                  | Version    | Role                              |
|--------------------------|------------|-----------------------------------|
| Radix UI (full suite)    | Latest     | Headless accessible primitives    |
| Lucide React             | ^1.7.0     | Icon library                      |
| Tailwind CSS             | ^3.4.19    | Utility-first CSS                 |
| class-variance-authority | ^0.7.1     | Component variant management      |
| clsx + tailwind-merge    | Latest     | Conditional class building        |
| Motion (Framer)          | ^12.38.0   | Animations                        |
| Recharts                 | ^2.15.4    | Data visualization / charts       |
| Sonner                   | ^2.0.7     | Toast notifications               |
| React Hook Form          | ^7.76.1    | Form state management             |
| Zod                      | ^4.4.3     | Schema validation (shared)        |
| socket.io-client         | ^4.8.3     | WebSocket client                  |
| date-fns                 | ^4.3.0     | Date utilities                    |
| next-themes              | ^0.4.6     | Dark mode support                 |

---

## AI / LLM

| Technology  | Version  | Role                                         |
|-------------|----------|----------------------------------------------|
| OpenAI SDK  | ^6.42.0  | OpenRouter-compatible client (chat completions) |
| OpenRouter  | External | Multi-model AI proxy (Llama, GPT, etc.)      |

---

## Observability

| Technology    | Version    | Role                               |
|---------------|------------|------------------------------------|
| Pino          | ^10.3.1    | Structured JSON logging            |
| pino-pretty   | ^13.1.3    | Dev log formatting                 |
| prom-client   | ^15.1.3    | Prometheus metrics endpoint        |
| @sentry/node  | ^10.53.1   | Error tracking (optional DSN)      |

---

## Build & Dev Tools

| Tool        | Version    | Role                              |
|-------------|------------|-----------------------------------|
| ts-node     | ^10.9.2    | Development server (transpile-only)|
| tsx         | ^4.21.0    | Seed scripts execution            |
| tsc         | TypeScript | Production build                   |
| Vitest      | ^4.1.6     | Backend unit/integration testing   |
| @vitest/coverage-v8 | ^4.1.6 | Coverage reporting            |
| Supertest   | ^7.2.2     | HTTP endpoint testing              |
| ESLint      | ^9.39.4    | Linting (frontend)                |

---

## Infrastructure (Dev)

| Service        | Port  | Notes                          |
|----------------|-------|--------------------------------|
| PostgreSQL      | 7777  | Exposed from Docker            |
| Redis           | 6379  | Standard port                  |
| Evolution API   | 8081  | WhatsApp platform bridge       |
| Backend         | 3000  | Express + Socket.IO            |
| Frontend        | 5173  | Vite dev server                |
| Debug Server    | 9222  | Ring-buffer log viewer         |
