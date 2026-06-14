import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import { resolveAiConfig, getOpenRouterClient } from './orchestrator';
import { promoteLeadIfQualified, requireIntervention } from './leadPromotion';

const SYSTEM_PROMPT = `You are a background AI structuralizer for a CRM system. 
Your job is to analyze the conversation history and extract structured entities and state.
You MUST respond with valid JSON ONLY. No markdown, no markdown blocks, no conversational text.
Extract the following information:
1. "entities": {
    "name": string | null,
    "company": string | null,
    "budget": string | null,
    "urgency": string | null,
    "painPoint": string | null
}
2. "state": "ongoing" | "flop" | "qualified"
   - "flop" means the user is angry, asking to stop, or not interested.
   - "qualified" means they provided budget/urgency or strong intent to buy.
   - "ongoing" is for active conversations that aren't yet flops or qualified.
3. "analytics": {
    "intent": string | null (e.g., "Pricing Inquiry", "Support", "General Info"),
    "healthScore": number (1-100, where <30 is angry/frustrated, 100 is excellent)
}`;

export async function runStructuralizer(tenantId: string, leadId: string, conversationId: string) {
  try {
    const config = await resolveAiConfig(tenantId);
    if (!config.apiKey) {
      logger.warn({ tenantId }, 'No AI API key, skipping structuralizer');
      return;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20
    });

    if (messages.length === 0) return;

    const chatHistory = messages.map((m: any) => ({
      role: m.direction === 'in' ? 'user' : 'assistant',
      content: m.content || '[media]'
    }));

    const client = getOpenRouterClient(config.apiKey);
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistory as any[]
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return;

    const parsed = JSON.parse(content);
    
    // Process Entities
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (lead) {
      let currentAttrs = {};
      if (lead.attributes && typeof lead.attributes === 'object') {
        currentAttrs = lead.attributes;
      }
      
      const newAttrs = { ...currentAttrs };
      let updated = false;
      const entities = parsed.entities || {};
      
      if (entities.name && !lead.name) {
        await prisma.lead.update({ where: { id: leadId }, data: { name: entities.name } });
      }
      
      for (const key of ['name', 'company', 'budget', 'urgency', 'painPoint']) {
        if (entities[key] && !newAttrs[key as keyof typeof newAttrs]) {
          (newAttrs as any)[key] = entities[key];
          updated = true;
        }
      }

      if (updated) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { attributes: newAttrs }
        });
      }
    }

    // Process State and Analytics
    const state = parsed.state || 'ongoing';
    const analytics = parsed.analytics || {};
    const healthScore = typeof analytics.healthScore === 'number' ? analytics.healthScore : 100;
    const intent = analytics.intent || null;

    let newStatus = state;
    if (state === 'flop' || state === 'qualified' || state === 'ongoing') {
      newStatus = state;
    } else {
      newStatus = 'ongoing'; // default fallback
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: newStatus,
        healthScore,
        intent
      }
    });

    if (newStatus === 'qualified') {
      await promoteLeadIfQualified(tenantId, leadId, conversationId);
    } else if (newStatus === 'flop' || healthScore < 30) {
      await requireIntervention(tenantId, conversationId, 'Conversation flagged as flop or low health score.');
      
      // Override status to flop if health is < 30
      if (newStatus !== 'flop') {
         await prisma.conversation.update({
            where: { id: conversationId },
            data: { status: 'flop' }
         });
      }
    }

    logger.info({ conversationId, state, healthScore, intent }, 'Structuralizer processed conversation successfully');

  } catch (err: any) {
    logger.error({ err: err.message, conversationId }, 'Structuralizer failed');
  }
}
