/**
 * Billing Usage Recording
 *
 * Records per-tenant usage metrics (messages, AI tokens) into the BillingUsage
 * table with automatic monthly period bucketing. Uses upsert to atomically
 * increment quantities for the current billing period.
 *
 * Design: billing failures are logged but never thrown — a billing outage must
 * not block the message processing pipeline.
 */

import { prisma } from '../db/prisma';
import { logger } from '../config/logger';

/**
 * Record a billing usage metric for the current UTC month.
 * Increments the quantity if a record already exists for this tenant+metric+period.
 */
export async function recordBillingUsage(
  tenantId: string,
  metric: string,
  quantity: number,
): Promise<void> {
  try {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59),
    );

    await prisma.billingUsage.upsert({
      where: {
        tenantId_metric_periodStart: { tenantId, metric, periodStart },
      },
      update: {
        quantity: { increment: BigInt(quantity) },
      },
      create: {
        tenantId,
        metric,
        quantity: BigInt(quantity),
        periodStart,
        periodEnd,
      },
    });
  } catch (err) {
    logger.error({ err, tenantId, metric, quantity }, '[Billing] Failed to record usage');
  }
}

/**
 * Record AI usage: log the full token breakdown to AiLog and aggregate the
 * total tokens into the monthly billing usage bucket.
 */
export async function recordAiUsage(
  tenantId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
): Promise<void> {
  try {
    await prisma.aiLog.create({
      data: {
        tenantId,
        model,
        promptTokens,
        completionTokens,
      },
    });
    await recordBillingUsage(tenantId, 'ai_tokens', promptTokens + completionTokens);
  } catch (err) {
    logger.error(
      { err, tenantId, model, promptTokens, completionTokens },
      '[Billing] Failed to record AI usage',
    );
  }
}
