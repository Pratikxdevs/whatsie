---
plan_id: P09
phase: 23
objective: Fix WhatsApp AI integration (worker → AI service → response)
wave: 3
depends_on: [P08]
files_modified:
  - src/workers/index.ts
  - src/ai/orchestrator.ts
  - src/services/intentClassifier.ts
  - src/services/ruleEngine.ts
  - src/services/workflowEngine.ts
requirements: [P08]
autonomous: true
---

# Plan P09: Fix WhatsApp AI Integration

## Tasks

### Task 1: Verify AI orchestrator is called correctly
**read_first:**
- `src/workers/index.ts` lines 72-84 (callAiFallback)
- `src/ai/orchestrator.ts`

**acceptance_criteria:**
- `callAiFallback` calls `generateAiResponse(tenantId, userId, messageText)`
- AI response is returned as text
- AI response is sent via `executeOutbound`

**action:**
- Verify `callAiFallback` in `src/workers/index.ts`:
  - Calls `generateAiResponse(msg.tenantId, msg.userId, msg.message.text || '[empty]')`
  - Returns `executeOutbound(msg, dbRecords.conversation.id, aiText)`
- Read `src/ai/orchestrator.ts` and verify:
  - `generateAiResponse` function exists
  - Accepts `tenantId`, `userId`, `messageText` parameters
  - Returns a string (the AI response text)
  - Uses the tenant's configured AI provider and API key

### Task 2: Verify intent classification works
**read_first:**
- `src/services/intentClassifier.ts`
- `src/workers/index.ts` lines 157-159

**acceptance_criteria:**
- `IntentClassifier.classify(text)` returns `{ intent: string, confidence: number }`
- Classification is based on message text
- Used to trigger workflows and rules

**action:**
- Verify `IntentClassifier.classify` in `src/services/intentClassifier.ts`:
  - Accepts a string (message text)
  - Returns `{ intent: string, confidence: number }`
  - Worker uses it at step 2 of the pipeline

### Task 3: Verify rule engine works
**read_first:**
- `src/services/ruleEngine.ts`
- `src/workers/index.ts` lines 178-188

**acceptance_criteria:**
- `RuleEngine.evaluate(tenantId, leadId, conversationId, intent)` returns `{ handled: boolean, text?: string }`
- Rules can match intents and return response text
- If a rule matches, AI is skipped

**action:**
- Verify `RuleEngine.evaluate` in `src/services/ruleEngine.ts`:
  - Accepts `tenantId`, `leadId`, `conversationId`, `intent`
  - Returns `{ handled: boolean, text?: string }`
  - Worker checks `ruleResponse.handled` and skips AI if true

### Task 4: Verify workflow engine works
**read_first:**
- `src/services/workflowEngine.ts`
- `src/workers/index.ts` lines 134-176

**acceptance_criteria:**
- `WorkflowEngine.processStep` handles mid-flow messages
- `WorkflowEngine.checkTrigger` checks if intent triggers a new workflow
- `WorkflowEngine.startWorkflow` starts a new workflow
- All return `{ handled: boolean, text?: string }`

**action:**
- Verify `WorkflowEngine` methods:
  - `processStep(tenantId, leadId, userId, messageText, workflowId, stepIndex)` — handles active workflow step
  - `checkTrigger(tenantId, intent)` — returns workflow ID if triggered
  - `startWorkflow(tenantId, leadId, userId, workflowId)` — starts new workflow
  - Worker processes these at steps 4 and 3 respectively

### Task 5: Verify worker pipeline order is correct
**read_first:**
- `src/workers/index.ts` lines 89-199

**acceptance_criteria:**
- Pipeline order: session → DB → intent → workflow-mid-flow → workflow-trigger → rules → AI
- Each step can short-circuit to outbound if handled

**action:**
- Verify the worker pipeline order:
  1. Session Manager load (step 1)
  2. DB updates + billing + event log (step 8)
  3. Push to context window (step 9)
  4. Workflow mid-flow check (step 4)
  5. Intent classification (step 2)
  6. Workflow trigger check (step 4)
  7. Rule engine (step 3)
  8. AI fallback (step 5)
- Each step that returns `handled: true` should call `executeOutbound` and return

### Task 6: Verify outbound response flow
**read_first:**
- `src/workers/index.ts` lines 40-67 (executeOutbound)
- `src/router/index.ts`

**acceptance_criteria:**
- `executeOutbound` calls `ResponseRouter.dispatch`
- `ResponseRouter.dispatch` sends via WhatsApp adapter
- Message is persisted to PostgreSQL
- Real-time update emitted via Socket.IO

**action:**
- Verify `executeOutbound`:
  - Calls `ResponseRouter.dispatch(msg, conversationId, responseText)`
  - Records billing usage
  - Emits `new_message` Socket.IO event
- Verify `ResponseRouter.dispatch`:
  - Finds connected WhatsApp bot
  - Calls `WhatsAppAdapter.sendMessage(sessionName, userId, responseText)`
  - Persists outbound message to DB

## Verification

**must_haves:**
- [ ] `generateAiResponse` accepts tenantId, userId, messageText and returns text
- [ ] `IntentClassifier.classify` returns intent and confidence
- [ ] `RuleEngine.evaluate` returns handled/text
- [ ] `WorkflowEngine.processStep` handles mid-flow
- [ ] `WorkflowEngine.checkTrigger` checks triggers
- [ ] `WorkflowEngine.startWorkflow` starts workflows
- [ ] Worker pipeline order is correct: session → DB → intent → workflow → rules → AI
- [ ] Each step can short-circuit to outbound
- [ ] AI fallback calls `generateAiResponse` and sends response
- [ ] End-to-end: inbound → AI → outbound works
