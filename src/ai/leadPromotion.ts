import { prisma } from '../db/prisma';
import { logger } from '../config/logger';

export async function promoteLeadIfQualified(tenantId: string, leadId: string, conversationId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  if (lead.status !== 'lead' && lead.status !== 'qualified') {
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'qualified', botPaused: true },
    });
    
    try {
      const { io: socketIo } = await import('../index');
      
      let name = lead.name || 'Unknown';
      let budget = 'Unknown';
      if (lead.attributes && typeof lead.attributes === 'object') {
        const attrs: any = lead.attributes;
        if (attrs.name) name = attrs.name;
        if (attrs.budget) budget = attrs.budget;
      }

      socketIo.to(tenantId).emit('hot_lead_identified', {
        leadId: lead.id,
        conversationId,
        message: `Hot Lead Identified: ${name} - Budget: ${budget}`
      });

      logger.info({ leadId }, 'Lead promoted to qualified and bot paused');
    } catch (err) {
      logger.error({ err }, 'Failed to emit hot_lead_identified event');
    }
  }
}

export async function requireIntervention(tenantId: string, conversationId: string, reason: string) {
  try {
    const { io: socketIo } = await import('../index');
    socketIo.to(tenantId).emit('intervention_required', {
      conversationId,
      message: `Intervention Required: ${reason}`
    });
    logger.info({ conversationId, reason }, 'Intervention requested');
  } catch (err) {
    logger.error({ err }, 'Failed to emit intervention_required event');
  }
}
