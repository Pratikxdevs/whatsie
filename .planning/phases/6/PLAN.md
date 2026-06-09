# Phase 6: Database Schema Perfection

**Goal:** Align the Prisma schema with the architecture document's Layer 7 data models. Every table gets the correct fields, types, indexes, and relationships. No temporary fixes -- permanent schema changes only.

**Why now:** The current schema has 12 models but is missing fields, has inconsistent enums, lacks critical indexes, and doesn't match the architecture spec. This blocks multi-platform expansion, proper analytics, and production readiness.

---

## Current State Analysis

### Models in schema (12):
Tenant, User, Bot, Lead, Conversation, Message, Workflow, WorkflowExecution, ApiKey, Event, BillingUsage, AiLog, RefreshToken

### Models needed by architecture doc (add 1):
- **AuditLog** -- missing entirely (Event is not the same)

### Critical gaps found:

| Table | Missing Fields | Status |
|-------|---------------|--------|
| Lead | `assignedTo` (FK to User) | Missing |
| Message | `sentAt`, `deliveredAt`, `readAt`, `attachments` | Missing |
| Conversation | `platformConversationId` | Missing |
| Workflow | `tenantId`, `status` (active/paused/archived) | Missing |
| WorkflowExecution | `tenantId`, `startedAt`, `completedAt` | Missing |
| ApiKey | `permissions`, `lastUsedAt`, `expiresAt`, `createdBy` | Missing |
| Event | `leadId`, `userId`, structured type enum | Missing/incomplete |
| Bot | Status enum inconsistent across codebase | Broken |

### Missing indexes:
- Lead: `(tenantId, status)`, `(tenantId, createdAt)`
- Conversation: `(tenantId, platformUserId)`
- Message: `(conversationId, sentAt)`, `(tenantId, sentAt)`
- Event: `(tenantId, leadId, createdAt)`

### Bot status values in codebase (INCONSISTENT):
- Schema default: `'connected'`
- Code uses: `'active'`, `'STARTING'`, `'WORKING'`, `'SCAN_QR_CODE'`, `'disconnected'`, `'pending_qr'`
- Analytics filters for: `'active'` (misses all others)

---

## Plan

### Wave 1: Schema Changes (Single Migration)

**P01 -- Fix Bot Status Enum**

Standardize Bot status to a proper enum that covers all real states:

```prisma
enum BotStatus {
  connected
  disconnected
  starting
  error
  pending_qr
  suspended
}

model Bot {
  // ... existing fields
  status BotStatus @default(disconnected)
}
```

Migration steps:
1. Create enum type
2. ALTER COLUMN with CASE mapping:
   - `'active'` → `'connected'`
   - `'STARTING'` → `'starting'`
   - `'WORKING'` → `'connected'`
   - `'SCAN_QR_CODE'` → `'pending_qr'`
   - `'disconnected'` → `'disconnected'`
   - `'pending_qr'` → `'pending_qr'`
3. Update all code references to use enum values

**P02 -- Add Missing Fields to Lead**

```prisma
model Lead {
  // ... existing fields
  assignedTo  String?   @db.Uuid
  assignedAt  DateTime?

  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@index([tenantId, assignedTo])
}
```

**P03 -- Add Missing Fields to Message**

```prisma
model Message {
  // ... existing fields
  sentAt      DateTime?  @default(now())
  deliveredAt DateTime?
  readAt      DateTime?
  attachments Json?      // Array of {type, url, mimeType, size}
  failedAt    DateTime?
  errorReason String?

  @@index([conversationId, sentAt])
  @@index([tenantId, sentAt])
}
```

**P04 -- Add Missing Fields to Conversation**

```prisma
model Conversation {
  // ... existing fields
  platformConversationId String?  // Thread/channel ID on platform
  transferredAt          DateTime?
  closedAt               DateTime?

  @@index([tenantId, platformUserId])
}
```

**P05 -- Fix Workflow Model**

Current Workflow is missing tenantId and status:

```prisma
model Workflow {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  name         String
  triggerIntent String? // Keep existing field
  trigger      Json?    // New: {type, value} per architecture doc
  steps        Json
  status       String   @default("active") // active | paused | archived
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  executions   WorkflowExecution[]

  @@index([tenantId])
  @@index([tenantId, status])
}
```

**P06 -- Fix WorkflowExecution Model**

```prisma
model WorkflowExecution {
  id               String   @id @default(uuid()) @db.Uuid
  tenantId         String   @db.Uuid
  workflowId       String   @db.Uuid
  leadId           String   @db.Uuid
  currentStepIndex Int      @default(0)
  status           String   @default("in_progress") // in_progress | completed | failed
  collectedData    Json?
  startedAt        DateTime @default(now())
  completedAt      DateTime?
  createdAt        DateTime @default(now())

  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  workflow     Workflow @relation(fields: [workflowId], references: [id])
  lead         Lead     @relation(fields: [leadId], references: [id])

  @@index([tenantId])
  @@index([tenantId, status])
  @@index([leadId])
}
```

**P07 -- Fix ApiKey Model**

```prisma
model ApiKey {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  keyHash     String    @unique
  name        String
  permissions Json?     // ["messages.read", "messages.write"]
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  createdBy   String?   @db.Uuid
  createdAt   DateTime  @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}
```

**P08 -- Fix Event Model → AuditLog**

The current Event model is too generic. Replace with proper AuditLog:

```prisma
model AuditLog {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  userId       String?  @db.Uuid
  leadId       String?  @db.Uuid
  action       String   // "user.login", "lead.created", "message.sent"
  resourceType String   // "lead", "conversation", "message", "workflow"
  resourceId   String?  @db.Uuid
  data         Json?
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@index([tenantId, leadId])
  @@index([tenantId, action])
  @@index([tenantId, createdAt])
}
```

Drop the old Event table. Update `crmService.ts` to use AuditLog instead of `(prisma as any).event.create`.

**P09 -- Add Lead.assignedTo Relation**

```prisma
model User {
  // ... existing fields
  assignedLeads Lead[] @relation("LeadAssignee")
}

model Lead {
  // ... existing fields
  assignedTo   String?  @db.Uuid
  assignedUser User?    @relation("LeadAssignee", fields: [assignedTo], references: [id])
}
```

---

### Wave 2: Code Updates

**P10 -- Update Bot Status References**

Files to update:
- `src/routes/workspaces.ts` -- Change `'STARTING'` → `'starting'`, `'WORKING'` → `'connected'`, `'SCAN_QR_CODE'` → `'pending_qr'`
- `src/adapters/evolutionApi.ts` -- Change `'active'` → `'connected'`, `'pending_qr'` → `'pending_qr'`
- `src/routes/analytics.ts` -- Change `status: 'active'` → filter for `status: 'connected'` or use `NOT IN ['disconnected', 'error', 'suspended']`

**P11 -- Update crmService.ts for AuditLog**

Replace:
```typescript
(prisma as any).event.create({ data: { ... } })
```
With:
```typescript
prisma.auditLog.create({ data: { ... } })
```

Update event types to match architecture doc:
- `message_received`, `message_sent`, `lead_created`, `status_changed`, `workflow_started`, `workflow_completed`, `ai_called`

**P12 -- Update Message Creation**

All places that create messages need to set `sentAt`:
- `src/crm/crmService.ts` -- inbound messages: `sentAt: new Date()`
- `src/router/index.ts` -- outbound messages: `sentAt: new Date()`
- `src/routes/conversations.ts` -- manual messages: `sentAt: new Date()`

**P13 -- Update Conversation Creation**

Set `platformConversationId` when creating conversations:
- `src/crm/crmService.ts` -- Use `externalUserId` as `platformConversationId` (they serve the same purpose)

**P14 -- Update Workflow Queries**

All workflow queries need `tenantId` filter:
- `src/services/workflowEngine.ts` -- Add `tenantId` to all `findFirst`/`findUnique` calls

---

### Wave 3: Generate & Apply Migration

**P15 -- Generate Prisma Migration**

```bash
npx prisma migrate dev --name phase6_schema_perfection
```

**P16 -- Backfill Existing Data**

SQL to run after migration:
```sql
-- Backfill sentAt on existing messages
UPDATE "Message" SET "sentAt" = "createdAt" WHERE "sentAt" IS NULL;

-- Backfill platformConversationId from externalUserId
UPDATE "Conversation" SET "platformConversationId" = "externalUserId" WHERE "platformConversationId" IS NULL;

-- Standardize bot statuses
UPDATE "Bot" SET status = 'connected' WHERE status = 'active';
UPDATE "Bot" SET status = 'starting' WHERE status = 'STARTING';
UPDATE "Bot" SET status = 'connected' WHERE status = 'WORKING';
UPDATE "Bot" SET status = 'pending_qr' WHERE status = 'SCAN_QR_CODE';

-- Add tenantId to Workflow if missing
UPDATE "Workflow" SET "tenantId" = (SELECT "tenantId" FROM "Tenant" LIMIT 1) WHERE "tenantId" IS NULL;
```

---

### Wave 4: Verification

**P17 -- Schema Verification**

- `npx prisma validate` passes
- `npx prisma generate` succeeds
- `npx tsc --noEmit` passes
- All existing tests pass

**P18 -- Data Integrity Checks**

```sql
-- No orphaned leads (all have valid tenantId)
SELECT COUNT(*) FROM "Lead" l LEFT JOIN "Tenant" t ON l."tenantId" = t.id WHERE t.id IS NULL;

-- No messages without sentAt
SELECT COUNT(*) FROM "Message" WHERE "sentAt" IS NULL;

-- No conversations without platformConversationId (after backfill)
SELECT COUNT(*) FROM "Conversation" WHERE "platformConversationId" IS NULL;

-- All bots have valid status
SELECT DISTINCT status FROM "Bot";
```

**P19 -- Index Verification**

```sql
-- Verify indexes exist
SELECT indexname, tablename FROM pg_indexes WHERE tablename IN ('Lead', 'Message', 'Conversation', 'Event', 'AuditLog') ORDER BY tablename;
```

---

## New Schema (Complete)

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum BotStatus {
  connected
  disconnected
  starting
  error
  pending_qr
  suspended
}

model Tenant {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  plan      String   @default("free")
  status    String   @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users              User[]
  bots               Bot[]
  leads              Lead[]
  conversations      Conversation[]
  messages           Message[]
  workflows          Workflow[]
  workflowExecutions WorkflowExecution[]
  apiKeys            ApiKey[]
  auditLogs          AuditLog[]
  billingUsage       BillingUsage[]
  aiLogs             AiLog[]
}

model User {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid
  clerkId      String?   @unique
  email        String    @unique
  passwordHash String?
  role         String    @default("viewer")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  tenant        Tenant         @relation(fields: [tenantId], references: [id])
  refreshTokens RefreshToken[]
  assignedLeads Lead[]         @relation("LeadAssignee")

  @@index([tenantId])
  @@index([clerkId])
}

model Bot {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  displayName String
  platform    String
  sessionName String    @unique
  status      BotStatus @default(disconnected)
  config      Json?
  aiEngine    String?
  temperature Float?
  maxTokens   Int?
  systemPrompt String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  leads  Lead[]

  @@index([tenantId])
}

model Lead {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  botId       String?   @db.Uuid
  name        String?
  phone       String?
  email       String?
  source      String?
  status      String    @default("new")
  assignedTo  String?   @db.Uuid
  assignedAt  DateTime?
  attributes  Json?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  tenant            Tenant             @relation(fields: [tenantId], references: [id])
  bot               Bot?               @relation(fields: [botId], references: [id])
  assignedUser      User?              @relation("LeadAssignee", fields: [assignedTo], references: [id])
  conversations     Conversation[]
  workflowExecutions WorkflowExecution[]
  auditLogs         AuditLog[]

  @@index([tenantId])
  @@index([botId])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@index([tenantId, assignedTo])
}

model Conversation {
  id                     String    @id @default(uuid()) @db.Uuid
  tenantId               String    @db.Uuid
  leadId                 String    @db.Uuid
  platform               String
  externalUserId         String
  platformConversationId String?
  status                 String    @default("open")
  lastMessageAt          DateTime?
  transferredAt          DateTime?
  closedAt               DateTime?
  createdAt              DateTime  @default(now())

  tenant   Tenant    @relation(fields: [tenantId], references: [id])
  lead     Lead      @relation(fields: [leadId], references: [id])
  messages Message[]

  @@index([tenantId])
  @@index([leadId])
  @@index([tenantId, platformUserId])
}

model Message {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @db.Uuid
  conversationId   String    @db.Uuid
  direction        String    // "in" | "out"
  content          String
  messageType      String    @default("text")
  platformMessageId String?
  attachments      Json?
  sentAt           DateTime  @default(now())
  deliveredAt      DateTime?
  readAt           DateTime?
  failedAt         DateTime?
  errorReason      String?
  metadata         Json?
  createdAt        DateTime  @default(now())

  tenant       Tenant       @relation(fields: [tenantId], references: [id])
  conversation Conversation @relation(fields: [conversationId], references: [id])

  @@index([tenantId])
  @@index([conversationId])
  @@index([conversationId, sentAt])
  @@index([tenantId, sentAt])
  @@index([platformMessageId])
}

model Workflow {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String   @db.Uuid
  name          String
  triggerIntent String?
  trigger       Json?
  steps         Json
  status        String   @default("active")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant     Tenant              @relation(fields: [tenantId], references: [id])
  executions WorkflowExecution[]

  @@index([tenantId])
  @@index([tenantId, status])
}

model WorkflowExecution {
  id               String   @id @default(uuid()) @db.Uuid
  tenantId         String   @db.Uuid
  workflowId       String   @db.Uuid
  leadId           String   @db.Uuid
  currentStepIndex Int      @default(0)
  status           String   @default("in_progress")
  collectedData    Json?
  startedAt        DateTime @default(now())
  completedAt      DateTime?
  createdAt        DateTime @default(now())

  tenant   Tenant   @relation(fields: [tenantId], references: [id])
  workflow Workflow @relation(fields: [workflowId], references: [id])
  lead     Lead     @relation(fields: [leadId], references: [id])

  @@index([tenantId])
  @@index([tenantId, status])
  @@index([leadId])
}

model ApiKey {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  keyHash     String    @unique
  name        String
  permissions Json?
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  createdBy   String?   @db.Uuid
  createdAt   DateTime  @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}

model AuditLog {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  userId       String?  @db.Uuid
  leadId       String?  @db.Uuid
  action       String
  resourceType String
  resourceId   String?  @db.Uuid
  data         Json?
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@index([tenantId, leadId])
  @@index([tenantId, action])
  @@index([tenantId, createdAt])
}

model BillingUsage {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  metric      String
  quantity    BigInt
  periodStart DateTime
  periodEnd   DateTime
  createdAt   DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, metric, periodStart])
  @@index([tenantId])
}

model AiLog {
  id                String   @id @default(uuid()) @db.Uuid
  tenantId          String   @db.Uuid
  model             String
  promptTokens      Int
  completionTokens  Int
  cost              Decimal
  metadata          Json?
  createdAt         DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  tokenHash String   @unique
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
}
```

---

## Success Criteria

- [ ] `npx prisma validate` passes
- [ ] `npx prisma generate` succeeds
- [ ] `npx tsc --noEmit` passes (backend)
- [ ] Migration applies cleanly on existing data
- [ ] Bot statuses are standardized (no mixed case/values)
- [ ] All messages have `sentAt` populated
- [ ] All conversations have `platformConversationId` populated
- [ ] AuditLog replaces Event model in all code
- [ ] All new indexes are created
- [ ] All existing tests pass
- [ ] RLS policies updated for new AuditLog table
