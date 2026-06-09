import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  company: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
