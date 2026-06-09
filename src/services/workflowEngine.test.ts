import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowEngine } from './workflowEngine';

// Mock the prisma import
vi.mock('../db/prisma', () => ({
  prisma: {
    workflow: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    workflowExecution: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    lead: {
      update: vi.fn(),
    },
  },
}));

// Mock the session manager
vi.mock('./sessionManager', () => ({
  SessionManager: {
    setWorkflowState: vi.fn().mockResolvedValue(undefined),
    clearWorkflowState: vi.fn().mockResolvedValue(undefined),
  },
}));

import { prisma } from '../db/prisma';
import { SessionManager } from './sessionManager';

describe('WorkflowEngine', () => {
  const tenantId = 'tenant-1';
  const leadId = 'lead-1';
  const userId = 'user-1';
  const workflowId = 'wf-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkTrigger', () => {
    it('returns workflow ID when trigger matches intent', async () => {
      (prisma.workflow.findFirst as any).mockResolvedValueOnce({ id: workflowId, triggerIntent: 'PRICING' });
      const result = await WorkflowEngine.checkTrigger(tenantId, 'PRICING');
      expect(result).toBe(workflowId);
      expect(prisma.workflow.findFirst).toHaveBeenCalledWith({
        where: { tenantId, triggerIntent: 'PRICING' },
      });
    });

    it('returns null when no workflow matches intent', async () => {
      (prisma.workflow.findFirst as any).mockResolvedValueOnce(null);
      const result = await WorkflowEngine.checkTrigger(tenantId, 'UNKNOWN');
      expect(result).toBeNull();
    });
  });

  describe('startWorkflow', () => {
    it('creates execution and returns first step prompt', async () => {
      const workflow = {
        id: workflowId,
        steps: [
          { prompt: 'What is your name?', key: 'name' },
          { prompt: 'What is your email?', key: 'email' },
        ],
      };
      (prisma.workflowExecution.create as any).mockResolvedValueOnce({ id: 'exec-1' });
      (prisma.workflow.findUnique as any).mockResolvedValueOnce(workflow);

      const result = await WorkflowEngine.startWorkflow(tenantId, leadId, userId, workflowId);

      expect(result.handled).toBe(true);
      expect(result.text).toBe('What is your name?');
      expect(result.finished).toBe(false);
      expect(prisma.workflowExecution.create).toHaveBeenCalled();
      expect(SessionManager.setWorkflowState).toHaveBeenCalledWith(tenantId, userId, {
        currentWorkflowId: workflowId,
        currentStepIndex: 0,
      });
    });

    it('returns handled false when workflow not found', async () => {
      (prisma.workflowExecution.create as any).mockResolvedValueOnce({ id: 'exec-1' });
      (prisma.workflow.findUnique as any).mockResolvedValueOnce(null);

      const result = await WorkflowEngine.startWorkflow(tenantId, leadId, userId, workflowId);
      expect(result.handled).toBe(false);
    });

    it('returns handled false when workflow has no steps', async () => {
      (prisma.workflowExecution.create as any).mockResolvedValueOnce({ id: 'exec-1' });
      (prisma.workflow.findUnique as any).mockResolvedValueOnce({ id: workflowId, steps: [] });

      const result = await WorkflowEngine.startWorkflow(tenantId, leadId, userId, workflowId);
      expect(result.handled).toBe(false);
    });
  });

  describe('processStep', () => {
    const workflow = {
      id: workflowId,
      steps: [
        { prompt: 'What is your name?', key: 'name' },
        { prompt: 'What is your email?', key: 'email' },
        { prompt: 'Thanks!', key: 'thanks' },
      ],
    };
    const execution = {
      id: 'exec-1',
      collectedData: {},
      status: 'active',
    };

    it('saves step data and returns next step prompt', async () => {
      (prisma.workflow.findUnique as any).mockResolvedValueOnce(workflow);
      (prisma.workflowExecution.findFirst as any).mockResolvedValueOnce(execution);
      (prisma.workflowExecution.update as any).mockResolvedValueOnce({});
      (prisma.lead.update as any).mockResolvedValueOnce({});

      const result = await WorkflowEngine.processStep(tenantId, leadId, userId, 'John', workflowId, 0);

      expect(result.handled).toBe(true);
      expect(result.text).toBe('What is your email?');
      expect(result.finished).toBe(false);
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: { name: 'John' },
      });
    });

    it('auto-maps email field to lead', async () => {
      (prisma.workflow.findUnique as any).mockResolvedValueOnce(workflow);
      (prisma.workflowExecution.findFirst as any).mockResolvedValueOnce(execution);
      (prisma.workflowExecution.update as any).mockResolvedValueOnce({});

      await WorkflowEngine.processStep(tenantId, leadId, userId, 'john@test.com', workflowId, 1);

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: { email: 'john@test.com' },
      });
    });

    it('completes workflow on last step', async () => {
      (prisma.workflow.findUnique as any).mockResolvedValueOnce(workflow);
      (prisma.workflowExecution.findFirst as any).mockResolvedValueOnce(execution);
      (prisma.workflowExecution.update as any).mockResolvedValueOnce({});

      const result = await WorkflowEngine.processStep(tenantId, leadId, userId, 'ok', workflowId, 2);

      expect(result.handled).toBe(true);
      expect(result.finished).toBe(true);
      expect(result.text).toContain('team will reach out');
      expect(prisma.workflowExecution.update).toHaveBeenCalledWith({
        where: { id: execution.id },
        data: { status: 'completed' },
      });
      expect(SessionManager.clearWorkflowState).toHaveBeenCalledWith(tenantId, userId);
    });

    it('returns handled false when workflow not found', async () => {
      (prisma.workflow.findUnique as any).mockResolvedValueOnce(null);
      (prisma.workflowExecution.findFirst as any).mockResolvedValueOnce(execution);

      const result = await WorkflowEngine.processStep(tenantId, leadId, userId, 'text', workflowId, 0);
      expect(result.handled).toBe(false);
      expect(SessionManager.clearWorkflowState).toHaveBeenCalledWith(tenantId, userId);
    });

    it('returns handled false when execution not found', async () => {
      (prisma.workflow.findUnique as any).mockResolvedValueOnce(workflow);
      (prisma.workflowExecution.findFirst as any).mockResolvedValueOnce(null);

      const result = await WorkflowEngine.processStep(tenantId, leadId, userId, 'text', workflowId, 0);
      expect(result.handled).toBe(false);
    });
  });
});
