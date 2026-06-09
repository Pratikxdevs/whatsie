import { z } from 'zod';

const leadStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;

export const updateLeadSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email('Invalid email address').max(255).optional(),
  source: z.string().max(100).optional(),
  status: z.enum(leadStatuses).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
