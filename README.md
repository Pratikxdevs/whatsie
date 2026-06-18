# Whatsie (CrmV2)

Whatsie is a multi-tenant Customer Relationship Management (CRM) platform purpose-built for WhatsApp. It allows businesses to automate customer interactions, qualify leads, and manage conversations seamlessly across multiple WhatsApp numbers.

## Key Features

- **Multi-Tenant Architecture**: Securely manage multiple isolated workspaces, users, and WhatsApp numbers from a single deployment.
- **WhatsApp Integration**: Powered by the robust Evolution API for stable, real-time message sending and receiving.
- **AI-Powered Automation**: Built-in intent classification and conversational routing using OpenRouter and custom workflows.
- **Real-Time Interface**: A modern React-based dashboard featuring live WebSocket updates (via Socket.IO) for instant message delivery.
- **Scalable Background Processing**: Heavy tasks like message deduplication, queueing, and AI fallbacks are handled asynchronously via BullMQ and Redis.

## Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Radix UI, Clerk (Authentication).
- **Backend**: Node.js, Express, Socket.IO, Zod (Validation), BullMQ (Job Queue).
- **Database & Cache**: PostgreSQL (via Prisma ORM), Redis.
- **Integrations**: Evolution API v2.3, Clerk, OpenRouter, Sentry, Prometheus.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **[Node.js](https://nodejs.org/)** (v18 or higher)
- **[Docker & Docker Compose](https://www.docker.com/)** (Required for the database, Redis, and Evolution API services)
- **API Keys**: You will need free accounts with [Clerk](https://clerk.com/) (Authentication) and [OpenRouter](https://openrouter.ai/) (AI integrations).

## Quick Start

We've provided streamlined scripts to get you up and running quickly:

1. **Environment Variables**: Create a `.env` file at the root and `frontend/.env` based on the `.env.example` templates.
2. **Install Dependencies**:
   ```bash
   npm run setup
   ```
3. **Start Infrastructure** (PostgreSQL, Redis, Evolution API, etc.):
   ```bash
   npm run docker:up
   ```
4. **Run Application** (Starts both Frontend and Backend concurrently):
   ```bash
   npm run dev:all
   ```

### Manual Setup
Alternatively, you can run individual services:
- **Backend Only**: `npm run dev:backend`
- **Frontend Only**: `npm run dev:frontend`
- **Stop Infrastructure**: `npm run docker:down`

## Documentation

For deep technical insights into the architecture, deployment, and testing patterns, refer to the documents located in the `.planning/codebase/` directory.
