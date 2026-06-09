import { describe, it, expect } from 'vitest';
import { createLeadSchema, updateLeadSchema } from '../../schemas/leads';

describe('lead schemas', () => {
  describe('createLeadSchema', () => {
    it('accepts valid input', () => {
      const result = createLeadSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+14155552671',
      });
      expect(result.success).toBe(true);
    });

    it('accepts name only (minimal)', () => {
      const result = createLeadSchema.safeParse({ name: 'John' });
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      expect(createLeadSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects invalid email', () => {
      expect(createLeadSchema.safeParse({ name: 'John', email: 'bad' }).success).toBe(false);
    });
  });

  describe('updateLeadSchema', () => {
    it('accepts partial updates', () => {
      expect(updateLeadSchema.safeParse({ status: 'qualified' }).success).toBe(true);
      expect(updateLeadSchema.safeParse({ name: 'New Name' }).success).toBe(true);
    });

    it('rejects invalid status', () => {
      expect(updateLeadSchema.safeParse({ status: 'invalid' }).success).toBe(false);
    });
  });
});
