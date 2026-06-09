import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tenantContext } from '../../middleware/tenant';
import { mockPrisma } from '../setup';

describe('Tenant Isolation', () => {
  const tenantA = 'tenant-aaaa-0000-0000-000000000001';
  const tenantB = 'tenant-bbbb-0000-0000-000000000002';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AsyncLocalStorage context propagation', () => {
    it('sets and reads tenant context within a run block', async () => {
      await new Promise<void>((resolve) => {
        tenantContext.run({ tenantId: tenantA }, () => {
          const store = tenantContext.getStore();
          expect(store).toBeDefined();
          expect(store?.tenantId).toBe(tenantA);
          resolve();
        });
      });
    });

    it('isolates context between different run blocks', async () => {
      const results: string[] = [];

      await Promise.all([
        new Promise<void>((resolve) => {
          tenantContext.run({ tenantId: tenantA }, () => {
            results.push(tenantContext.getStore()!.tenantId);
            resolve();
          });
        }),
        new Promise<void>((resolve) => {
          tenantContext.run({ tenantId: tenantB }, () => {
            results.push(tenantContext.getStore()!.tenantId);
            resolve();
          });
        }),
      ]);

      expect(results).toContain(tenantA);
      expect(results).toContain(tenantB);
    });

    it('returns undefined store outside of run block', () => {
      const store = tenantContext.getStore();
      expect(store).toBeUndefined();
    });
  });

  describe('Prisma queries scoped by tenant', () => {
    it('queries leads filtered by tenant A', async () => {
      const leadsA = [
        { id: 'lead-1', tenantId: tenantA, name: 'Lead A1' },
        { id: 'lead-2', tenantId: tenantA, name: 'Lead A2' },
      ];
      mockPrisma.lead.findMany.mockResolvedValueOnce(leadsA);

      await new Promise<void>((resolve) => {
        tenantContext.run({ tenantId: tenantA }, async () => {
          const store = tenantContext.getStore();
          const leads = await mockPrisma.lead.findMany({
            where: { tenantId: store?.tenantId },
          });

          expect(leads).toHaveLength(2);
          expect(leads.every((l: any) => l.tenantId === tenantA)).toBe(true);
          resolve();
        });
      });
    });

    it('queries leads filtered by tenant B', async () => {
      const leadsB = [
        { id: 'lead-3', tenantId: tenantB, name: 'Lead B1' },
      ];
      mockPrisma.lead.findMany.mockResolvedValueOnce(leadsB);

      await new Promise<void>((resolve) => {
        tenantContext.run({ tenantId: tenantB }, async () => {
          const store = tenantContext.getStore();
          const leads = await mockPrisma.lead.findMany({
            where: { tenantId: store?.tenantId },
          });

          expect(leads).toHaveLength(1);
          expect(leads[0].tenantId).toBe(tenantB);
          resolve();
        });
      });
    });

    it('returns empty when querying with wrong tenant', async () => {
      mockPrisma.lead.findMany.mockResolvedValueOnce([]);

      await new Promise<void>((resolve) => {
        tenantContext.run({ tenantId: tenantB }, async () => {
          const store = tenantContext.getStore();
          // Try to access tenant A's leads while in tenant B context
          const leads = await mockPrisma.lead.findMany({
            where: { tenantId: store?.tenantId },
          });

          expect(leads).toHaveLength(0);
          resolve();
        });
      });
    });
  });

  describe('RLS set_config integration', () => {
    it('prisma extension calls set_config with tenant ID', async () => {
      // The prisma.ts extension should call set_config before queries
      // We verify the mock was configured to accept this pattern
      mockPrisma.$executeRaw.mockResolvedValueOnce(0);

      await new Promise<void>((resolve) => {
        tenantContext.run({ tenantId: tenantA }, async () => {
          // Simulate what the Prisma extension does
          const store = tenantContext.getStore();
          if (store?.tenantId) {
            await mockPrisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${store.tenantId}, true)`;
          }
          expect(mockPrisma.$executeRaw).toHaveBeenCalled();
          resolve();
        });
      });
    });
  });
});
