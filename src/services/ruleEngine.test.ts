import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuleEngine } from './ruleEngine';

// Mock the CRM service dependency
vi.mock('../crm/crmService', () => ({
  updateLeadConversationStatus: vi.fn().mockResolvedValue(undefined),
}));

describe('RuleEngine', () => {
  const tenantId = 'tenant-1';
  const leadId = 'lead-1';
  const conversationId = 'conv-1';

  describe('HUMAN_ESCALATION', () => {
    it('returns handled with transfer message', async () => {
      const result = await RuleEngine.evaluate(tenantId, leadId, conversationId, 'HUMAN_ESCALATION');
      expect(result.handled).toBe(true);
      expect(result.text).toContain('transferring you to a human agent');
      expect(result.actionRequired).toBe(true);
    });

    it('calls updateLeadConversationStatus with transferred', async () => {
      const { updateLeadConversationStatus } = await import('../crm/crmService');
      await RuleEngine.evaluate(tenantId, leadId, conversationId, 'HUMAN_ESCALATION');
      expect(updateLeadConversationStatus).toHaveBeenCalledWith(tenantId, leadId, conversationId, 'transferred');
    });
  });

  describe('PRICING', () => {
    it('returns handled with pricing message', async () => {
      const result = await RuleEngine.evaluate(tenantId, leadId, conversationId, 'PRICING');
      expect(result.handled).toBe(true);
      expect(result.text).toContain('$99/month');
    });
  });

  describe('INTERESTED', () => {
    it('returns not handled (lets AI continue)', async () => {
      const result = await RuleEngine.evaluate(tenantId, leadId, conversationId, 'INTERESTED');
      expect(result.handled).toBe(false);
    });

    it('qualifies the lead', async () => {
      const { updateLeadConversationStatus } = await import('../crm/crmService');
      await RuleEngine.evaluate(tenantId, leadId, conversationId, 'INTERESTED');
      expect(updateLeadConversationStatus).toHaveBeenCalledWith(tenantId, leadId, conversationId, 'qualified');
    });
  });

  describe('OPT_OUT', () => {
    it('returns handled with unsubscribe message', async () => {
      const result = await RuleEngine.evaluate(tenantId, leadId, conversationId, 'OPT_OUT');
      expect(result.handled).toBe(true);
      expect(result.text).toContain('unsubscribed');
    });

    it('marks conversation as unsubscribed', async () => {
      const { updateLeadConversationStatus } = await import('../crm/crmService');
      await RuleEngine.evaluate(tenantId, leadId, conversationId, 'OPT_OUT');
      expect(updateLeadConversationStatus).toHaveBeenCalledWith(tenantId, leadId, conversationId, 'unsubscribed');
    });
  });

  describe('UNKNOWN intent', () => {
    it('returns not handled for unknown intents', async () => {
      const result = await RuleEngine.evaluate(tenantId, leadId, conversationId, 'UNKNOWN');
      expect(result.handled).toBe(false);
      expect(result.text).toBeUndefined();
    });

    it('returns not handled for random strings', async () => {
      const result = await RuleEngine.evaluate(tenantId, leadId, conversationId, 'SOME_RANDOM_INTENT');
      expect(result.handled).toBe(false);
    });
  });
});
