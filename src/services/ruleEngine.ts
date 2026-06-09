import { updateLeadConversationStatus } from '../crm/crmService';
import { logger } from '../config/logger';

export interface RuleResponse {
  handled: boolean;
  text?: string;
  actionRequired?: boolean;
}

export class RuleEngine {
  /**
   * Executes explicit Tenant rules bypassing the AI completely.
   */
  static async evaluate(
    tenantId: string,
    leadId: string,
    conversationId: string,
    intent: string
  ): Promise<RuleResponse> {
    
    // 1. HARD RULE: Human Escalation
    if (intent === 'HUMAN_ESCALATION') {
      // Sync DB states instantly
      await updateLeadConversationStatus(tenantId, leadId, conversationId, 'transferred');
      return { 
        handled: true, 
        text: 'I am transferring you to a human agent immediately. Please wait.',
        actionRequired: true
      };
    }

    // 2. TENANT CANNED RESPONSES / RULES (Hardcoded default for MVP)
    if (intent === 'PRICING') {
      return {
        handled: true,
        text: 'Our plans start at $99/month for Pro. Everything scales dynamically. Visit example.com/pricing for details!'
      };
    }

    // 3. LEAD QUALIFICATION AUTOMATION
    if (intent === 'INTERESTED') {
      // Qualify the lead automatically based on high-buying intent
      await updateLeadConversationStatus(tenantId, leadId, conversationId, 'qualified');
      // But WE STILL RETURN FALSE here (if we want the AI to carry the conversation naturally!)
      // Alternatively, we can return a canned response. Let's let the AI take it while state is updated natively.
      logger.info({ leadId }, 'Rule engine evaluated INTERESTED intent, auto-qualified lead');
      return { handled: false }; 
    }

    if (intent === 'OPT_OUT') {
      await updateLeadConversationStatus(tenantId, leadId, conversationId, 'unsubscribed');
      return {
        handled: true,
        text: 'You have been successfully unsubscribed. Thank you.'
      };
    }

    // No exact hard rule matched this intent exclusively
    return { handled: false };
  }
}
