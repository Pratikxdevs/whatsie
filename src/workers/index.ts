/**
 * BullMQ Worker — Main Processing Pipeline
 *
 * Implements the 13-step message flow from the architecture spec:
 * 1  Session Manager load
 * 2  Intent Classifier
 * 3  Workflow Engine (mid-flow check)
 * 4  Workflow Trigger check
 * 5  Rule Engine
 * 6  AI Orchestrator fallback
 * 7  CRM Writer (lead upsert, event log, conversation.lastMessageAt)
 * 8  Session update (push to context window)
 * 9  Queue response → rate limit → send via platform adapter
 * 10 Delivery status update
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queue/setup';
import { NormalizedMessage } from '../normalizer/types';
import { processInboundMessageDbUpdates, logEvent } from '../crm/crmService';
import { SessionManager } from '../services/sessionManager';
import { generateAiResponse } from '../ai/orchestrator';
import { IntentClassifier } from '../services/intentClassifier';
import { RuleEngine } from '../services/ruleEngine';
import { WorkflowEngine } from '../services/workflowEngine';
import { prisma } from '../db/prisma';
import { tenantContext } from '../middleware/tenant';
import { ResponseRouter } from '../router/index';
import { logger, getContextLogger } from '../config/logger';
import { addLog } from '../debug/server';
import { recordBillingUsage } from '../billing/recordUsage';
import { messagesReceivedTotal, messagesSentTotal, errorsTotal } from '../metrics';
import dotenv from 'dotenv';
dotenv.config();
process.env.IS_WORKER = 'true';

if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
}

import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}

import { Emitter } from '@socket.io/redis-emitter';
const io = new Emitter(redisConnection);

import './dlq'; // Initialize DLQ monitor

// ---------------------------------------------------------------------------
// Outbound: write to DB → rate limit → send → mark delivered
// ---------------------------------------------------------------------------
async function executeOutbound(msg: NormalizedMessage, conversationId: string, responseText: string) {
  const log = getContextLogger(msg.tenantId, 'Worker.Outbound');

  addLog('info', `[OUTBOUND] ${msg.platform}: user=${msg.userId} text="${responseText.slice(0, 50)}..."`, 'MSG_OUT');

  const result = await ResponseRouter.dispatch(msg, conversationId, responseText);
  await recordBillingUsage(msg.tenantId, 'messages_sent', 1);
  log.info({ messageId: result.messageId }, 'Message dispatched');

  addLog('info', `[OUTBOUND] OK: msg_id=${result.messageId}`, 'MSG_OUT');

  // Emit real-time update so the frontend receives the outbound message instantly
  try {
    io.to(msg.tenantId).emit('new_message', {
      conversationId,
      message: {
        id: result.messageId,
        direction: 'out',
        content: responseText,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    log.warn({ err }, 'Failed to emit outbound new_message event');
  }

  return result;
}

// ---------------------------------------------------------------------------
// AI Fallback (Layer 6)
// ---------------------------------------------------------------------------
async function callAiFallback(msg: NormalizedMessage, dbRecords: any) {
  const log = getContextLogger(msg.tenantId, 'Worker.AI');
  log.info({ userId: msg.userId }, 'No rule/workflow match — delegating to AI Orchestrator');

  addLog('info', `[AI] Calling AI for user=${msg.userId} tenant=${msg.tenantId}`, 'AI_CALL');

  const aiResult = await generateAiResponse(msg.tenantId, msg.userId, msg.message.text || '[empty]');
  
  // Update session state with the new AI-generated summary
  const state = await SessionManager.getWorkflowState(msg.tenantId, msg.userId);
  await SessionManager.setWorkflowState(msg.tenantId, msg.userId, {
    ...state,
    sessionSummary: aiResult.sessionSummary
  });

  const isLead = aiResult.isLead;
  const aiText = aiResult.response;

  log.info({ userId: msg.userId, isLead, intent: aiResult.intent }, 'AI response generated');

  if (isLead) {
    await prisma.lead.update({
      where: { id: dbRecords.lead.id },
      data: { status: 'qualified' }
    });
    await logEvent(msg.tenantId, dbRecords.lead.id, 'lead_qualified', {
      platform: msg.platform,
      intent: aiResult.intent
    });
  } else {
    // Set to contacted if we are actually texting them but they aren't a qualified lead
    await prisma.lead.update({
      where: { id: dbRecords.lead.id },
      data: { status: 'contacted' }
    });
    await logEvent(msg.tenantId, dbRecords.lead.id, 'ai_responded', {
      platform: msg.platform,
      intent: aiResult.intent
    });
  }

  addLog('info', `[AI] Response generated: "${aiText.slice(0, 60)}..."`, 'AI_RESPONSE');

  return executeOutbound(msg, dbRecords.conversation.id, aiText);
}

// ---------------------------------------------------------------------------
// Main Worker
// ---------------------------------------------------------------------------
export const whatsappWorker = new Worker(
  'whatsapp-messages',
  async (job: Job) => {
    const log = getContextLogger(job.data.tenantId, 'Worker.Pipeline');

    try {
      const msg: NormalizedMessage = job.data;
      log.info({ jobId: job.id, userId: msg.userId }, 'Picked up job');
      messagesReceivedTotal.inc({ platform: 'whatsapp', tenantId: msg.tenantId });

      return await tenantContext.run({ tenantId: msg.tenantId }, async () => {
        // ── H-007: Deduplication — reject if we already processed this platform message ──
        const platformMsgId = msg.metadata?.messageId;
        if (platformMsgId) {
          const dedupKey = `dedup:msg:${msg.tenantId}:${platformMsgId}`;
          const isNew = await redisConnection.set(dedupKey, '1', 'EX', 1800, 'NX');
          if (!isNew) {
            log.warn({ platformMsgId }, 'Duplicate webhook detected — skipping job');
            return; // Clean exit, BullMQ marks job as done
          }
        }

        // ── STEP 1 (spec): Session Manager load ──────────────────────────────
        const sessionState = await SessionManager.getWorkflowState(msg.tenantId, msg.userId);
        log.info({ conversationState: sessionState.conversationState ?? 'idle' }, 'Session loaded');

      // ── STEP 8 (spec): Commit incoming message + upsert lead/conversation ─
      const dbRecords = await processInboundMessageDbUpdates(msg);
      await recordBillingUsage(msg.tenantId, 'messages_received', 1);

      // Log inbound event to Event table (spec step 8)
      await logEvent(msg.tenantId, dbRecords.lead.id, 'message_received', {
        messageText: msg.message.text,
        platform: msg.platform,
      });

      // Emit real-time update so the frontend receives the inbound message instantly
      try {
        io.to(msg.tenantId).emit('new_message', {
          conversationId: dbRecords.conversation.id,
          message: {
            id: dbRecords.newMessage.id,
            direction: 'in',
            content: dbRecords.newMessage.content,
            createdAt: dbRecords.newMessage.createdAt.toISOString(),
          },
        });
      } catch (err) {
        log.warn({ err }, 'Failed to emit inbound new_message event');
      }

      // ── STEP 9 (spec): Push inbound message to context window ────────────
      await SessionManager.pushMessage(msg.tenantId, msg.userId, {
        role: 'user',
        content: msg.message.text || '',
      });

      // ── AGENT HANDOFF: Check if Bot is Paused ─────────────────────────────
      if (dbRecords.lead.botPaused) {
        log.info({ leadId: dbRecords.lead.id }, 'Bot is paused by human agent. Skipping all auto-replies.');
        return; // Clean exit, AI will not intervene.
      }

      // ── STEP 4 (spec): Workflow Engine — check if mid-flow ───────────────
      if (
        sessionState.currentWorkflowId &&
        sessionState.currentStepIndex !== undefined &&
        sessionState.currentStepIndex !== null
      ) {
        log.info(
          { workflowId: sessionState.currentWorkflowId, step: sessionState.currentStepIndex },
          'Active workflow detected — processing step',
        );
        const wfResponse = await WorkflowEngine.processStep(
          msg.tenantId,
          dbRecords.lead.id,
          msg.userId,
          msg.message.text || '',
          sessionState.currentWorkflowId,
          sessionState.currentStepIndex,
        );
        if (wfResponse.handled && wfResponse.text) {
          return await executeOutbound(msg, dbRecords.conversation.id, wfResponse.text);
        }
      }

      // ── STEP 2 (spec): Intent Classifier ─────────────────────────────────
      const intentResult = IntentClassifier.classify(msg.message.text || '');
      log.info({ intent: intentResult.intent, confidence: intentResult.confidence }, 'Intent classified');

      // ── STEP 4 (spec): Check workflow triggers ────────────────────────────
      if (intentResult.confidence > 0.8) {
        const triggeredWfId = await WorkflowEngine.checkTrigger(msg.tenantId, intentResult.intent);
        if (triggeredWfId) {
          log.info({ workflowId: triggeredWfId }, 'Intent triggered new workflow');
          const wfStartResponse = await WorkflowEngine.startWorkflow(
            msg.tenantId,
            dbRecords.lead.id,
            msg.userId,
            triggeredWfId,
          );
          if (wfStartResponse.handled && wfStartResponse.text) {
            return await executeOutbound(msg, dbRecords.conversation.id, wfStartResponse.text);
          }
        }
      }

      // ── STEP 3 (spec): Rule Engine ────────────────────────────────────────
      const ruleResponse = await RuleEngine.evaluate(
        msg.tenantId,
        dbRecords.lead.id,
        dbRecords.conversation.id,
        intentResult.intent,
      );
      if (ruleResponse.handled && ruleResponse.text) {
        log.info({ intent: intentResult.intent }, 'Rule matched — skipping AI');
        return await executeOutbound(msg, dbRecords.conversation.id, ruleResponse.text);
      }

      // ── STEP 5 (spec): AI Orchestrator fallback ───────────────────────────
      return await callAiFallback(msg, dbRecords);
      }); // End of tenantContext.run

    } catch (error) {
      log.error({ err: error, jobId: job.id }, 'Fatal error processing job');
      throw error; // BullMQ will retry
    }
  },
  { connection: redisConnection, concurrency: 5 },
);

whatsappWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error({ err, jobId: job?.id }, 'BullMQ job permanently failed');
});


