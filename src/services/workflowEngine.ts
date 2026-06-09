import { prisma } from '../db/prisma';
import { SessionManager } from './sessionManager';

export interface WorkflowResponse {
  handled: boolean;
  text?: string;
  finished?: boolean;
}

export class WorkflowEngine {
  /**
   * Evaluates if a detected intent triggers a known Workflow natively.
   */
  static async checkTrigger(tenantId: string, intent: string): Promise<string | null> {
    const wf = await prisma.workflow.findFirst({
      where: { tenantId, triggerIntent: intent }
    });
    return wf ? wf.id : null;
  }

  /**
   * Initializes a brand new workflow execution gracefully locking the conversation.
   */
  static async startWorkflow(tenantId: string, leadId: string, userId: string, workflowId: string): Promise<WorkflowResponse> {
    const execution = await prisma.workflowExecution.create({
      data: {
        tenantId,
        workflowId,
        leadId,
        currentStepIndex: 0,
        collectedData: {}
      }
    });

    await SessionManager.setWorkflowState(tenantId, userId, {
      currentWorkflowId: workflowId,
      currentStepIndex: 0
    });

    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) return { handled: false };

    const steps = workflow.steps as any[];
    if (steps.length === 0) return { handled: false };

    return { handled: true, text: steps[0].prompt, finished: false };
  }

  /**
   * Processes the inbound stateful reply against the active workflow sequence.
   */
  static async processStep(
    tenantId: string, 
    leadId: string, 
    userId: string, 
    messageText: string, 
    workflowId: string, 
    stepIndex: number
  ): Promise<WorkflowResponse> {
    
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    const execution = await prisma.workflowExecution.findFirst({
      where: { tenantId, leadId, workflowId, status: 'active' },
      orderBy: { createdAt: 'desc' }
    });

    if (!workflow || !execution) {
      await SessionManager.clearWorkflowState(tenantId, userId);
      return { handled: false };
    }

    const steps = workflow.steps as any[];
    
    // Save current step data
    const currentStep = steps[stepIndex];
    if (currentStep && currentStep.key) {
      const data = typeof execution.collectedData === 'object' ? execution.collectedData as any : {};
      data[currentStep.key] = messageText;
      
      // Opt: Automatically map 'name' and 'email' natively into Lead fields.
      if (currentStep.key === 'name') {
        await prisma.lead.update({ where: { id: leadId }, data: { name: messageText } });
      }
      if (currentStep.key === 'email') {
        await prisma.lead.update({ where: { id: leadId }, data: { email: messageText } });
      }

      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { collectedData: data, currentStepIndex: stepIndex + 1 }
      });
      
      await SessionManager.setWorkflowState(tenantId, userId, {
        currentWorkflowId: workflowId,
        currentStepIndex: stepIndex + 1
      });
    }

    // Is there another step?
    const nextStepIndex = stepIndex + 1;
    if (nextStepIndex < steps.length) {
      return { handled: true, text: steps[nextStepIndex].prompt, finished: false };
    } else {
      // Completed Workflow Sequence!
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'completed' }
      });
      await SessionManager.clearWorkflowState(tenantId, userId);
      return { handled: true, text: 'Thank you for your information! Our team will reach out shortly.', finished: true };
    }
  }
}
