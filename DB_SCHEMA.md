# CrmV2 Database Schema

**Database:** PostgreSQL
**ORM:** Prisma
**Schema file:** `prisma/schema.prisma`

---

## Models (13 total)

### 1. Tenant
Root multi-tenant entity. All other tables reference this.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| name | String | - | - |
| plan | String | "free" | - |
| status | String | "active" | - |
| createdAt | DateTime | now() | - |
| updatedAt | DateTime | auto | - |

**Relations:** users, bots, leads, conversations, messages, workflows, workflowExecutions, apiKeys, events, billingUsages, aiLogs

---

### 2. User
Application users linked to tenants.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| clerkId | String? | null | UNIQUE |
| tenantId | String | - | FK → Tenant |
| email | String | - | UNIQUE |
| passwordHash | String? | null | - |
| role | String | "viewer" | admin, agent, viewer |
| createdAt | DateTime | now() | - |
| updatedAt | DateTime | auto | - |

**Relations:** tenant, refreshTokens
**Indexes:** tenantId, clerkId

---

### 3. Bot
WhatsApp/messaging platform bots.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| tenantId | String | - | FK → Tenant |
| displayName | String | - | - |
| platform | String | - | whatsapp, telegram, etc. |
| sessionName | String? | null | UNIQUE |
| status | String | "active" | active, disconnected, starting, error, pending_qr |
| config | Json? | "{}" | Stores system_prompt, ai_engine, api_key, etc. |
| createdAt | DateTime | now() | - |
| updatedAt | DateTime | auto | - |

**Relations:** tenant, leads
**Indexes:** tenantId

---

### 4. Lead
Sales/engagement leads.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| tenantId | String | - | FK → Tenant |
| botId | String? | null | FK → Bot |
| name | String? | null | - |
| phone | String? | null | - |
| email | String? | null | - |
| source | String? | null | whatsapp, telegram, website, etc. |
| status | String | "new" | new, contacted, qualified, converted, lost |
| attributes | Json? | "{}" | Custom key-value data |
| createdAt | DateTime | now() | - |
| updatedAt | DateTime | auto | - |

**Relations:** tenant, bot, conversations, workflowExecutions
**Indexes:** tenantId, botId

---

### 5. Conversation
Chat sessions between a lead and a platform.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| tenantId | String | - | FK → Tenant |
| leadId | String | - | FK → Lead |
| platform | String | - | whatsapp, telegram, etc. |
| externalUserId | String | - | Platform-specific user ID |
| status | String | "open" | open, closed |
| lastMessageAt | DateTime? | null | - |
| createdAt | DateTime | now() | - |
| updatedAt | DateTime | auto | - |

**Relations:** tenant, lead, messages
**Indexes:** tenantId, leadId

---

### 6. Message
Individual messages in conversations.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| tenantId | String | - | FK → Tenant |
| conversationId | String | - | FK → Conversation |
| direction | String | - | "in" or "out" |
| content | String? | null | Message text |
| messageType | String | "text" | text, image, audio, video, document |
| platformMessageId | String? | null | Platform-specific message ID |
| metadata | Json? | "{}" | Additional platform data |
| createdAt | DateTime | now() | - |

**Relations:** tenant, conversation
**Indexes:** conversationId, platformMessageId

---

### 7. Workflow
Automated multi-step flows.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| tenantId | String | - | FK → Tenant |
| name | String | - | - |
| triggerIntent | String | - | Trigger keyword/intent |
| steps | Json | "[]" | Array of { key, prompt } |
| createdAt | DateTime | now() | - |
| updatedAt | DateTime | auto | - |

**Relations:** tenant, executions
**Indexes:** tenantId

---

### 8. WorkflowExecution
Per-lead execution of a workflow.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| tenantId | String | - | FK → Tenant |
| workflowId | String | - | FK → Workflow |
| leadId | String | - | FK → Lead |
| currentStepIndex | Int | 0 | - |
| status | String | "active" | active, completed, cancelled |
| collectedData | Json | "{}" | Data gathered during workflow |
| createdAt | DateTime | now() | - |
| updatedAt | DateTime | auto | - |

**Relations:** tenant, workflow, lead
**Indexes:** tenantId, leadId

---

### 9. ApiKey
Tenant-scoped API keys for external access.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| tenantId | String | - | FK → Tenant |
| keyHash | String | - | UNIQUE |
| name | String? | null | - |
| createdAt | DateTime | now() | - |

**Relations:** tenant
**Indexes:** tenantId

---

### 10. Event
Generic event/audit log.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| tenantId | String | - | FK → Tenant |
| type | String | - | Event type (e.g., "lead.created") |
| payload | Json? | null | Event data |
| createdAt | DateTime | now() | - |

**Relations:** tenant
**Indexes:** tenantId

---

### 11. BillingUsage
Usage metering per tenant/metric/period.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| tenantId | String | - | FK → Tenant |
| metric | String | - | messages_sent, ai_tokens, api_calls, etc. |
| quantity | BigInt | - | - |
| periodStart | DateTime | - | - |
| periodEnd | DateTime | - | - |

**Relations:** tenant
**Indexes:** tenantId, UNIQUE(tenantId, metric, periodStart)

---

### 12. AiLog
AI model usage tracking.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| tenantId | String | - | FK → Tenant |
| model | String | - | groq, openai, gemini, etc. |
| promptTokens | Int | - | - |
| completionTokens | Int | - | - |
| cost | Decimal? | null | - |
| metadata | Json? | null | - |
| createdAt | DateTime | now() | - |

**Relations:** tenant
**Indexes:** tenantId

---

### 13. RefreshToken
JWT refresh tokens for user sessions.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | String (UUID) | uuid() | PK |
| userId | String | - | FK → User (CASCADE delete) |
| tokenHash | String | - | UNIQUE |
| expiresAt | DateTime | - | - |
| revoked | Boolean | false | - |
| createdAt | DateTime | now() | - |

**Relations:** user
**Indexes:** userId, tokenHash

---

## Entity Relationships

```
Tenant (root)
├── User
│   └── RefreshToken
├── Bot
│   └── Lead
│       ├── Conversation
│       │   └── Message
│       └── WorkflowExecution
├── Workflow
│   └── WorkflowExecution
├── ApiKey
├── Event
├── BillingUsage
└── AiLog
```

## Row Level Security (RLS)

All tenant-scoped tables have RLS enabled with policies:
- **tenant_isolation**: Rows accessible only when `app.current_tenant_id` matches `tenantId`
- **service_bypass**: Full access when `app.current_tenant_id` is empty (for service accounts)
