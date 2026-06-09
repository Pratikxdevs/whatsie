---
title: Technology Stack
last_mapped_commit: f683cc9578043d8141583bd2d2d84c7ebcaea9d4
last_updated: 2026-06-09
---

# Technology Stack

## Languages & Runtime
- TypeScript 6.0.3 (backend), ~5.9.3 (frontend)
- Node.js (ES2022 target, CommonJS modules)
- Python (external platform services: Twitter/twikit, Telegram/Hydrogram)

## Frameworks
- Express 5.2.1 (backend HTTP server)
- React 19.2.4 (frontend SPA)
- Vite 8.0.1 (frontend build tool)
- Socket.IO 4.8.3 (real-time WebSocket)
- Prisma 5.22.0 (ORM / database client)
- Tailwind CSS 3.4.19 (frontend styling)
- Radix UI (component primitives for frontend)

## Dependencies
### Production
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.2.1 | HTTP framework |
| @prisma/client | ^5.22.0 | PostgreSQL ORM |
| ioredis | ^5.10.1 | Redis client |
| bullmq | ^5.76.0 | Job queue (Redis-backed) |
| socket.io | ^4.8.3 | Real-time WebSocket |
| axios | ^1.15.2 | HTTP client |
| @clerk/express | ^2.1.19 | Authentication (Clerk) |
| svix | ^1.94.0 | Webhook signature verification |
| openai | ^6.34.0 | OpenAI API client |
| @google/generative-ai | ^0.24.1 | Gemini API client |
| discord.js | ^14.26.4 | Discord bot gateway |
| zod | ^4.4.3 | Schema validation |
| pino | ^10.3.1 | Structured logging |
| prom-client | ^15.1.3 | Prometheus metrics |
| @sentry/node | ^10.53.1 | Error tracking |
| helmet | ^8.2.0 | Security headers |
| express-rate-limit | ^7.5.0 | Rate limiting |
| rate-limit-redis | ^4.3.1 | Redis-backed rate limiting |
| jsonwebtoken | ^9.0.3 | JWT token handling |
| bcryptjs | ^3.0.3 | Password hashing |
| dompurify | ^3.4.5 | HTML sanitization |
| libphonenumber-js | ^1.13.3 | Phone number parsing |

### Development
| Package | Version | Purpose |
|---------|---------|---------|
| vitest | ^4.1.6 | Test framework |
| @vitest/coverage-v8 | ^4.1.6 | Code coverage |
| supertest | ^7.2.2 | HTTP assertion testing |
| prisma | ^5.22.0 | Prisma CLI |
| ts-node | ^10.9.2 | TypeScript execution |
| tsx | ^4.21.0 | TypeScript execution (faster) |
| cross-env | ^10.1.0 | Cross-platform env vars |

## Configuration
- **Build**: TypeScript compiler (`tsc`), Vite (frontend)
- **Linting**: ESLint 9.39.4 with react-hooks and react-refresh plugins
- **Formatting**: Tailwind CSS + Prettier (implicit via ESLint)
- **Testing**: Vitest with V8 coverage, Supertest for HTTP
- **Environment**: dotenv for `.env` loading
- **Module aliases**: `@` → `./src` (frontend), `module-alias` (backend)
- **Docker Compose**: PostgreSQL 15, Redis 7, Prometheus, Grafana, Evolution API, Telegram API, Twitter API, Hydrogram API, Obscura
- **Monitoring**: Prometheus + Grafana dashboards, Pino structured logging
