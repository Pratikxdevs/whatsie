import { describe, it, expect } from 'vitest';
import { createLeadSchema, updateLeadSchema } from '../leads';

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

    it('rejects missing name', () => {
      expect(createLeadSchema.safeParse({ email: 'john@example.com' }).success).toBe(false);
    });

    it('rejects invalid email', () => {
      expect(createLeadSchema.safeParse({ name: 'John', email: 'not-email' }).success).toBe(false);
    });

    it('allows optional fields omitted', () => {
      expect(createLeadSchema.safeParse({ name: 'John' }).success).toBe(true);
    });
  });

  describe('updateLeadSchema', () => {
    it('accepts partial updates', () => {
      expect(updateLeadSchema.safeParse({ name: 'Jane' }).success).toBe(true);
      expect(updateLeadSchema.safeParse({ status: 'qualified' }).success).toBe(true);
      expect(updateLeadSchema.safeParse({}).success).toBe(true);
    });

    it('rejects invalid status', () => {
      expect(updateLeadSchema.safeParse({ status: 'invalid' }).success).toBe(false);
    });
  });
});
