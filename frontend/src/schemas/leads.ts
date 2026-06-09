import { z } from 'zod';

export const leadFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  source: z.string().max(100).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const updateLeadFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'archived']).optional(),
});

export type LeadFormInput = z.infer<typeof leadFormSchema>;
export type UpdateLeadFormInput = z.infer<typeof updateLeadFormSchema>;
