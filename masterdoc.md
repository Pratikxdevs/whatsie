# 📘 FILE 1: FULL CONTEXT (CRISP SUMMARY)

## Vision

Build a **multi-platform AI-powered CRM bot SaaS** that:

* Integrates WhatsApp, Telegram, Discord, etc.
* Automates conversations
* Manages leads
* Scales to thousands of users

---

## Core Learnings

### 1. APIs Alone ≠ System

Using APIs (WhatsApp, Telegram, etc.) is not enough.
You need:

* Message normalization
* Queue system
* State management
* AI orchestration

---

### 2. Critical Backend Layers

* Unified Message Layer (bidirectional)
* Queue (BullMQ + Redis)
* Session + Context Window
* Workflow Engine
* AI Decision System
* Webhook Gateway + Idempotency

---

### 3. Advanced System Additions

* Multi-tenancy (tenantId, botId, userId)
* Rate limit orchestrator
* Intent classification layer
* Event-driven architecture
* Plugin system

---

### 4. Production Requirements

* Observability (logs, metrics, traces)
* Dead Letter Queue
* Retry strategies
* Cost control (AI usage)

---

### 5. SaaS Reality

You are NOT done after backend.
You also need:

* Billing
* Onboarding
* CRM UI
* Analytics
* Growth system

---

## Final Insight

This is not a project.
This is a **startup-level system**.

---

# 📘 FILE 2: FULL ARCHITECTURE

## Layered System

### Layer 0: Multi-Tenancy

* Tenant isolation
* Config per tenant

### Layer 1: Platform APIs

* WhatsApp (Evolution API)
* Telegram
* Discord
* Meta APIs

### Layer 2: Webhook Gateway

* Auth
* Idempotency
* Rate limiting

### Layer 3: Message Normalizer

* Inbound parser
* Outbound renderer

### Layer 4: Queue Layer

* BullMQ + Redis
* Per-platform queues
* DLQ

### Layer 5: Worker Layer

* Session manager
* Intent classifier
* Rule engine
* Workflow engine

### Layer 6: AI Layer

* Model routing
* Prompt builder
* Cost control
* RAG

### Layer 7: CRM Layer

* Leads
* Conversations
* Events

### Layer 8: Rate Limiter

* Token bucket
* Backpressure

### Layer 9: Response Router

* Platform-specific output

---

## Supporting Infra

### Redis

* Queue
* Session
* Context

### PostgreSQL

* Leads
* Messages
* Workflows

### Observability

* Logs
* Metrics
* Alerts

---

## Advanced Additions

* Event Bus
* Plugin System
* Feature Flags
* Memory Layers
* Compliance (GDPR)

---

# 📘 FILE 3: EXECUTION PLAN (BUILD ORDER)

## Phase 1: MVP (DO THIS FIRST)

* WhatsApp only
* Basic bot reply
* Simple CRM (store leads)
* Manual workflows

---

## Phase 2: Core System

* Message normalizer
* Queue system
* Worker processing

---

## Phase 3: Intelligence

* AI integration
* Intent classification
* Basic workflow engine

---

## Phase 4: SaaS Layer

* Multi-tenancy
* Auth system
* Billing

---

## Phase 5: Scaling

* Rate limiting
* Observability
* Retry + DLQ

---

## Phase 6: Product

* Dashboard UI
* Inbox
* Analytics

---

## Phase 7: Growth

* Templates
* Referral system
* Optimization

---

## Final Rule

Start small → validate → scale.

---

## Outcome

If executed:

* MVP in weeks
* Revenue in months
* Scalable SaaS long-term

---

# 📘 FILE 4: MASTER PROMPT (FOR CODING AI)

## Purpose

This prompt is designed to guide an AI coding agent (Cursor, Augment, etc.) to build the CRM SaaS system correctly without architectural mistakes.

---

## SYSTEM OVERVIEW

You are building a **multi-tenant, multi-platform AI CRM bot system**.

Core requirements:

* Support WhatsApp first (expandable to other platforms)
* AI-powered conversations
* CRM lead tracking
* Scalable architecture

---

## CORE RULES (VERY IMPORTANT)

1. NEVER tightly couple platform APIs with business logic
2. ALWAYS use a unified message format internally
3. ALL processing must go through queue workers
4. AI is OPTIONAL, not default (rules first)
5. EVERYTHING must be tenant-scoped

---

## UNIFIED MESSAGE FORMAT

```ts
{
  tenantId: string,
  platform: string,
  userId: string,
  message: string,
  type: "text" | "media",
  metadata: {}
}
```

---

## FOLDER STRUCTURE

```
/src
  /api
  /gateway
  /normalizer
  /queue
  /workers
  /ai
  /crm
  /rateLimiter
  /utils
```

---

## EXECUTION FLOW

1. Webhook hits gateway
2. Validate + dedupe
3. Normalize message
4. Push to queue
5. Worker processes:

   * Check intent
   * Check rules
   * Check workflow
   * Call AI (if needed)
6. Generate response
7. Send via platform adapter

---

## MVP SCOPE (DO NOT OVERBUILD)

* WhatsApp only
* One bot per tenant
* Basic reply system
* Store leads

---

## AVOID THESE MISTAKES

* Calling AI for every message
* Mixing platform logic with core logic
* Skipping queue system
* Ignoring tenant isolation

---

## SUCCESS CONDITION

System should:

* Handle 1000+ messages reliably
* Not duplicate messages
* Not exceed API limits
* Maintain conversation state

---

## FINAL INSTRUCTION

Build incrementally.
Do NOT attempt full system at once.
Start with MVP and expand.

---

# 📘 FILE 5: DATABASE SCHEMA (PostgreSQL)

## Goals

* Multi-tenant isolation
* CRM-first (leads, conversations, messages)
* Workflow + events
* Auditable + scalable

---

## 🔑 Conventions

* All tables include: id (uuid), created_at, updated_at
* Soft delete where needed: deleted_at
* Tenant scoping: tenant_id on all core tables

---

## 🏢 tenants

```sql
create table tenants (
  id uuid primary key,
  name text not null,
  plan text default 'free',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## 👤 users

```sql
create table users (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  email text unique not null,
  password_hash text,
  role text check (role in ('admin','agent','viewer')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_users_tenant on users(tenant_id);
```

## 🤖 bots

```sql
create table bots (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  display_name text not null,
  platform text not null,
  session_name text unique, -- e.g., waha session
  status text default 'active',
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_bots_tenant on bots(tenant_id);
```

## 🧑 leads

```sql
create table leads (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  bot_id uuid references bots(id),
  name text,
  phone text,
  email text,
  source text,
  status text default 'new', -- new, qualified, contacted, closed
  attributes jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_leads_tenant on leads(tenant_id);
create index idx_leads_bot on leads(bot_id);
```

## 💬 conversations

```sql
create table conversations (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  lead_id uuid references leads(id),
  platform text not null,
  external_user_id text not null, -- phone/discord id
  status text default 'open',
  last_message_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_conv_tenant on conversations(tenant_id);
create index idx_conv_lead on conversations(lead_id);
```

## ✉️ messages

```sql
create table messages (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  conversation_id uuid references conversations(id),
  direction text check (direction in ('in','out')),
  content text,
  message_type text default 'text',
  platform_message_id text, -- id from platform
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index idx_msg_conv on messages(conversation_id);
create index idx_msg_platform_id on messages(platform_message_id);
```

## 🔄 workflows

```sql
create table workflows (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  name text,
  definition jsonb not null, -- steps, conditions
  version int default 1,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## 🧭 workflow_runs

```sql
create table workflow_runs (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  workflow_id uuid references workflows(id),
  lead_id uuid references leads(id),
  state jsonb default '{}'::jsonb,
  status text default 'running',
  next_run_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_wr_next on workflow_runs(next_run_at);
```

## 📊 events (audit + analytics)

```sql
create table events (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  type text,
  payload jsonb,
  created_at timestamptz default now()
);
create index idx_events_tenant on events(tenant_id);
```

## 🔐 api_keys

```sql
create table api_keys (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  key_hash text not null,
  name text,
  created_at timestamptz default now()
);
```

## 💳 billing_usage

```sql
create table billing_usage (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  metric text, -- messages, tokens, bots
  quantity bigint,
  period_start timestamptz,
  period_end timestamptz
);
create index idx_billing_tenant on billing_usage(tenant_id);
```

## 🧠 ai_logs

```sql
create table ai_logs (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  model text,
  prompt_tokens int,
  completion_tokens int,
  cost numeric,
  metadata jsonb,
  created_at timestamptz default now()
);
create index idx_ai_tenant on ai_logs(tenant_id);
```

---

## 🔒 Row-Level Security (example)

```sql
alter table leads enable row level security;
create policy tenant_isolation on leads
  using (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## 🧱 Notes

* Use UUID v4 for ids
* Add partial indexes for hot queries (status, last_message_at)
* Partition messages/events by time if volume grows
* Store PII encrypted if needed (phone/email)

---

## ✅ Outcome

This schema supports:

* Multi-tenant SaaS
* Full CRM lifecycle
* AI + workflow execution
* Analytics + billing
